from flask import Blueprint, jsonify, request

from back_end.database.query_executor import execute_query, query_all, query_one
from back_end.utils.cpf import normalize_cpf
from back_end.utils.errors import BusinessRuleError, NotFoundError
from back_end.utils.responses import ok

bp = Blueprint("usuarios", __name__)


SAFE_USER_FIELDS = "id, cpf, nome, telefone, email, tipo_usuario, data_cadastro, ativo"


@bp.get("/usuarios")
def list_users():
    tipo_usuario = request.args.get("tipo_usuario")
    ativo = request.args.get("ativo")

    filters = []
    params = []
    if tipo_usuario:
        filters.append("tipo_usuario = %s")
        params.append(tipo_usuario)
    if ativo is not None:
        filters.append("ativo = %s")
        params.append(ativo.lower() in {"1", "true", "sim", "ativo"})

    where = f" WHERE {' AND '.join(filters)}" if filters else ""
    usuarios = query_all(
        f"SELECT {SAFE_USER_FIELDS} FROM usuarios{where} ORDER BY nome",
        tuple(params),
    )
    payload, status = ok({"usuarios": usuarios})
    return jsonify(payload), status


@bp.get("/usuarios/<cpf>")
def get_user(cpf):
    normalized = normalize_cpf(cpf)
    usuario = query_one(
        f"SELECT {SAFE_USER_FIELDS} FROM usuarios WHERE cpf = %s",
        (normalized,),
    )
    if not usuario:
        raise NotFoundError("Usuario nao encontrado.", code="user_not_found")

    payload, status = ok(usuario)
    return jsonify(payload), status


@bp.patch("/usuarios/<cpf>/status")
def update_user_status(cpf):
    data = request.get_json(silent=True) or {}
    if "ativo" not in data:
        raise BusinessRuleError("Informe o campo ativo.", code="missing_active_status")

    normalized = normalize_cpf(cpf)
    execute_query(
        "UPDATE usuarios SET ativo = %s WHERE cpf = %s",
        (bool(data["ativo"]), normalized),
    )
    payload, status = ok({"cpf": normalized, "ativo": bool(data["ativo"])})
    return jsonify(payload), status

from flask import Blueprint, jsonify, request

from back_end.services.auth_service import authenticate_user, create_user
from back_end.utils.responses import created, ok

bp = Blueprint("auth", __name__)


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    payload, status = ok(authenticate_user(data.get("cpf"), data.get("senha")))
    return jsonify(payload), status


@bp.post("/usuarios")
def register_user():
    data = request.get_json(silent=True) or {}
    payload, status = created(create_user(data))
    return jsonify(payload), status


@bp.post("/cadastro")
def cadastro():
    data = request.get_json(silent=True) or {}
    payload, status = created(create_user(data))
    return jsonify(payload), status

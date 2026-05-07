from flask import Blueprint, jsonify, request

from back_end.services.agendamento_service import listar_agendamentos_por_paciente
from back_end.services.paciente_service import buscar_paciente_por_cpf, atualizar_responsavel_paciente
from back_end.utils.responses import ok

bp = Blueprint("pacientes", __name__)


@bp.get("/pacientes/<cpf>")
def buscar_paciente_route(cpf):
    payload, status = ok(buscar_paciente_por_cpf(cpf))
    return jsonify(payload), status


@bp.get("/pacientes/<cpf>/agendamentos")
def listar_agendamentos_paciente_route(cpf):
    payload, status = ok({"agendamentos": listar_agendamentos_por_paciente(cpf)})
    return jsonify(payload), status


@bp.put("/pacientes/<cpf>/responsavel")
def atualizar_responsavel_route(cpf):
    data = request.get_json(silent=True) or {}
    payload, status = ok(atualizar_responsavel_paciente(cpf, data))
    return jsonify(payload), status

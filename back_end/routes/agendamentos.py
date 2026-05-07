from flask import Blueprint, jsonify, request

from back_end.services.agendamento_service import (
    cancelar_agendamento,
    confirmar_agendamento_responsavel,
    consultar_confirmacao_agendamento,
    criar_agendamento,
    listar_agendamentos_por_data,
    listar_agendamentos_por_paciente,
    listar_horarios_ocupados,
    reagendar_agendamento,
)
from back_end.utils.responses import created, ok

bp = Blueprint("agendamentos", __name__)


@bp.post("/agendamentos")
def criar_agendamento_route():
    data = request.get_json(silent=True) or {}
    payload, status = created(criar_agendamento(data))
    return jsonify(payload), status


@bp.get("/agendamentos")
def listar_agendamentos_route():
    cpf = request.args.get("cpf")
    data = request.args.get("data")
    if cpf:
        payload, status = ok({"agendamentos": listar_agendamentos_por_paciente(cpf)})
    elif data:
        payload, status = ok({"agendamentos": listar_agendamentos_por_data(data)})
    else:
        payload, status = ok({"mensagem": "Informe cpf ou data para listar agendamentos."}, 400)
    return jsonify(payload), status


@bp.get("/agendamentos/disponibilidade")
def listar_horarios_ocupados_route():
    payload, status = ok({"disponibilidade": listar_horarios_ocupados(request.args)})
    return jsonify(payload), status


@bp.post("/agendamentos/<int:appointment_id>/confirmar-responsavel")
def confirmar_responsavel_route(appointment_id):
    data = request.get_json(silent=True) or {}
    payload, status = ok(confirmar_agendamento_responsavel(appointment_id, data))
    return jsonify(payload), status


@bp.post("/confirmar_agendamento")
def confirmar_agendamento_alias_route():
    data = request.get_json(silent=True) or {}
    appointment_id = int(data.get("id_agendamento") or 0)
    payload, status = ok(confirmar_agendamento_responsavel(appointment_id, data))
    return jsonify(payload), status


@bp.get("/confirmar_agendamento")
def consultar_link_confirmacao_route():
    data = {
        "cpf_responsavel": request.args.get("cpf_responsavel") or request.args.get("cpf"),
        "confirmacao_token": request.args.get("confirmacao_token") or request.args.get("token"),
    }
    appointment_id = int(request.args.get("id_agendamento") or request.args.get("id") or 0)
    payload, status = ok(consultar_confirmacao_agendamento(appointment_id, data))
    return jsonify(payload), status


@bp.put("/agendamentos/<int:appointment_id>")
def reagendar_agendamento_route(appointment_id):
    data = request.get_json(silent=True) or {}
    payload, status = ok(reagendar_agendamento(appointment_id, data))
    return jsonify(payload), status


@bp.delete("/agendamentos/<int:appointment_id>")
def cancelar_agendamento_route(appointment_id):
    data = request.get_json(silent=True) or {}
    payload, status = ok(cancelar_agendamento(appointment_id, data))
    return jsonify(payload), status

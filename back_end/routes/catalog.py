from flask import Blueprint, jsonify

from back_end.services.catalog_service import get_unit_by_zip_code, list_doctors, list_exams, list_health_plans, list_units
from back_end.utils.responses import ok

bp = Blueprint("catalog", __name__)


@bp.get("/unidades")
def units():
    payload, status = ok({"unidades": list_units()})
    return jsonify(payload), status


@bp.get("/unidades/por-cep/<cep>")
def unit_by_zip_code(cep):
    payload, status = ok({"unidade": get_unit_by_zip_code(cep)})
    return jsonify(payload), status


@bp.get("/medicos")
def doctors():
    payload, status = ok({"medicos": list_doctors()})
    return jsonify(payload), status


@bp.get("/convenios")
def health_plans():
    payload, status = ok({"convenios": list_health_plans()})
    return jsonify(payload), status


@bp.get("/exames")
def exams():
    payload, status = ok({"exames": list_exams()})
    return jsonify(payload), status

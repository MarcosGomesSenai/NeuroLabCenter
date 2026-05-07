from flask import Blueprint, jsonify, request

from back_end.services.feedback_service import create_feedback, doctor_average, doctor_comments, unit_average, unit_comments
from back_end.utils.responses import created, ok

bp = Blueprint("feedback", __name__)


@bp.post("/feedback")
def create_feedback_route():
    data = request.get_json(silent=True) or {}
    payload, status = created(create_feedback(data))
    return jsonify(payload), status


@bp.get("/feedback/medicos/<int:doctor_id>/media")
def doctor_feedback_average_route(doctor_id):
    payload, status = ok({"resultado": doctor_average(doctor_id)})
    return jsonify(payload), status


@bp.get("/feedback/medicos/<int:doctor_id>/comentarios")
def doctor_feedback_comments_route(doctor_id):
    payload, status = ok({"comentarios": doctor_comments(doctor_id)})
    return jsonify(payload), status


@bp.get("/feedback/unidades/<int:unit_id>/media")
def unit_feedback_average_route(unit_id):
    payload, status = ok({"resultado": unit_average(unit_id)})
    return jsonify(payload), status


@bp.get("/feedback/unidades/<int:unit_id>/comentarios")
def unit_feedback_comments_route(unit_id):
    payload, status = ok({"comentarios": unit_comments(unit_id)})
    return jsonify(payload), status

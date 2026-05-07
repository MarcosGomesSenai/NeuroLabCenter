from datetime import datetime

from mysql.connector import IntegrityError

from back_end.database.connection import db_cursor, fetch_all
from back_end.services.agendamento_service import _get_appointment, _insert_event, _to_time, _validate_owner_or_responsible
from back_end.utils.errors import BusinessRuleError


def create_feedback(data):
    appointment_id = int(data.get("id_agendamento") or 0)
    note = int(data.get("nota") or 0)
    comment = (data.get("comentario") or "").strip() or None

    if not appointment_id:
        raise BusinessRuleError("Agendamento e obrigatorio.", code="appointment_required")
    if note < 1 or note > 5:
        raise BusinessRuleError("Nota deve estar entre 1 e 5.", code="invalid_feedback_note")

    try:
        with db_cursor(commit=True) as cursor:
            appointment = _get_appointment(cursor, appointment_id)
            author_cpf = _validate_owner_or_responsible(
                appointment,
                data.get("cpf_cliente"),
                data.get("cpf_responsavel"),
            )
            appointment_moment = datetime.combine(
                appointment["data_consulta"],
                _to_time(appointment["hora_consulta"]),
            )
            if appointment["status"] != "confirmado" or appointment_moment >= datetime.now():
                raise BusinessRuleError(
                    "Feedback so pode ser enviado apos atendimento confirmado e com data passada.",
                    code="feedback_not_available_yet",
                )

            cursor.execute(
                """
                INSERT INTO feedback (id_agendamento, nota, comentario)
                VALUES (%s, %s, %s)
                """,
                (appointment_id, note, comment),
            )
            feedback_id = cursor.lastrowid
            _insert_event(cursor, appointment_id, "feedback", author_cpf, f"nota={note}")
    except IntegrityError as error:
        if error.errno == 1062:
            raise BusinessRuleError(
                "Voce ja avaliou este agendamento.",
                code="feedback_already_exists",
            )
        raise

    return {"id": feedback_id, "id_agendamento": appointment_id, "nota": note}


def doctor_average(doctor_id):
    return fetch_all(
        """
        SELECT m.id AS id_medico,
               AVG(f.nota) AS media,
               COUNT(f.id) AS total_feedbacks
          FROM medicos m
          LEFT JOIN agendamentos a ON a.id_medico = m.id
          LEFT JOIN feedback f ON f.id_agendamento = a.id
         WHERE m.id = %s
         GROUP BY m.id
        """,
        (doctor_id,),
    )


def unit_average(unit_id):
    return fetch_all(
        """
        SELECT u.id AS id_unidade,
               AVG(f.nota) AS media,
               COUNT(f.id) AS total_feedbacks
          FROM unidades u
          LEFT JOIN agendamentos a ON a.id_unidade = u.id
          LEFT JOIN feedback f ON f.id_agendamento = a.id
         WHERE u.id = %s
         GROUP BY u.id
        """,
        (unit_id,),
    )


def doctor_comments(doctor_id):
    return fetch_all(
        """
        SELECT f.nota, f.comentario, f.data_feedback, p.nome AS paciente_nome
          FROM feedback f
          JOIN agendamentos a ON a.id = f.id_agendamento
          JOIN pacientes p ON p.id = a.id_paciente
         WHERE a.id_medico = %s
           AND f.comentario IS NOT NULL
           AND f.comentario <> ''
         ORDER BY f.data_feedback DESC
        """,
        (doctor_id,),
    )


def unit_comments(unit_id):
    return fetch_all(
        """
        SELECT f.nota, f.comentario, f.data_feedback, p.nome AS paciente_nome
          FROM feedback f
          JOIN agendamentos a ON a.id = f.id_agendamento
          JOIN pacientes p ON p.id = a.id_paciente
         WHERE a.id_unidade = %s
           AND f.comentario IS NOT NULL
           AND f.comentario <> ''
         ORDER BY f.data_feedback DESC
        """,
        (unit_id,),
    )

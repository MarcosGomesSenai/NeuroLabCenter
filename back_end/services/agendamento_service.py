import unicodedata
from datetime import date, datetime, time, timedelta
from uuid import uuid4

from mysql.connector import IntegrityError

from back_end.config import Config
from back_end.database.connection import db_cursor, fetch_all, fetch_one
from back_end.services.paciente_service import (
    buscar_paciente_por_cpf,
    paciente_menor_de_idade,
    validar_vinculo_responsavel,
)
from back_end.utils.cpf import normalize_cpf
from back_end.utils.dates import combine_date_time, hours_until, parse_date, parse_time
from back_end.utils.errors import BusinessRuleError, NotFoundError


ACTIVE_SLOT_STATUS = ("pendente", "confirmado")


def _seconds(value):
    if hasattr(value, "total_seconds"):
        return int(value.total_seconds())
    return value.hour * 3600 + value.minute * 60 + value.second


def _to_time(value):
    if isinstance(value, time):
        return value
    if hasattr(value, "total_seconds"):
        total = int(value.total_seconds())
        return time(total // 3600, (total % 3600) // 60, total % 60)
    return parse_time(value)


def _normalize_attendance(value):
    normalized = str(value or "").strip().lower()
    normalized = "".join(
        char for char in unicodedata.normalize("NFD", normalized)
        if unicodedata.category(char) != "Mn"
    )
    if normalized not in {"convenio", "particular", "sus"}:
        raise BusinessRuleError("Tipo de atendimento invalido.", code="invalid_attendance_type")
    return normalized


def _normalize_consultation_type(value):
    normalized = str(value or "").strip().lower()
    if normalized not in {"consulta", "exame", "teleconsulta"}:
        raise BusinessRuleError("Tipo de consulta invalido.", code="invalid_consultation_type")
    return normalized


def _min_hours_for_type(consultation_type):
    if consultation_type == "exame":
        return Config.EXAM_MIN_HOURS
    if consultation_type == "teleconsulta":
        return Config.TELECONSULTATION_MIN_HOURS
    return Config.CONSULTATION_MIN_HOURS


def _cancel_min_hours_for_type(consultation_type):
    if consultation_type == "exame":
        return Config.EXAM_CANCEL_MIN_HOURS
    return Config.CONSULTATION_CANCEL_MIN_HOURS


def _get_unit(cursor, unit_id):
    cursor.execute("SELECT * FROM unidades WHERE id = %s AND ativo = TRUE", (unit_id,))
    unit = cursor.fetchone()
    if not unit:
        raise NotFoundError("Unidade nao encontrada ou inativa.", code="unit_not_found")
    return unit


def _get_doctor_unit(cursor, doctor_id, unit_id):
    cursor.execute(
        """
        SELECT mu.*, m.ativo AS medico_ativo
          FROM medicos_unidades mu
          JOIN medicos m ON m.id = mu.id_medico
         WHERE mu.id_medico = %s AND mu.id_unidade = %s AND mu.ativo = TRUE
        """,
        (doctor_id, unit_id),
    )
    relation = cursor.fetchone()
    if not relation or not relation["medico_ativo"]:
        raise BusinessRuleError(
            "Medico nao atende nesta unidade.",
            code="doctor_not_available_at_unit",
        )
    return relation


def _validate_unit_schedule(unit, appointment_time):
    start = _seconds(unit["horario_ini"])
    end = _seconds(unit["horario_fim"])
    selected = _seconds(appointment_time)
    if selected < start or selected >= end:
        raise BusinessRuleError(
            "Horario fora do funcionamento da unidade.",
            code="outside_unit_hours",
        )


def _validate_attendance(cursor, unit, relation, attendance_type, consultation_type, health_plan_id):
    if attendance_type == "sus":
        if not unit["aceita_sus"] or not relation["aceita_sus"]:
            raise BusinessRuleError(
                "Atendimento SUS indisponivel para esta unidade ou medico.",
                code="sus_not_available",
            )
    elif attendance_type == "convenio":
        if not relation["aceita_convenio"]:
            raise BusinessRuleError(
                "Este medico nao atende convenio nesta unidade.",
                code="plan_not_available_for_doctor",
            )
        if not health_plan_id:
            raise BusinessRuleError("Informe o convenio.", code="health_plan_required")
        cursor.execute(
            """
            SELECT 1
              FROM unidades_convenios
             WHERE id_unidade = %s AND id_convenio = %s
            """,
            (unit["id"], health_plan_id),
        )
        if not cursor.fetchone():
            raise BusinessRuleError(
                "Convenio nao aceito nesta unidade.",
                code="health_plan_not_available_at_unit",
            )
    elif attendance_type == "particular" and not relation["aceita_particular"]:
        raise BusinessRuleError(
            "Atendimento particular indisponivel para este medico/unidade.",
            code="private_not_available",
        )

    if consultation_type == "teleconsulta" and not relation["aceita_teleconsulta"]:
        raise BusinessRuleError(
            "Teleconsulta indisponivel para este medico/unidade.",
            code="teleconsultation_not_available",
        )


def _validate_appointment_datetime(date_value, time_value, consultation_type):
    appointment_date = parse_date(date_value, "data_consulta")
    appointment_time = parse_time(time_value, "hora_consulta")
    appointment_moment = combine_date_time(date_value, time_value)
    min_hours = _min_hours_for_type(consultation_type)
    if hours_until(appointment_moment) < min_hours:
        raise BusinessRuleError(
            f"Agendamento precisa de antecedencia minima de {min_hours} hora(s).",
            code="minimum_notice_not_met",
        )
    if appointment_date > date.today() + timedelta(days=Config.APPOINTMENT_MAX_DAYS_AHEAD):
        raise BusinessRuleError(
            f"Agendamento so pode ser feito com ate {Config.APPOINTMENT_MAX_DAYS_AHEAD} dias de antecedencia.",
            code="maximum_notice_exceeded",
        )
    return appointment_date, appointment_time


def _resolve_unit_id_by_cep(cursor, cep):
    if not cep:
        return None
    digits = "".join(char for char in str(cep) if char.isdigit())
    if len(digits) < 5:
        raise BusinessRuleError("CEP invalido para busca de unidade.", code="invalid_zip_code")
    cursor.execute(
        """
        SELECT id
          FROM unidades
         WHERE ativo = TRUE
         ORDER BY
           CASE
             WHEN cep = %s THEN 0
             WHEN LEFT(cep, 5) = LEFT(%s, 5) THEN 1
             WHEN LEFT(cep, 3) = LEFT(%s, 3) THEN 2
             ELSE 3
           END,
           nome
         LIMIT 1
        """,
        (digits[:8], digits[:8], digits[:8]),
    )
    unit = cursor.fetchone()
    if not unit:
        raise BusinessRuleError("Nenhuma unidade ativa encontrada para o CEP informado.", code="unit_not_found_by_zip")
    return unit["id"]


def _ensure_slot_available(cursor, doctor_id, unit_id, appointment_date, appointment_time, ignore_id=None):
    params = [unit_id, doctor_id, appointment_date, appointment_time]
    query = """
        SELECT id
          FROM agendamentos
         WHERE id_unidade = %s
           AND id_medico = %s
           AND data_consulta = %s
           AND hora_consulta = %s
           AND status IN ('pendente', 'confirmado')
    """
    if ignore_id:
        query += " AND id <> %s"
        params.append(ignore_id)
    cursor.execute(query, tuple(params))
    if cursor.fetchone():
        raise BusinessRuleError("Horario ja ocupado.", code="slot_unavailable")


def _insert_event(cursor, appointment_id, event_type, cpf_author=None, detail=None):
    cursor.execute(
        """
        INSERT INTO agendamento_eventos (id_agendamento, tipo_evento, cpf_autor, detalhe)
        VALUES (%s, %s, %s, %s)
        """,
        (appointment_id, event_type, cpf_author, detail),
    )


def _get_appointment(cursor, appointment_id):
    cursor.execute(
        """
        SELECT a.*, p.cpf AS cpf_paciente, p.cpf_responsavel, p.data_nascimento
          FROM agendamentos a
          JOIN pacientes p ON p.id = a.id_paciente
         WHERE a.id = %s
        """,
        (appointment_id,),
    )
    appointment = cursor.fetchone()
    if not appointment:
        raise NotFoundError("Agendamento nao encontrado.", code="appointment_not_found")
    return appointment


def _validate_owner_or_responsible(appointment, cpf_client, cpf_responsible=None):
    client = normalize_cpf(cpf_client, "cpf_cliente")
    if appointment["cpf_paciente"] == client:
        return client

    if cpf_responsible:
        responsible = normalize_cpf(cpf_responsible, "cpf_responsavel")
        if appointment["cpf_responsavel"] == responsible:
            return responsible

    raise BusinessRuleError(
        "Agendamento nao pertence a este CPF.",
        code="appointment_owner_mismatch",
        status_code=403,
    )


def criar_agendamento(data):
    patient = buscar_paciente_por_cpf(data.get("cpf_cliente"))
    consultation_type = _normalize_consultation_type(data.get("tipo_consulta"))
    attendance_type = _normalize_attendance(data.get("tipo_atendimento"))
    doctor_id = int(data.get("id_medico") or 0)
    unit_id = int(data.get("id_unidade") or 0)
    health_plan_id = data.get("id_convenio")
    exam_id = data.get("id_exame")
    observation = data.get("observacao")

    if not doctor_id:
        raise BusinessRuleError("Medico e obrigatorio.", code="missing_doctor")

    responsible = None
    pending_confirmation = paciente_menor_de_idade(patient)
    if pending_confirmation:
        responsible = validar_vinculo_responsavel(patient, data.get("cpf_responsavel"))

    appointment_date, appointment_time = _validate_appointment_datetime(
        data.get("data_consulta"),
        data.get("hora_consulta"),
        consultation_type,
    )

    token = str(uuid4()) if pending_confirmation else None
    expires_at = (
        datetime.now() + timedelta(hours=Config.RESPONSIBLE_CONFIRMATION_EXPIRES_HOURS)
        if pending_confirmation
        else None
    )
    status = "pendente" if pending_confirmation else "confirmado"

    try:
        with db_cursor(commit=True) as cursor:
            if not unit_id and data.get("cep"):
                unit_id = _resolve_unit_id_by_cep(cursor, data.get("cep"))
            if not unit_id:
                raise BusinessRuleError("Unidade e obrigatoria quando o CEP nao for informado.", code="unit_or_zip_required")
            unit = _get_unit(cursor, unit_id)
            relation = _get_doctor_unit(cursor, doctor_id, unit_id)
            _validate_unit_schedule(unit, appointment_time)
            _validate_attendance(cursor, unit, relation, attendance_type, consultation_type, health_plan_id)
            _ensure_slot_available(cursor, doctor_id, unit_id, appointment_date, appointment_time)

            cursor.execute(
                """
                INSERT INTO agendamentos (
                    id_paciente, id_medico, id_unidade, id_convenio, id_exame,
                    data_consulta, hora_consulta, tipo_consulta, tipo_atendimento,
                    status, observacao, cpf_responsavel_confirmacao,
                    confirmacao_token, confirmacao_expira_em, confirmado_em
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    patient["id"],
                    doctor_id,
                    unit_id,
                    health_plan_id,
                    exam_id,
                    appointment_date,
                    appointment_time,
                    consultation_type,
                    attendance_type,
                    status,
                    observation,
                    responsible["cpf"] if responsible else None,
                    token,
                    expires_at,
                    datetime.now() if status == "confirmado" else None,
                ),
            )
            appointment_id = cursor.lastrowid
            _insert_event(cursor, appointment_id, "criado", patient["cpf"], f"status={status}")
    except IntegrityError as error:
        if error.errno == 1062:
            raise BusinessRuleError("Horario ja ocupado.", code="slot_unavailable")
        raise

    return {
        "id": appointment_id,
        "status": status,
        "precisa_confirmacao_responsavel": pending_confirmation,
        "confirmacao_token": token,
        "confirmacao_expira_em": expires_at.isoformat() if expires_at else None,
    }


def confirmar_agendamento_responsavel(appointment_id, data):
    responsible_cpf = normalize_cpf(data.get("cpf_responsavel"), "cpf_responsavel")
    token = data.get("confirmacao_token")
    expired = False

    with db_cursor(commit=True) as cursor:
        appointment = _get_appointment(cursor, appointment_id)
        if appointment["status"] != "pendente":
            raise BusinessRuleError("Agendamento nao esta pendente.", code="appointment_not_pending")
        if appointment["confirmacao_expira_em"] and appointment["confirmacao_expira_em"] < datetime.now():
            cursor.execute("UPDATE agendamentos SET status = 'expirado' WHERE id = %s", (appointment_id,))
            _insert_event(cursor, appointment_id, "expirado", responsible_cpf, "confirmacao expirada")
            expired = True
        else:
            if token and appointment["confirmacao_token"] and token != appointment["confirmacao_token"]:
                raise BusinessRuleError("Token de confirmacao invalido.", code="invalid_confirmation_token", status_code=403)
            if appointment["cpf_responsavel"] != responsible_cpf:
                raise BusinessRuleError("CPF nao autorizado para confirmar.", code="responsible_not_authorized", status_code=403)

            cursor.execute(
                """
                UPDATE agendamentos
                   SET status = 'confirmado', confirmado_em = NOW(), atualizado_em = NOW()
                 WHERE id = %s
                """,
                (appointment_id,),
            )
            _insert_event(cursor, appointment_id, "confirmado", responsible_cpf, "confirmado pelo responsavel")

    if expired:
        raise BusinessRuleError("Confirmacao expirada.", code="confirmation_expired")

    return {"id": appointment_id, "status": "confirmado"}


def consultar_confirmacao_agendamento(appointment_id, data):
    responsible_cpf = normalize_cpf(data.get("cpf_responsavel"), "cpf_responsavel")
    token = data.get("confirmacao_token")

    with db_cursor(commit=True) as cursor:
        appointment = _get_appointment(cursor, appointment_id)
        if appointment["cpf_responsavel"] != responsible_cpf:
            raise BusinessRuleError("CPF nao autorizado para este link.", code="responsible_not_authorized", status_code=403)
        if token and appointment["confirmacao_token"] and token != appointment["confirmacao_token"]:
            raise BusinessRuleError("Token de confirmacao invalido.", code="invalid_confirmation_token", status_code=403)

        expired = bool(
            appointment["status"] == "pendente"
            and appointment["confirmacao_expira_em"]
            and appointment["confirmacao_expira_em"] < datetime.now()
        )
        if expired:
            cursor.execute("UPDATE agendamentos SET status = 'expirado', atualizado_em = NOW() WHERE id = %s", (appointment_id,))
            _insert_event(cursor, appointment_id, "expirado", responsible_cpf, "confirmacao expirada por validacao do link")

    return {
        "id": appointment_id,
        "status": "expirado" if expired else appointment["status"],
        "cpf_responsavel": responsible_cpf,
        "pode_confirmar": appointment["status"] == "pendente" and not expired,
        "confirmacao_expira_em": appointment["confirmacao_expira_em"],
    }


def reagendar_agendamento(appointment_id, data):
    with db_cursor(commit=True) as cursor:
        appointment = _get_appointment(cursor, appointment_id)
        consultation_type = _normalize_consultation_type(appointment["tipo_consulta"])
        new_date, new_time = _validate_appointment_datetime(
            data.get("data_consulta"),
            data.get("hora_consulta"),
            consultation_type,
        )
        author_cpf = _validate_owner_or_responsible(
            appointment,
            data.get("cpf_cliente"),
            data.get("cpf_responsavel"),
        )
        if appointment["status"] not in {"confirmado", "pendente"}:
            raise BusinessRuleError("Apenas agendamentos ativos podem ser reagendados.", code="inactive_appointment")

        attendance_type = appointment["tipo_atendimento"]
        limit = Config.SUS_RESCHEDULE_LIMIT_30_DAYS if attendance_type == "sus" else Config.RESCHEDULE_LIMIT_30_DAYS
        cursor.execute(
            """
            SELECT COUNT(*) AS total
              FROM agendamento_eventos
             WHERE cpf_autor = %s
               AND tipo_evento = 'reagendado'
               AND criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            """,
            (author_cpf,),
        )
        total = cursor.fetchone()["total"]
        if total >= limit:
            cursor.execute(
                "UPDATE agendamentos SET status = 'aprovacao_manual', atualizado_em = NOW() WHERE id = %s",
                (appointment_id,),
            )
            _insert_event(cursor, appointment_id, "reagendado", author_cpf, "limite excedido; aprovacao manual")
            return {"id": appointment_id, "status": "aprovacao_manual", "motivo": "limite_reagendamento"}

        doctor_id = int(data.get("id_medico") or appointment["id_medico"])
        unit_id = int(data.get("id_unidade") or appointment["id_unidade"])
        unit = _get_unit(cursor, unit_id)
        relation = _get_doctor_unit(cursor, doctor_id, unit_id)
        _validate_unit_schedule(unit, new_time)
        _validate_attendance(
            cursor,
            unit,
            relation,
            attendance_type,
            appointment["tipo_consulta"],
            appointment["id_convenio"],
        )
        _ensure_slot_available(cursor, doctor_id, unit_id, new_date, new_time, ignore_id=appointment_id)

        cursor.execute(
            """
            UPDATE agendamentos
               SET id_medico = %s,
                   id_unidade = %s,
                   data_consulta = %s,
                   hora_consulta = %s,
                   reagendamentos_count = reagendamentos_count + 1,
                   ultimo_reagendamento_em = NOW(),
                   atualizado_em = NOW()
             WHERE id = %s
            """,
            (doctor_id, unit_id, new_date, new_time, appointment_id),
        )
        _insert_event(cursor, appointment_id, "reagendado", author_cpf, f"{new_date} {new_time}")

    return {
        "id": appointment_id,
        "status": appointment["status"],
        "data_consulta": str(new_date),
        "hora_consulta": str(new_time),
    }


def cancelar_agendamento(appointment_id, data):
    with db_cursor(commit=True) as cursor:
        appointment = _get_appointment(cursor, appointment_id)
        author_cpf = _validate_owner_or_responsible(
            appointment,
            data.get("cpf_cliente"),
            data.get("cpf_responsavel"),
        )
        if appointment["status"] not in {"confirmado", "pendente"}:
            raise BusinessRuleError("Agendamento nao pode ser cancelado neste status.", code="cannot_cancel")

        appointment_moment = datetime.combine(appointment["data_consulta"], _to_time(appointment["hora_consulta"]))
        min_hours = _cancel_min_hours_for_type(appointment["tipo_consulta"])
        new_status = "cancelado" if hours_until(appointment_moment) >= min_hours else "falta"
        event = "cancelado" if new_status == "cancelado" else "falta"

        cursor.execute(
            """
            UPDATE agendamentos
               SET status = %s, cancelado_em = NOW(), atualizado_em = NOW()
             WHERE id = %s
            """,
            (new_status, appointment_id),
        )
        _insert_event(cursor, appointment_id, event, author_cpf, data.get("motivo"))

    return {"id": appointment_id, "status": new_status}


def listar_agendamentos_por_paciente(cpf):
    normalized = normalize_cpf(cpf, "cpf_cliente")
    return fetch_all(
        """
        SELECT a.*, p.nome AS paciente_nome, m.crm, u.nome AS unidade_nome, uu.nome AS medico_nome
          FROM agendamentos a
          JOIN pacientes p ON p.id = a.id_paciente
          JOIN medicos m ON m.id = a.id_medico
          JOIN usuarios uu ON uu.id = m.id_usuario
          JOIN unidades u ON u.id = a.id_unidade
         WHERE p.cpf = %s OR p.cpf_responsavel = %s
         ORDER BY a.data_consulta DESC, a.hora_consulta DESC
        """,
        (normalized, normalized),
    )


def listar_agendamentos_por_data(date_value):
    appointment_date = parse_date(date_value, "data")
    return fetch_all(
        """
        SELECT a.*, p.nome AS paciente_nome, m.crm, u.nome AS unidade_nome, uu.nome AS medico_nome
          FROM agendamentos a
          JOIN pacientes p ON p.id = a.id_paciente
          JOIN medicos m ON m.id = a.id_medico
          JOIN usuarios uu ON uu.id = m.id_usuario
          JOIN unidades u ON u.id = a.id_unidade
         WHERE a.data_consulta = %s
         ORDER BY a.hora_consulta
        """,
        (appointment_date,),
    )


def listar_horarios_ocupados(data):
    doctor_id = int(data.get("id_medico") or 0)
    unit_id = int(data.get("id_unidade") or 0)
    appointment_date = parse_date(data.get("data"), "data")

    if not doctor_id or not unit_id:
        raise BusinessRuleError("Medico e unidade sao obrigatorios para consultar disponibilidade.", code="missing_doctor_or_unit")

    with db_cursor() as cursor:
        unit = _get_unit(cursor, unit_id)
        _get_doctor_unit(cursor, doctor_id, unit_id)
        cursor.execute(
            """
            SELECT hora_consulta
              FROM agendamentos
             WHERE id_medico = %s
               AND id_unidade = %s
               AND data_consulta = %s
               AND status IN ('pendente', 'confirmado')
             ORDER BY hora_consulta
            """,
            (doctor_id, unit_id, appointment_date),
        )
        occupied = [row["hora_consulta"] for row in cursor.fetchall()]

    return {
        "id_medico": doctor_id,
        "id_unidade": unit_id,
        "data": appointment_date,
        "horario_ini": unit["horario_ini"],
        "horario_fim": unit["horario_fim"],
        "horarios_ocupados": occupied,
    }


create_appointment = criar_agendamento
confirm_responsible = confirmar_agendamento_responsavel
get_confirmation_status = consultar_confirmacao_agendamento
reschedule_appointment = reagendar_agendamento
cancel_appointment = cancelar_agendamento
list_by_client = listar_agendamentos_por_paciente
list_by_date = listar_agendamentos_por_data
list_unavailable_slots = listar_horarios_ocupados

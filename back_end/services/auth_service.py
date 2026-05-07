from mysql.connector import IntegrityError

from back_end.database.connection import db_cursor, fetch_one
from back_end.utils.cpf import normalize_cpf
from back_end.utils.dates import age_from_birthdate, parse_date
from back_end.utils.errors import BusinessRuleError, UnauthorizedError
from back_end.utils.security import create_token, hash_password, verify_password


VALID_USER_TYPES = {"paciente", "responsavel", "medico", "recepcionista", "admin"}


def authenticate_user(cpf, password):
    normalized = normalize_cpf(cpf)
    user = fetch_one(
        "SELECT id, cpf, nome, email, senha_hash, tipo_usuario, ativo FROM usuarios WHERE cpf = %s",
        (normalized,),
    )
    if not user or not user["ativo"]:
        raise UnauthorizedError("CPF ou senha invalidos.", code="invalid_credentials")
    if not verify_password(password, user["senha_hash"]):
        raise UnauthorizedError("CPF ou senha invalidos.", code="invalid_credentials")

    token = create_token(user)
    return {
        "id": user["id"],
        "cpf": user["cpf"],
        "nome": user["nome"],
        "email": user["email"],
        "tipo_usuario": user["tipo_usuario"],
        "token": token,
    }


def create_user(data):
    cpf = normalize_cpf(data.get("cpf"))
    name = (data.get("nome") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("telefone") or "").strip() or None
    birthdate = parse_date(data.get("data_nascimento"), "data_nascimento")
    user_type = data.get("tipo_usuario") or "paciente"
    responsible_cpf = data.get("cpf_responsavel")

    if not name:
        raise BusinessRuleError("Nome e obrigatorio.", code="missing_name")
    if not email:
        raise BusinessRuleError("E-mail e obrigatorio.", code="missing_email")
    if user_type not in VALID_USER_TYPES:
        raise BusinessRuleError("Tipo de usuario invalido.", code="invalid_user_type")

    patient_age = age_from_birthdate(birthdate)
    normalized_responsible = None
    if patient_age < 16:
        if not responsible_cpf:
            raise BusinessRuleError(
                "Menor de 16 anos precisa de CPF de responsavel.",
                code="minor_requires_responsible",
            )
        normalized_responsible = normalize_cpf(responsible_cpf, "cpf_responsavel")
    elif responsible_cpf:
        normalized_responsible = normalize_cpf(responsible_cpf, "cpf_responsavel")

    if normalized_responsible:
        responsible = fetch_one(
            "SELECT cpf, tipo_usuario, ativo FROM usuarios WHERE cpf = %s",
            (normalized_responsible,),
        )
        if not responsible or not responsible["ativo"]:
            raise BusinessRuleError(
                "CPF do responsavel precisa estar cadastrado e ativo.",
                code="responsible_must_exist",
            )
        if responsible["tipo_usuario"] != "responsavel":
            raise BusinessRuleError(
                "CPF do responsavel precisa ser de um usuario do tipo responsavel.",
                code="responsible_must_have_responsible_type",
            )

    password_hash = hash_password(data.get("senha"))

    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO usuarios (cpf, nome, telefone, email, senha_hash, tipo_usuario)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (cpf, name, phone, email, password_hash, user_type),
            )
            user_id = cursor.lastrowid

            if user_type in {"paciente", "responsavel"}:
                cursor.execute(
                    """
                    INSERT INTO pacientes (cpf, nome, data_nascimento, cpf_responsavel)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (cpf, name, birthdate, normalized_responsible),
                )
                patient_id = cursor.lastrowid
            else:
                patient_id = None
    except IntegrityError as error:
        if error.errno == 1062:
            raise BusinessRuleError("CPF ja cadastrado. Faca login.", code="cpf_already_exists")
        raise

    return {
        "id": user_id,
        "id_paciente": patient_id,
        "cpf": cpf,
        "nome": name,
        "menor": patient_age < 16,
    }

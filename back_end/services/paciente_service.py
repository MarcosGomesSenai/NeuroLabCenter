from back_end.config import Config
from back_end.database.connection import db_cursor, fetch_one
from back_end.utils.cpf import normalize_cpf
from back_end.utils.dates import age_from_birthdate
from back_end.utils.errors import BusinessRuleError, NotFoundError
from back_end.utils.security import verify_password


def buscar_paciente_por_cpf(cpf):
    normalized = normalize_cpf(cpf, "cpf_paciente")
    patient = fetch_one(
        """
        SELECT p.*, u.email, u.telefone, u.ativo
          FROM pacientes p
          JOIN usuarios u ON u.cpf = p.cpf
         WHERE p.cpf = %s
        """,
        (normalized,),
    )
    if not patient:
        raise NotFoundError("Paciente nao encontrado.", code="patient_not_found")
    if not patient["ativo"]:
        raise BusinessRuleError("Paciente inativo.", code="inactive_patient")
    return patient


def paciente_menor_de_idade(patient):
    return age_from_birthdate(patient["data_nascimento"]) < Config.MINOR_CONFIRMATION_AGE


def validar_vinculo_responsavel(patient, responsible_cpf):
    responsible = normalize_cpf(responsible_cpf, "cpf_responsavel")
    if patient.get("cpf_responsavel") != responsible:
        raise BusinessRuleError(
            "CPF do responsavel nao esta vinculado a este paciente.",
            code="responsible_not_linked",
            status_code=403,
        )

    responsible_user = fetch_one(
        "SELECT id, cpf, nome, tipo_usuario, ativo FROM usuarios WHERE cpf = %s",
        (responsible,),
    )
    if not responsible_user or not responsible_user["ativo"]:
        raise BusinessRuleError("Responsavel nao cadastrado ou inativo.", code="invalid_responsible")
    if responsible_user["tipo_usuario"] != "responsavel":
        raise BusinessRuleError(
            "CPF informado nao pertence a um usuario do tipo responsavel.",
            code="responsible_must_have_responsible_type",
        )
    return responsible_user


def atualizar_responsavel_paciente(patient_cpf, data):
    patient = buscar_paciente_por_cpf(patient_cpf)
    new_responsible_cpf = normalize_cpf(data.get("novo_cpf_responsavel"), "novo_cpf_responsavel")

    if patient.get("cpf_responsavel"):
        current_responsible_cpf = normalize_cpf(
            data.get("cpf_responsavel_atual"),
            "cpf_responsavel_atual",
        )
        current_password = data.get("senha_responsavel_atual")
        if patient["cpf_responsavel"] != current_responsible_cpf:
            raise BusinessRuleError(
                "CPF do responsavel atual nao confere.",
                code="current_responsible_mismatch",
                status_code=403,
            )

        current_user = fetch_one(
            "SELECT cpf, senha_hash, ativo FROM usuarios WHERE cpf = %s",
            (current_responsible_cpf,),
        )
        if not current_user or not current_user["ativo"] or not verify_password(current_password, current_user["senha_hash"]):
            raise BusinessRuleError(
                "Nova autenticacao do responsavel atual falhou.",
                code="current_responsible_auth_failed",
                status_code=403,
            )

    new_user = fetch_one(
        "SELECT cpf, tipo_usuario, ativo FROM usuarios WHERE cpf = %s",
        (new_responsible_cpf,),
    )
    if not new_user or not new_user["ativo"]:
        raise BusinessRuleError("Novo responsavel nao cadastrado ou inativo.", code="new_responsible_not_found")
    if new_user["tipo_usuario"] != "responsavel":
        raise BusinessRuleError(
            "Novo CPF precisa ser de um usuario do tipo responsavel.",
            code="new_responsible_must_have_responsible_type",
        )

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE pacientes
               SET cpf_responsavel = %s, atualizado_em = NOW()
             WHERE cpf = %s
            """,
            (new_responsible_cpf, patient["cpf"]),
        )

    return {
        "cpf_paciente": patient["cpf"],
        "cpf_responsavel": new_responsible_cpf,
        "mensagem": "Responsavel atualizado com sucesso.",
    }


get_patient_by_cpf = buscar_paciente_por_cpf
is_minor = paciente_menor_de_idade
validate_responsible_link = validar_vinculo_responsavel
update_patient_responsible = atualizar_responsavel_paciente

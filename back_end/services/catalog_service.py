from back_end.database.connection import fetch_all, fetch_one
from back_end.utils.errors import BusinessRuleError


def list_units():
    return fetch_all("SELECT * FROM unidades WHERE ativo = TRUE ORDER BY nome")


def list_doctors():
    return fetch_all(
        """
        SELECT m.id, m.crm, m.especialidade, u.nome, u.cpf
          FROM medicos m
          JOIN usuarios u ON u.id = m.id_usuario
         WHERE m.ativo = TRUE AND u.ativo = TRUE
         ORDER BY u.nome
        """
    )


def list_health_plans():
    return fetch_all("SELECT * FROM convenios WHERE ativo = TRUE ORDER BY nome")


def list_exams():
    return fetch_all("SELECT * FROM exames WHERE ativo = TRUE ORDER BY nome")


def get_unit_by_zip_code(cep):
    digits = "".join(char for char in str(cep or "") if char.isdigit())
    if len(digits) < 5:
        raise BusinessRuleError("CEP invalido.", code="invalid_zip_code")
    unit = fetch_one(
        """
        SELECT *
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
    if not unit:
        raise BusinessRuleError("Nenhuma unidade ativa encontrada para o CEP.", code="unit_not_found_by_zip")
    return unit

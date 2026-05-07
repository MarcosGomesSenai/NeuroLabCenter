from datetime import date, datetime, time

from back_end.utils.errors import BusinessRuleError


def parse_date(value, field_name="data"):
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise BusinessRuleError(f"{field_name} deve estar no formato YYYY-MM-DD.", code="invalid_date")


def parse_time(value, field_name="hora"):
    try:
        text = str(value)
        if len(text) == 5:
            text = f"{text}:00"
        return time.fromisoformat(text)
    except (TypeError, ValueError):
        raise BusinessRuleError(f"{field_name} deve estar no formato HH:MM.", code="invalid_time")


def combine_date_time(date_value, time_value):
    return datetime.combine(parse_date(date_value, "data_consulta"), parse_time(time_value, "hora_consulta"))


def age_from_birthdate(birthdate, today=None):
    today = today or date.today()
    if isinstance(birthdate, str):
        birthdate = parse_date(birthdate, "data_nascimento")
    years = today.year - birthdate.year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        years -= 1
    return years


def hours_until(moment):
    return (moment - datetime.now()).total_seconds() / 3600

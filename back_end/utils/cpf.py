from back_end.utils.errors import BusinessRuleError


def only_digits(value):
    return "".join(char for char in str(value or "") if char.isdigit())


def is_valid_cpf(value):
    cpf = only_digits(value)
    if len(cpf) != 11:
        return False
    if cpf == cpf[0] * 11:
        return False

    for size in (9, 10):
        total = sum(int(cpf[index]) * (size + 1 - index) for index in range(size))
        digit = (total * 10) % 11
        if digit == 10:
            digit = 0
        if digit != int(cpf[size]):
            return False
    return True


def normalize_cpf(value, field_name="cpf"):
    cpf = only_digits(value)
    if not is_valid_cpf(cpf):
        raise BusinessRuleError(f"{field_name} invalido.", code="invalid_cpf")
    return cpf


def mask_cpf(value):
    cpf = only_digits(value)
    if len(cpf) != 11:
        return cpf
    return f"{cpf[:3]}.***.***-{cpf[-2:]}"

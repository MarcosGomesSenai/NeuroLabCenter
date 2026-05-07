class BusinessRuleError(Exception):
    status_code = 400
    code = "business_rule_error"

    def __init__(self, message, code=None, status_code=None):
        super().__init__(message)
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class NotFoundError(BusinessRuleError):
    status_code = 404
    code = "not_found"


class UnauthorizedError(BusinessRuleError):
    status_code = 401
    code = "unauthorized"

from datetime import date, datetime, time, timedelta
from decimal import Decimal


def to_jsonable(value):
    if isinstance(value, list):
        return [to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, timedelta):
        total = int(value.total_seconds())
        hours = total // 3600
        minutes = (total % 3600) // 60
        seconds = total % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    if isinstance(value, Decimal):
        return float(value)
    return value


def ok(data=None, status=200):
    return to_jsonable(data or {}), status


def created(data=None):
    return to_jsonable(data or {}), 201

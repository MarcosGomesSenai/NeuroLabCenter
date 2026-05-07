from datetime import datetime, timezone

import bcrypt
import jwt

from back_end.config import Config
from back_end.utils.errors import UnauthorizedError


def hash_password(password):
    if not password or len(str(password)) < 8:
        raise UnauthorizedError("A senha deve ter pelo menos 8 caracteres.", code="weak_password", status_code=400)
    return bcrypt.hashpw(str(password).encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password, password_hash):
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(str(password).encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_token(user):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["id"]),
        "cpf": user["cpf"],
        "tipo_usuario": user["tipo_usuario"],
        "iat": int(now.timestamp()),
        "exp": int((now + Config.JWT_EXPIRES_IN).timestamp()),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise UnauthorizedError("Token invalido ou expirado.", code="invalid_token")

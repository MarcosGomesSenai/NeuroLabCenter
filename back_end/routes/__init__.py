from flask_cors import CORS

from back_end.routes.agendamentos import bp as agendamentos_bp
from back_end.routes.auth import bp as auth_bp
from back_end.routes.catalog import bp as catalog_bp
from back_end.routes.feedback import bp as feedback_bp
from back_end.routes.pacientes import bp as pacientes_bp
from back_end.routes.usuarios import bp as usuarios_bp


def register_routes(app, prefix="/api"):
    CORS(app)
    app.register_blueprint(auth_bp, url_prefix=prefix)
    app.register_blueprint(usuarios_bp, url_prefix=prefix)
    app.register_blueprint(pacientes_bp, url_prefix=prefix)
    app.register_blueprint(agendamentos_bp, url_prefix=prefix)
    app.register_blueprint(feedback_bp, url_prefix=prefix)
    app.register_blueprint(catalog_bp, url_prefix=prefix)

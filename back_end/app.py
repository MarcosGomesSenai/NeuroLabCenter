from flask import Flask, jsonify

from back_end.config import Config
from back_end.routes import register_routes
from back_end.utils.errors import BusinessRuleError, NotFoundError, UnauthorizedError


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    register_routes(app, Config.API_PREFIX)

    @app.get("/")
    def index():
        return jsonify(
            {
                "name": Config.APP_NAME,
                "status": "online",
                "api_prefix": Config.API_PREFIX,
            }
        )

    @app.errorhandler(BusinessRuleError)
    def handle_business_error(error):
        return jsonify({"erro": str(error), "codigo": error.code}), error.status_code

    @app.errorhandler(NotFoundError)
    def handle_not_found(error):
        return jsonify({"erro": str(error), "codigo": error.code}), 404

    @app.errorhandler(UnauthorizedError)
    def handle_unauthorized(error):
        return jsonify({"erro": str(error), "codigo": error.code}), error.status_code

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        if app.config.get("DEBUG"):
            return jsonify({"erro": str(error), "tipo": error.__class__.__name__}), 500
        return jsonify({"erro": "Erro interno no servidor."}), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=Config.DEBUG)

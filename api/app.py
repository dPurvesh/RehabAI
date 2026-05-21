import os
import json
from flask import Flask, send_from_directory
from werkzeug.exceptions import HTTPException
from flask_cors import CORS
from api.models_loader import load_models
from api.predict import predict_bp
from api.health import health_bp
from api.claude_plans import plans_bp
from api.chat import chat_bp
from api.voice import voice_bp
from api.meal import meal_bp
from api.extract_report import report_bp
from api.config import AppConfig
from api.logging_config import setup_logging
from api.response import fail
from api.security import validate_request_limits

def create_app():
    app = Flask(__name__)
    app.config.from_object(AppConfig)
    setup_logging(app)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["ALLOWED_ORIGINS"]}},
        supports_credentials=True,
    )

    # Security-focused response headers.
    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    @app.before_request
    def enforce_request_limits():
        result = validate_request_limits()
        if result.get("blocked"):
            return fail(result["message"], status_code=result["status_code"])

    @app.errorhandler(HTTPException)
    def handle_http_error(err):
        app.logger.warning("HTTP %s: %s", err.code, err.description)
        return fail(err.description, status_code=err.code)

    @app.errorhandler(Exception)
    def handle_unexpected_error(err):
        app.logger.exception("Unhandled error: %s", err)
        return fail("Internal server error", status_code=500)

    # Register blueprints
    app.register_blueprint(predict_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(plans_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(voice_bp)
    app.register_blueprint(meal_bp)

    # Serve ML testing dashboard
    dashboard_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dashboard")
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

    @app.route("/")
    def dashboard():
        return send_from_directory(dashboard_dir, "index.html")

    @app.route("/app")
    @app.route("/app/")
    def frontend():
        return send_from_directory(frontend_dir, "index.html")

    @app.route("/runtime-config.js")
    def frontend_config():
        safe_api_base = app.config["API_BASE_URL"] or ""
        if not safe_api_base:
            safe_api_base = f"http://{app.config['HOST']}:{app.config['PORT']}"

        payload = {
            "SUPABASE_URL": app.config["SUPABASE_URL"],
            "SUPABASE_ANON_KEY": app.config["SUPABASE_ANON_KEY"],
            "API_BASE_URL": safe_api_base,
        }
        js = f"window.KNEE_CONFIG = {json.dumps(payload)};"
        response = app.response_class(js, mimetype="application/javascript")
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.route("/app/<path:filename>")
    def frontend_static(filename):
        return send_from_directory(frontend_dir, filename)

    # Load models
    with app.app_context():
        print("\n[*] Loading ML models...")
        load_models()

    return app

import sys
sys.stdout.reconfigure(encoding="utf-8")

from api.app import create_app
from api.config import AppConfig

if __name__ == "__main__":
    app = create_app()
    print("\n[*] Starting RehabAI API server...")
    print(f"[*] Dashboard: http://{AppConfig.HOST}:{AppConfig.PORT}/")
    print(f"[*] Health:    http://{AppConfig.HOST}:{AppConfig.PORT}/api/health")
    print(f"[*] Predict:   POST http://{AppConfig.HOST}:{AppConfig.PORT}/api/predict")
    app.run(
        host=AppConfig.HOST,
        port=AppConfig.PORT,
        debug=AppConfig.DEBUG,
        use_reloader=False,
    )

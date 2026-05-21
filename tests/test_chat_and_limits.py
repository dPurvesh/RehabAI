from api.config import AppConfig
from api import security


def test_chat_requires_message(client):
    response = client.post("/api/chat", json={"message": "   "})

    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert data["message"] == "Message is required"


def test_rate_limit_blocks_excess_requests(client):
    original_window = AppConfig.RATE_LIMIT_WINDOW_SECONDS
    original_max = AppConfig.RATE_LIMIT_MAX_REQUESTS

    try:
        security._request_tracker.clear()
        AppConfig.RATE_LIMIT_WINDOW_SECONDS = 60
        AppConfig.RATE_LIMIT_MAX_REQUESTS = 2

        r1 = client.get("/api/health")
        r2 = client.get("/api/health")
        r3 = client.get("/api/health")

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r3.status_code == 429

        data = r3.get_json()
        assert data["status"] == "error"
        assert "Rate limit exceeded" in data["message"]
    finally:
        AppConfig.RATE_LIMIT_WINDOW_SECONDS = original_window
        AppConfig.RATE_LIMIT_MAX_REQUESTS = original_max
        security._request_tracker.clear()

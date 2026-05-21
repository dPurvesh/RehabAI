def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.get_json()
    assert data["project"] == "RehabAI"
    assert "num_models" in data
    assert "models_loaded" in data
    assert data["status"] in {"ok", "loading"}

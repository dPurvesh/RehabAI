def test_predict_requires_json_body(client):
    response = client.post("/api/predict")

    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert data["message"] == "No JSON body"


def test_predict_returns_expected_contract(client, valid_predict_payload):
    response = client.post("/api/predict", json=valid_predict_payload)

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    predictions = data["predictions"]

    assert "recovery_score" in predictions
    assert "risk_level" in predictions
    assert "recovery_rate" in predictions
    assert "days_remaining" in predictions
    assert "physio_alert" in predictions
    assert "rehab_phase" in predictions

import numpy as np
import pandas as pd
from flask import Blueprint, request
from api.models_loader import get_models, INPUT_FEATURES, DECODINGS
from api.schemas import validate_input, encode_input
from api.response import ok, fail

predict_bp = Blueprint("predict", __name__)

def run_prediction(encoded_data, model_keys=None):
    models = get_models()
    df = pd.DataFrame([encoded_data])[INPUT_FEATURES]
    results = {}

    if model_keys is None:
        model_keys = list(models.keys())

    for key in model_keys:
        model = models[key]
        if key in ("recovery_score", "days_remaining"):
            pred = model.predict(df)[0]
            if key == "recovery_score":
                results["recovery_score"] = round(float(np.clip(pred, 0, 100)), 2)
            else:
                results["days_remaining"] = max(1, int(round(pred)))
        elif key == "physio_alert":
            pred = model.predict(df)[0]
            proba = model.predict_proba(df)[0]
            results["physio_alert"] = bool(pred == 1)
            results["physio_alert_confidence"] = round(float(max(proba)), 4)
        elif key == "risk_level":
            pred = model.predict(df)[0]
            proba = model.predict_proba(df)[0]
            results["risk_level"] = DECODINGS["risk_level"][int(pred)]
            results["risk_probabilities"] = {DECODINGS["risk_level"][i]: round(float(p), 4) for i, p in enumerate(proba)}
        elif key == "recovery_rate":
            pred = model.predict(df)[0]
            proba = model.predict_proba(df)[0]
            results["recovery_rate"] = DECODINGS["recovery_rate"][int(pred)]
            results["rate_probabilities"] = {DECODINGS["recovery_rate"][i]: round(float(p), 4) for i, p in enumerate(proba)}
        elif key == "rehab_phase":
            pred = model.predict(df)[0]
            proba = model.predict_proba(df)[0]
            results["rehab_phase"] = DECODINGS["rehab_phase"][int(pred)]
            results["phase_probabilities"] = {DECODINGS["rehab_phase"][i]: round(float(p), 4) for i, p in enumerate(proba)}
    return results

def handle_predict(model_keys=None):
    data = request.get_json(silent=True)
    if data is None:
        return fail("No JSON body", status_code=400)
    cleaned, errors = validate_input(data)
    if errors:
        return fail("Validation failed", status_code=400, errors=errors)
    encoded = encode_input(cleaned)
    preds = run_prediction(encoded, model_keys)
    return ok({"predictions": preds})

@predict_bp.route("/api/predict", methods=["POST"])
def predict_all():
    return handle_predict()

@predict_bp.route("/api/predict/score", methods=["POST"])
def predict_score():
    return handle_predict(["recovery_score"])

@predict_bp.route("/api/predict/risk", methods=["POST"])
def predict_risk():
    return handle_predict(["risk_level"])

@predict_bp.route("/api/predict/alert", methods=["POST"])
def predict_alert():
    return handle_predict(["physio_alert"])

@predict_bp.route("/api/predict/phase", methods=["POST"])
def predict_phase():
    return handle_predict(["rehab_phase"])

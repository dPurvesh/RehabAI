import pytest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.app import create_app


@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def valid_predict_payload():
    return {
        "age": 30,
        "gender": "male",
        "weight_kg": 70.0,
        "height_cm": 170.0,
        "bmi": 24.2,
        "injury_type": "acl_tear",
        "surgery_type": "acl_reconstruction",
        "severity": "moderate",
        "comorbidity": "none",
        "activity": "moderate",
        "graft_type": "none",
        "affected_side": "right",
        "day_number": 30,
        "pain_level": 3.0,
        "swelling_level": 2,
        "stiffness_level": 2,
        "exercises_completed_percent": 80.0,
        "exercise_duration_mins": 30,
        "exercise_difficulty": 2,
        "steps_walked": 2000,
        "sleep_hours": 7.0,
        "sleep_quality": 4,
        "times_woken_up": 1,
        "rested_feeling": 4,
        "fatigue_level": 3,
        "mood_score": 4,
        "medication_taken": 0,
        "physio_session_today": 0,
        "independence_level": 3,
        "ice_applied_today": 1,
        "range_of_motion_flexion": 90.0,
        "range_of_motion_extension": 5.0,
        "muscle_strength_score": 3,
        "balance_score": 3,
        "gait_status": "partial",
        "functional_mobility_score": 55.0,
        "quad_activation_score": 3,
        "brace_status": "hinged_limited",
        "pain_trend_7day": -1.0,
        "exercise_trend_7day": 5.0,
        "sleep_trend_7day": 0.0,
        "in_relapse": 0,
    }

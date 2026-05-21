import os, json, time, joblib
import pandas as pd
import numpy as np

_models = {}
_metadata = None
_load_time = 0
_start_time = 0

INPUT_FEATURES = [
    "age","gender_enc","weight_kg","height_cm","bmi",
    "injury_type_enc","surgery_type_enc","severity_enc","comorbidity_enc","activity_enc",
    "graft_type_enc","affected_side_enc",
    "day_number","pain_level","swelling_level","stiffness_level",
    "exercises_completed_percent","exercise_duration_mins","exercise_difficulty","steps_walked",
    "sleep_hours","sleep_quality","times_woken_up","rested_feeling",
    "fatigue_level","mood_score","medication_taken","physio_session_today",
    "independence_level","ice_applied_today",
    "range_of_motion_flexion","range_of_motion_extension",
    "muscle_strength_score","balance_score","gait_status_enc","functional_mobility_score",
    "quad_activation_score","brace_status_enc",
    "pain_trend_7day","exercise_trend_7day","sleep_trend_7day","in_relapse",
]

ENCODINGS = {
    "gender":{"male":0,"female":1,"other":2},
    "injury_type":{"acl_tear":0,"pcl_tear":1,"mcl_tear":2,"lcl_tear":3,"meniscus_tear":4,
                   "knee_replacement":5,"patellar_tendon":6,"knee_fracture":7,"osteoarthritis":8,"knee_dislocation":9},
    "surgery_type":{"acl_reconstruction":0,"pcl_reconstruction":1,"ligament_repair":2,"meniscectomy":3,
                    "meniscus_repair":4,"total_knee_replacement":5,"partial_knee_replacement":6,
                    "tendon_repair":7,"fracture_fixation":8,"arthroscopy":9,"conservative_treatment":10,"osteotomy":11},
    "severity":{"mild":0,"moderate":1,"severe":2},
    "comorbidity":{"none":0,"diabetes":1,"hypertension":2,"obesity":3,"osteoporosis":4},
    "activity":{"sedentary":0,"moderate":1,"active":2,"athlete":3},
    "graft_type":{"autograft":0,"allograft":1,"synthetic":2,"none":3},
    "affected_side":{"left":0,"right":1,"bilateral":2},
    "gait_status":{"non_weight_bearing":0,"partial":1,"full_assisted":2,"independent":3},
    "brace_status":{"locked_extension":0,"hinged_limited":1,"hinged_full":2,"none":3},
}

DECODINGS = {
    "risk_level":{0:"LOW",1:"MEDIUM",2:"HIGH"},
    "recovery_rate":{0:"SLOW",1:"NORMAL",2:"FAST"},
    "rehab_phase":{0:"PROTECTION",1:"MOBILITY",2:"STRENGTHENING",3:"FUNCTIONAL"},
}

MODEL_NAMES = ["recovery_score","risk_level","recovery_rate","days_remaining","physio_alert","rehab_phase"]

def load_models():
    global _models, _metadata, _load_time, _start_time
    _start_time = time.time()
    start = time.time()
    base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    meta_path = os.path.join(base, "model_metadata.json")
    with open(meta_path) as f:
        _metadata = json.load(f)
    for name in MODEL_NAMES:
        path = os.path.join(base, f"{name}_model.pkl")
        _models[name] = joblib.load(path)
        print(f"  [+] Loaded {name}")
    _load_time = round(time.time() - start, 2)
    print(f"  [OK] All {len(_models)} models loaded in {_load_time}s")

def get_models(): return _models
def get_metadata(): return _metadata
def get_load_time(): return _load_time
def get_uptime(): return round(time.time() - _start_time, 1)
def is_loaded(): return len(_models) == len(MODEL_NAMES)

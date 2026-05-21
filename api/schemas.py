from api.models_loader import ENCODINGS

NUMERIC_FIELDS = {
    "age":(10,100),"weight_kg":(30.0,200.0),"height_cm":(120.0,220.0),"bmi":(10.0,60.0),
    "day_number":(1,365),"pain_level":(0.0,10.0),"swelling_level":(1,5),"stiffness_level":(1,5),
    "exercises_completed_percent":(0.0,100.0),"exercise_duration_mins":(0,300),
    "exercise_difficulty":(1,5),"steps_walked":(0,50000),
    "sleep_hours":(0.0,24.0),"sleep_quality":(1,5),"times_woken_up":(0,20),"rested_feeling":(1,5),
    "fatigue_level":(1,10),"mood_score":(1,5),"medication_taken":(0,1),
    "physio_session_today":(0,1),"independence_level":(1,5),"ice_applied_today":(0,1),
    "range_of_motion_flexion":(0.0,180.0),"range_of_motion_extension":(0.0,30.0),
    "muscle_strength_score":(1,5),"balance_score":(1,5),
    "functional_mobility_score":(0.0,100.0),"quad_activation_score":(1,5),
    "pain_trend_7day":(-10.0,10.0),"exercise_trend_7day":(-100.0,100.0),
    "sleep_trend_7day":(-10.0,10.0),"in_relapse":(0,1),
}

CATEGORICAL_FIELDS = {
    "gender": list(ENCODINGS["gender"].keys()),
    "injury_type": list(ENCODINGS["injury_type"].keys()),
    "surgery_type": list(ENCODINGS["surgery_type"].keys()),
    "severity": list(ENCODINGS["severity"].keys()),
    "comorbidity": list(ENCODINGS["comorbidity"].keys()),
    "activity": list(ENCODINGS["activity"].keys()),
    "graft_type": list(ENCODINGS["graft_type"].keys()),
    "affected_side": list(ENCODINGS["affected_side"].keys()),
    "gait_status": list(ENCODINGS["gait_status"].keys()),
    "brace_status": list(ENCODINGS["brace_status"].keys()),
}

# Maps categorical field name -> encoded feature name
CAT_TO_ENC = {
    "gender":"gender_enc","injury_type":"injury_type_enc","surgery_type":"surgery_type_enc",
    "severity":"severity_enc","comorbidity":"comorbidity_enc","activity":"activity_enc",
    "graft_type":"graft_type_enc","affected_side":"affected_side_enc",
    "gait_status":"gait_status_enc","brace_status":"brace_status_enc",
}

def validate_input(data):
    errors = []
    if not isinstance(data, dict):
        return None, ["Request body must be a JSON object"]

    cleaned = {}

    # Validate numeric fields
    for field, (lo, hi) in NUMERIC_FIELDS.items():
        if field not in data:
            errors.append(f"Missing field: {field}")
            continue
        try:
            val = float(data[field])
            if val < lo or val > hi:
                errors.append(f"{field}={val} out of range [{lo}, {hi}]")
            else:
                cleaned[field] = val
        except (ValueError, TypeError):
            errors.append(f"{field} must be a number, got: {data[field]}")

    # Validate categorical fields
    for field, valid_values in CATEGORICAL_FIELDS.items():
        if field not in data:
            errors.append(f"Missing field: {field}")
            continue
        val = str(data[field]).lower().strip()
        if val not in valid_values:
            errors.append(f"{field}='{val}' not valid. Options: {valid_values}")
        else:
            cleaned[field] = val

    if errors:
        return None, errors
    return cleaned, []

def encode_input(cleaned):
    encoded = {}
    # Copy numeric fields directly
    for field in NUMERIC_FIELDS:
        encoded[field] = cleaned[field]
    # Encode categoricals
    for cat_field, enc_field in CAT_TO_ENC.items():
        encoded[enc_field] = ENCODINGS[cat_field][cleaned[cat_field]]
    return encoded

import json
import re
from flask import Blueprint, request
from api.claude_config import call_gemini, PLAN_SYSTEM, MOCK_MODE
from api.response import ok

plans_bp = Blueprint("plans", __name__)

MOCK_PLAN = {
    "plan_name": "Daily Recovery Plan",
    "summary": "Focus on gentle ROM exercises and quad activation for your current recovery phase.",
    "exercises": [
        {"name": "Quad Sets", "sets": 3, "reps": 10, "duration_secs": 60, "notes": "Hold each contraction for 5 seconds"},
        {"name": "Ankle Pumps", "sets": 3, "reps": 20, "duration_secs": 45, "notes": "Slow and controlled movements"},
        {"name": "Heel Slides", "sets": 3, "reps": 10, "duration_secs": 60, "notes": "Slide heel toward buttocks gently"},
        {"name": "Straight Leg Raises", "sets": 3, "reps": 10, "duration_secs": 60, "notes": "Keep knee fully extended"},
        {"name": "Seated Knee Extension", "sets": 3, "reps": 10, "duration_secs": 60, "notes": "Full extension, hold 3 sec"},
    ]
}

def parse_plan_json(text):
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start:end + 1])
        raise

@plans_bp.route("/api/generate-plan", methods=["POST"])
def generate_plan():
    data = request.get_json(silent=True) or {}
    injury = data.get("injury_type", "acl_tear")
    day = data.get("day_number", 30)
    score = data.get("recovery_score", 50)
    risk = data.get("risk_level", "LOW")
    phase = data.get("rehab_phase", "MOBILITY")
    pain = data.get("pain_level", 3)
    rom = data.get("rom_flexion", 90)

    prompt = f"""Patient: {injury.replace('_',' ')}, Day {day}, Score: {score}/100
Risk: {risk}, Phase: {phase}, ROM: {rom}°, Pain: {pain}/10
Generate an appropriate exercise plan."""

    result = call_gemini(PLAN_SYSTEM, prompt, max_tokens=4096)
    if result:
        try:
            plan = parse_plan_json(result)
            return ok({"plan": plan, "source": "gemini"})
        except json.JSONDecodeError:
            pass

    plan = dict(MOCK_PLAN)
    plan["plan_name"] = f"Day {day} {phase.title()} Plan"
    plan["summary"] = f"Exercises for {injury.replace('_',' ')} recovery. Score: {score}/100, Phase: {phase}."
    return ok({"plan": plan, "source": "mock"})

from flask import Blueprint, request
from api.claude_config import call_gemini, VOICE_COACH_SYSTEM, MOTIVATE_SYSTEM, MOCK_MODE
from api.response import ok, fail

voice_bp = Blueprint("voice", __name__)

MOCK_WORKOUT = {
    "plan_name": "Quick Recovery Session",
    "duration": "20 minutes",
    "exercises": [
        {"name": "Seated Quad Sets", "sets": 3, "reps": 15, "notes": "Tighten quad, hold 5 sec"},
        {"name": "Heel Slides", "sets": 3, "reps": 12, "notes": "Slow controlled movement"},
        {"name": "Standing Calf Raises", "sets": 3, "reps": 10, "notes": "Use wall for balance"},
        {"name": "Ankle Pumps", "sets": 2, "reps": 20, "notes": "Full range of motion"},
    ],
    "cooldown": "5 minutes of deep breathing and gentle stretching",
    "tips": "Listen to your body. Stop if you feel sharp pain."
}

MOCK_QUOTES = [
    "Recovery is not linear. Every small step forward is still progress. Keep going!",
    "Your body is healing every single day. Trust the process and stay consistent.",
    "The hardest part is showing up. You've already done that today.",
]

@voice_bp.route("/api/voice/coach", methods=["POST"])
def voice_coach():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    context = data.get("patient_context", {})

    if not message:
        return fail("Voice message is required", status_code=400)

    ctx_str = ""
    if context:
        ctx_str = f"""Patient context: {context.get('injury_type','unknown')} injury, 
Day {context.get('day_number',0)}, Score: {context.get('score',50)}%, 
Phase: {context.get('phase','MOBILITY')}, Pain: {context.get('pain',3)}/10"""

    system = f"{VOICE_COACH_SYSTEM}\n\n{ctx_str}" if ctx_str else VOICE_COACH_SYSTEM
    result = call_gemini(system, message, max_tokens=1200)

    if result:
        # Try to parse as JSON for structured plans
        import json
        import re
        parsed = None
        
        # Strategy 1: Direct parse
        try:
            parsed = json.loads(result.strip())
        except Exception:
            pass
        
        # Strategy 2: Extract from code blocks
        if not parsed:
            try:
                match = re.search(r'```(?:json)?\s*(\{[\s\S]*\})\s*```', result, re.IGNORECASE)
                if match:
                    parsed = json.loads(match.group(1))
            except Exception:
                pass
        
        # Strategy 3: Find outermost braces
        if not parsed:
            try:
                start = result.find('{')
                end = result.rfind('}')
                if start != -1 and end > start:
                    parsed = json.loads(result[start:end+1])
            except Exception:
                pass

        if parsed and isinstance(parsed, dict):
            return ok({"response": parsed, "format": "structured", "source": "gemini"})
        else:
            return ok({"response": result, "format": "text", "source": "gemini"})

    return ok({"response": MOCK_WORKOUT, "format": "structured", "source": "mock"})


@voice_bp.route("/api/voice/motivate", methods=["POST"])
def voice_motivate():
    result = call_gemini(MOTIVATE_SYSTEM, "Give me a short motivational quote for my rehabilitation journey.", max_tokens=200)
    if result:
        return ok({"quote": result, "source": "gemini"})

    import random
    return ok({"quote": random.choice(MOCK_QUOTES), "source": "mock"})

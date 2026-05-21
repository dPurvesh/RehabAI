from flask import Blueprint, request
from api.claude_config import call_gemini, CHAT_SYSTEM, MOCK_MODE
from api.response import ok, fail

chat_bp = Blueprint("chat", __name__)

MOCK_RESPONSES = {
    "pain": "Pain is a normal part of recovery. If it's below 5/10, that's expected at this stage. Apply ice for 15-20 minutes, elevate your knee, and take prescribed medication if needed. If pain exceeds 7/10 or is sharp/sudden, please contact your physiotherapist immediately.",
    "exercise": "Great that you're focused on exercises! Consistency is key to recovery. Try to complete at least 70% of your prescribed exercises daily. Start with gentle ROM exercises and gradually increase intensity. Always stop if you feel sharp pain.",
    "sleep": "Quality sleep is crucial for tissue healing. Try elevating your knee with a pillow, maintain a cool room temperature, and avoid caffeine after 2 PM. If pain disrupts sleep, take medication 30 minutes before bed. Aim for 7-9 hours nightly.",
    "swelling": "Some swelling is expected during recovery. Use the RICE method: Rest, Ice (15-20 min every 2 hours), Compression with an elastic bandage, and Elevation above heart level. If swelling suddenly increases or feels hot, contact your doctor.",
    "walking": "Gradually progress your walking. Follow your weight-bearing protocol strictly. Focus on equal weight distribution and avoid compensatory limping. Use assistive devices as prescribed. Short, frequent walks are better than one long walk.",
    "default": "That's a great question about your recovery! I'm here to support your rehabilitation journey. For specific medical concerns, please consult your physiotherapist or surgeon. Is there anything specific about your knee exercises, pain management, or daily activities I can help with?",
}

@chat_bp.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    context = data.get("patient_context", {})

    if not message:
        return fail("Message is required", status_code=400)

    ctx_str = f"""Patient context: {context.get('injury_type','unknown')} injury, 
Day {context.get('day_number',0)}, Score: {context.get('score',50)}%, 
Phase: {context.get('phase','MOBILITY')}, Pain: {context.get('pain',3)}/10"""

    # Include exercise session context if available
    if context.get('last_exercise'):
        ctx_str += f"""
Latest exercise session: {context.get('last_exercise')}, 
Reps: {context.get('last_exercise_reps',0)}/{context.get('last_exercise_target',10)}, 
Form quality: {context.get('last_exercise_form',0)}%, 
Angle range: {context.get('last_exercise_angle_range','N/A')}, 
Form issues: {context.get('last_exercise_issues','none')}"""

    system = f"{CHAT_SYSTEM}\n\n{ctx_str}"
    result = call_gemini(system, message, max_tokens=900, is_json=False)

    if result:
        return ok({"response": result, "source": "gemini"})

    # Mock response
    msg_lower = message.lower()
    for key, resp in MOCK_RESPONSES.items():
        if key != "default" and key in msg_lower:
            return ok({"response": resp, "source": "mock"})

    return ok({"response": MOCK_RESPONSES["default"], "source": "mock"})

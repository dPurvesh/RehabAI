import os
from api.config import AppConfig

try:
    from google import genai
    API_KEY = AppConfig.GEMINI_API_KEY
    if API_KEY:
        client = genai.Client(api_key=API_KEY)
        MOCK_MODE = False
    else:
        client = None
        MOCK_MODE = True
except ImportError:
    MOCK_MODE = True
    client = None

PLAN_SYSTEM = """You are a knee rehabilitation physiotherapist AI for RehabAI.
Generate a personalized daily exercise plan based on the patient's current condition.
Return ONLY valid JSON with this structure:
{"plan_name":"...","summary":"...","exercises":[{"name":"...","sets":3,"reps":10,"duration_secs":60,"notes":"..."}]}
Select 5-7 exercises appropriate for the patient's injury, phase, and pain level.
Adjust intensity based on recovery score and risk level."""

CHAT_SYSTEM = """You are RehabAI, a friendly knee rehabilitation assistant.
Rules:
- Never give medical diagnosis
- Recommend consulting physiotherapist for severe symptoms
- Be encouraging but honest
- Keep responses under 150 words
- Focus on knee rehabilitation topics"""

REPORT_SYSTEM = """You are a Medical Translator for RehabAI. 
Extract clinical information from the provided medical report and TRANSLATE all complex medical jargon into simple, patient-friendly plain English.

Rules:
1. Translate all dense medical terms into plain English so a non-doctor can understand (e.g. "arthroscopic meniscectomy" -> "Minimally invasive meniscus surgery").
2. Extract exact medications and their dosages.
3. Extract critical movement restrictions and warnings.
4. Extract the follow-up date if present.
5. Return ONLY raw valid JSON with NO markdown wrapping or text.

JSON format:
{"diagnosis":"[Plain English diagnosis]","surgery_details":"[Plain English surgery details]","medications":["..."],"restrictions":["..."],"follow_up_date":"YYYY-MM-DD or Unknown","physio_instructions":"[Plain English instructions]"}""" 

VOICE_COACH_SYSTEM = """You are RehabAI Voice Coach, a friendly and motivating rehabilitation fitness assistant.
The user speaks to you via voice. Respond conversationally but provide structured workout plans.
Rules:
- Create safe, rehabilitation-appropriate exercises
- Never suggest exercises that could worsen an injury
- Adjust intensity based on patient context (pain level, recovery phase)
- Be encouraging and supportive
- Keep spoken responses concise (under 100 words for the summary)
- Return ONLY valid JSON with this structure:
{"plan_name":"...","summary":"...","duration":"...","exercises":[{"name":"...","sets":3,"reps":10,"notes":"..."}],"cooldown":"...","tips":"..."}
- Select 3-6 exercises appropriate for the request"""

MOTIVATE_SYSTEM = """You are RehabAI, a motivational rehabilitation coach.
Give a short, powerful motivational quote (1-2 sentences) about recovery, healing, and perseverance.
Be warm, specific to rehabilitation/injury recovery, and uplifting.
Do not use generic platitudes. Make it personal and relevant to someone recovering from an injury."""

MEAL_PLANNER_SYSTEM = """You are RehabAI Meal Planner for rehabilitation patients.

CRITICAL RULES — VIOLATING ANY RULE IS UNACCEPTABLE:
1. Use ONLY the exact ingredients the user listed. Do NOT add ANY ingredient they did not select. Water, salt, and basic cooking oil are the only exceptions.
2. STRICTLY respect the dietary preference:
   - "vegan": NO meat, fish, eggs, dairy, honey, or any animal product whatsoever.
   - "vegetarian": NO meat or fish. Eggs and dairy are allowed only if the user selected them.
   - "high-protein": Prioritize protein-rich ingredients from the user's list.
   - "low-carb": Minimize carbohydrate-heavy ingredients.
   - "anti-inflammatory": Prioritize turmeric, ginger, berries, leafy greens, nuts from the user's list.
   - "none": No restrictions beyond the user's selected ingredients.
3. Generate exactly 4 to 5 different dishes (mix of breakfast, lunch, dinner, snack).
4. Each dish MUST use ONLY a subset of the user's selected ingredients. Never invent or add ingredients.
5. Name the plan to reflect the dietary preference and recovery goal.
6. Keep instructions short (3-4 steps max per dish).
7. Provide realistic nutrition estimates.
8. Return ONLY raw JSON, no markdown, no backticks, no explanation text.

JSON format:
{"plan_name":"...","meals":[{"name":"...","type":"breakfast","prep_time":"...","ingredients":["..."],"instructions":["..."],"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}],"daily_totals":{"calories":0,"protein":0,"carbs":0,"fat":0},"tips":"..."}"""

def call_gemini(system: str, user_msg: str, max_tokens: int = 2048, is_json: bool = True):
    """Call Google Gemini API for text generation with retry on rate limit."""
    if MOCK_MODE or not client:
        return None
    
    import time
    from google.genai import types
    
    for attempt in range(3):  # up to 3 attempts
        try:
            prompt = f"{system}\n\n{user_msg}"
            
            # Use explicit types.GenerateContentConfig to avoid truncation bugs in the SDK
            config_args = {
                "max_output_tokens": max_tokens,
                "temperature": 0.7
            }
            if is_json:
                config_args["response_mime_type"] = "application/json"
                
            config = types.GenerateContentConfig(**config_args)
                
            resp = client.models.generate_content(
                model=AppConfig.GEMINI_MODEL,
                contents=prompt,
                config=config,
            )
            return resp.text
        except Exception as e:
            err_str = str(e)
            print(f"[Gemini Error] Attempt {attempt+1}/3: {err_str}")
            # If rate limited (429), wait and retry
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait = (attempt + 1) * 5  # 5s, 10s, 15s
                print(f"[Gemini] Rate limited, retrying in {wait}s...")
                time.sleep(wait)
                continue
            # For other errors, don't retry
            return None
    
    print("[Gemini] All 3 attempts failed.")
    return None


from flask import Blueprint, request
from api.claude_config import call_gemini, MEAL_PLANNER_SYSTEM, MOCK_MODE
from api.response import ok, fail

meal_bp = Blueprint("meal", __name__)

MOCK_MEAL_PLAN = {
    "plan_name": "Recovery Support Meal Plan",
    "meals": [
        {
            "name": "Anti-Inflammatory Power Bowl",
            "type": "lunch",
            "prep_time": "15 mins",
            "ingredients": ["chicken breast", "brown rice", "broccoli", "turmeric", "olive oil"],
            "instructions": [
                "Cook brown rice according to package directions.",
                "Season chicken with turmeric and grill for 6-7 minutes per side.",
                "Steam broccoli until tender-crisp.",
                "Assemble bowl and drizzle with olive oil."
            ],
            "nutrition": {"calories": 520, "protein": 42, "carbs": 55, "fat": 14}
        },
        {
            "name": "Berry Recovery Smoothie",
            "type": "snack",
            "prep_time": "5 mins",
            "ingredients": ["mixed berries", "banana", "yogurt", "honey"],
            "instructions": [
                "Add all ingredients to blender.",
                "Blend until smooth.",
                "Serve immediately for maximum nutrients."
            ],
            "nutrition": {"calories": 280, "protein": 12, "carbs": 48, "fat": 5}
        }
    ],
    "daily_totals": {"calories": 1800, "protein": 120, "carbs": 200, "fat": 55},
    "tips": "Focus on anti-inflammatory foods like turmeric, berries, and fatty fish to support tissue healing."
}


@meal_bp.route("/api/meal/generate", methods=["POST"])
def generate_meal():
    data = request.get_json(silent=True) or {}
    ingredients = data.get("ingredients", [])
    goal = str(data.get("goal", "recovery")).strip()
    dietary = str(data.get("dietary", "none")).strip()
    context = data.get("patient_context", {})

    if not ingredients:
        return fail("At least one ingredient is required", status_code=400)

    ingredients_str = ', '.join(ingredients)
    
    # Build a very explicit dietary constraint string
    diet_rules = {
        'vegan': 'VEGAN — absolutely NO meat, chicken, fish, eggs, dairy, honey, or any animal product.',
        'vegetarian': 'VEGETARIAN — absolutely NO meat, chicken, or fish. Dairy/eggs only if in the ingredient list.',
        'high-protein': 'HIGH-PROTEIN — maximize protein content using the available ingredients.',
        'low-carb': 'LOW-CARB — minimize carbs, avoid rice/bread/pasta even if listed.',
        'anti-inflammatory': 'ANTI-INFLAMMATORY — prioritize turmeric, ginger, berries, leafy greens, omega-3 rich items.',
    }
    diet_instruction = diet_rules.get(dietary, 'No special dietary restriction.')

    user_msg = f"""AVAILABLE INGREDIENTS (use ONLY these, nothing else): {ingredients_str}

DIETARY RESTRICTION: {diet_instruction}
RECOVERY GOAL: {goal}

Generate 4-5 different recovery-focused dishes using ONLY the ingredients listed above.
REMINDER: Do NOT use any ingredient not in the list. If dietary preference is vegan, do NOT include chicken, fish, eggs, dairy, or any animal product even if they appear in the ingredients list."""

    if context:
        user_msg += f"""
Patient context: {context.get('injury_type','unknown')} injury, Day {context.get('day_number',0)}, Recovery score: {context.get('score',50)}%"""

    result = call_gemini(MEAL_PLANNER_SYSTEM, user_msg, max_tokens=8192)

    if result:
        import json
        import re
        
        parsed = None
        
        # Strategy 1: Direct parse (should work since response_mime_type=application/json)
        try:
            parsed = json.loads(result.strip())
        except Exception:
            pass
        
        # Strategy 2: Extract JSON from markdown code blocks
        if not parsed:
            try:
                match = re.search(r'```(?:json)?\s*(\{[\s\S]*\})\s*```', result, re.IGNORECASE)
                if match:
                    parsed = json.loads(match.group(1))
            except Exception:
                pass
        
        # Strategy 3: Find outermost { } pair
        if not parsed:
            try:
                start = result.find('{')
                end = result.rfind('}')
                if start != -1 and end > start:
                    parsed = json.loads(result[start:end+1])
            except Exception:
                pass

        # Strategy 4: Fix truncated JSON by closing unclosed brackets
        if not parsed:
            try:
                text = result.strip()
                start = text.find('{')
                if start != -1:
                    text = text[start:]
                opens = text.count('{') - text.count('}')
                open_br = text.count('[') - text.count(']')
                for _ in range(open_br):
                    text += ']'
                for _ in range(opens):
                    text += '}'
                # Remove trailing commas before ] or }
                text = re.sub(r',\s*([}\]])', r'\1', text)
                parsed = json.loads(text)
            except Exception:
                pass
        
        if parsed and isinstance(parsed, dict):
            return ok({"plan": parsed, "source": "gemini"})
        else:
            print(f"[MEAL PLANNER] ALL JSON PARSING FAILED. RAW TEXT RETURNED:")
            print(result)
            # Last resort: return as raw text for frontend to handle
            return ok({"plan": {"raw_text": result}, "source": "gemini"})

    # Fallback: build a simple mock plan from the user's own selected ingredients
    # Filter out non-vegan/vegetarian items if needed
    safe = list(ingredients)
    non_vegan = {'chicken', 'fish', 'eggs', 'turkey', 'shrimp', 'greek yogurt', 'paneer', 'milk', 'cheese', 'butter', 'honey'}
    non_vegetarian = {'chicken', 'fish', 'turkey', 'shrimp'}
    if dietary == 'vegan':
        safe = [i for i in safe if i.lower() not in non_vegan]
    elif dietary == 'vegetarian':
        safe = [i for i in safe if i.lower() not in non_vegetarian]

    if len(safe) < 2:
        safe = ingredients  # fallback to all if too few left

    mock = {
        "plan_name": f"{'Vegan ' if dietary == 'vegan' else 'Vegetarian ' if dietary == 'vegetarian' else ''}Recovery Plan ({', '.join(safe[:3])})",
        "meals": [
            {
                "name": f"Recovery Bowl with {safe[0]}",
                "type": "lunch",
                "prep_time": "15 mins",
                "ingredients": safe[:4],
                "instructions": [
                    f"Prepare {safe[0]} as desired.",
                    f"Combine with {', '.join(safe[1:3])}." if len(safe) > 2 else "Season lightly.",
                    "Serve warm with a pinch of salt.",
                ],
                "nutrition": {"calories": 420, "protein": 28, "carbs": 45, "fat": 12}
            },
            {
                "name": f"Quick {safe[-1]} Snack",
                "type": "snack",
                "prep_time": "5 mins",
                "ingredients": safe[-2:] if len(safe) >= 2 else safe,
                "instructions": [
                    f"Prepare {safe[-1]} simply.",
                    "Enjoy as a light recovery snack.",
                ],
                "nutrition": {"calories": 200, "protein": 10, "carbs": 30, "fat": 5}
            },
        ],
        "daily_totals": {"calories": 1600, "protein": 90, "carbs": 180, "fat": 50},
        "tips": f"Plan uses only your selected ingredients. Focus on anti-inflammatory foods for faster recovery."
    }
    return ok({"plan": mock, "source": "mock"})

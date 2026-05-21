"""Quick test of Gemini API for meal planning."""
from google import genai
import json, os
from dotenv import load_dotenv
load_dotenv(override=True)

client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])

prompt = """You are a meal planner for rehab patients. Return ONLY valid JSON.

Available ingredients: Rice, Tofu, Spinach, Turmeric
Dietary: vegan
Generate 2 dishes.

JSON format: {"plan_name":"...","meals":[{"name":"...","type":"lunch","prep_time":"...","ingredients":["..."],"instructions":["..."],"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}],"daily_totals":{"calories":0,"protein":0,"carbs":0,"fat":0},"tips":"..."}"""

resp = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=prompt,
    config={'max_output_tokens': 2500, 'temperature': 0.7, 'response_mime_type': 'application/json'},
)

text = resp.text
print(f"Response length: {len(text)}")
print(f"First 500 chars: {repr(text[:500])}")
print()

try:
    parsed = json.loads(text.strip())
    print("DIRECT PARSE: SUCCESS")
    print(f"Has meals: {'meals' in parsed}")
    if 'meals' in parsed:
        for m in parsed['meals']:
            print(f"  - {m.get('name')}: {m.get('ingredients', [])}")
except Exception as e:
    print(f"DIRECT PARSE FAILED: {e}")
    # Try finding braces
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start:end+1])
            print("BRACE PARSE: SUCCESS")
        except Exception as e2:
            print(f"BRACE PARSE FAILED: {e2}")

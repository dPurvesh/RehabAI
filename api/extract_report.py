import json
import io
from flask import Blueprint, request
from api.claude_config import call_gemini, REPORT_SYSTEM, MOCK_MODE
from api.response import ok, fail

report_bp = Blueprint("report", __name__)

MOCK_EXTRACTION = {
    "diagnosis": "Grade 2 ACL Tear with mild medial meniscus fraying",
    "surgery_details": "ACL Reconstruction scheduled",
    "medications": ["Ibuprofen 400mg", "Acetaminophen"],
    "restrictions": ["Non-weight bearing for 2 weeks", "Brace locked in extension"],
    "follow_up_date": "2026-06-01",
    "physio_instructions": "Begin gentle patellar mobilization and quad sets. Limit flexion to 90 degrees."
}

# Map common diagnosis phrases → structured injury types
INJURY_TYPE_MAP = {
    "acl": "acl_tear",
    "anterior cruciate": "acl_tear",
    "pcl": "pcl_tear",
    "posterior cruciate": "pcl_tear",
    "meniscus": "meniscus_tear",
    "meniscal": "meniscus_tear",
    "patellar": "patellar_injury",
    "patella": "patellar_injury",
    "replacement": "total_knee_replacement",
    "arthroplasty": "total_knee_replacement",
    "tkr": "total_knee_replacement",
    "collateral": "collateral_ligament",
    "mcl": "collateral_ligament",
    "lcl": "collateral_ligament",
    "fracture": "tibial_plateau_fracture",
    "tibial plateau": "tibial_plateau_fracture",
    "tendon": "tendon_repair",
    "tendinitis": "tendon_repair",
    "tendinopathy": "tendon_repair",
    "arthroscopy": "knee_arthroscopy",
    "arthroscopic": "knee_arthroscopy",
    "dislocation": "knee_dislocation",
}


def extract_text_from_file(file_storage):
    """Extract text from uploaded PDF or image file."""
    filename = (file_storage.filename or "").lower()
    raw_bytes = file_storage.read()

    # PDF extraction
    if filename.endswith(".pdf"):
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
            return "\n".join(pages).strip()
        except Exception as e:
            return f"[PDF extraction error: {e}]"

    # Image extraction via Tesseract OCR
    if filename.endswith((".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp")):
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(raw_bytes))
            return pytesseract.image_to_string(img).strip()
        except ImportError:
            return "[Tesseract OCR not installed. Install tesseract-ocr and pytesseract.]"
        except Exception as e:
            return f"[OCR error: {e}]"

    return "[Unsupported file type. Upload PDF, JPG, or PNG.]"


def identify_condition(diagnosis_text):
    """Map a diagnosis string to a structured injury type."""
    lower = (diagnosis_text or "").lower()
    for keyword, injury_type in INJURY_TYPE_MAP.items():
        if keyword in lower:
            return injury_type
    return None


@report_bp.route("/api/extract-report", methods=["POST"])
def extract_report():
    report_text = ""

    # Check for file upload (multipart)
    if request.files and "file" in request.files:
        uploaded = request.files["file"]
        report_text = extract_text_from_file(uploaded)
    else:
        # Fallback to JSON text body
        data = request.get_json(silent=True) or {}
        report_text = str(data.get("text", "")).strip()

    if not report_text:
        return fail("No text or file provided", status_code=400)

    result = call_gemini(REPORT_SYSTEM, report_text)

    if not result:
        # Return mock extraction so feature always works for demo
        mock = dict(MOCK_EXTRACTION)
        condition = identify_condition(report_text)
        if condition:
            mock["identified_condition"] = condition
        return ok({"extracted_data": mock, "source": "mock"})

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
        condition = identify_condition(parsed.get("diagnosis", ""))
        if condition:
            parsed["identified_condition"] = condition
        return ok({"extracted_data": parsed, "source": "gemini"})
    
    # Fallback to mock if all parsing fails
    mock = dict(MOCK_EXTRACTION)
    condition = identify_condition(report_text)
    if condition:
        mock["identified_condition"] = condition
    return ok({"extracted_data": mock, "source": "mock"})


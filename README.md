# RehabAI

A medically-calibrated AI platform for knee rehabilitation, built for a 3-person development team.

## Workflow

The system follows a complete rehabilitation workflow:

```
Patient Registration → Medical Report Upload (AI Translated) →
Condition Identification → Exercise Recommendation → Meal Planning →
Webcam Monitoring → Pose Analysis & Form Scoring → Voice Coach AI Feedback →
RPG Gamified Stats Dashboard → ML Recovery Prediction
```

## Architecture

The project is split into three main blocks, executed in parallel:

### 1. Machine Learning & Backend (Person 1)
- **Dataset**: `generate_dataset.py` creates 18,000 synthetic patient records across 10 knee injury types with medically-calibrated recovery curves.
- **ML Models**: 6 Scikit-Learn RandomForest models predicting recovery scores, risk levels, and rehab phases with high accuracy.
- **Backend API**: A Flask REST API (`api/app.py`, `api/predict.py`) serving the ML models with strict schema validation.
- **AI Integration**: Google Gemini 2.0 Flash for generative AI features (`api/claude_config.py` → `call_gemini()`) with robust regex-based JSON extraction.

### 2. Database & Web App (Person 2)
- **Database**: Supabase PostgreSQL (`supabase/schema.sql`) with 15+ tables, Row-Level Security (RLS), and seeded exercise library.
- **Web App**: Built with HTML/CSS/Vanilla JS under `frontend/` and served by Flask at `/app`.
- **RPG Gamification**: 100-point RPG stats (Endurance, Strength, Flexibility, Consistency) with glowing progress bars, custom gradient avatars, and strict realistic cooldown mechanisms (Workout Duration + 1hr) between leveling up.
- **Patient-Friendly Forms**: Clinical assessments are translated into plain-English (e.g., "Knee Bending Angle", "Knee Straightening Gap") for easy daily logging.
- **Smart Form Locking**: Daily check-ins feature auto-locking to prevent duplicate submissions, alongside a seamless "Edit Today's Check-in" workflow.

### 3. AI Features, Pose Tracking & Medical Reporting (Person 3)
- **Voice Coach AI**: A friendly, empathetic fitness assistant that uses voice to motivate patients and generate structured workout plans. Uses resilient parsing to prevent JSON breaking.
- **Meal Planner AI**: Generates 4-5 diverse, structured recipes based *only* on the patient's available ingredients, presented in aesthetic markdown.
- **KNN Gesture Classifier**: A K-Nearest Neighbors machine learning model (`frontend/js/knnClassifier.js`) classifying exercise states.
- **Pose Tracking**: MediaPipe BlazePose Heavy (33 landmarks) via `frontend/js/poseTracker.js` for ML-driven rep counting.
- **Medical Report Extraction**: `api/extract_report.py` — Supports PDF file upload and text input. The AI acts as a **Medical Translator**, rewriting dense medical jargon (e.g., "arthroscopic meniscectomy" → "Minimally invasive meniscus surgery") into plain English, auto-filling the patient profile, and isolating critical movement restrictions.
- **AI Chatbot**: Context-aware rehabilitation assistant (`api/chat.py`) that uses the patient's ML predictions, check-in data, AND exercise session data to provide personalized feedback.

## Getting Started

### 1. Setup Backend (Flask)
```bash
pip install -r api/requirements.txt
pip install -r requirements-dev.txt
# Set Gemini API key for AI features (Mandatory for Voice Coach, Meals, & Reports)
# $env:GEMINI_API_KEY = "your-key"

# Configure env
copy .env.example .env
# Then edit .env and set SUPABASE_URL and SUPABASE_ANON_KEY

python run.py
```
- API runs at `http://127.0.0.1:5000`
- Web app runs at `http://127.0.0.1:5000/app`

### 2. Setup Database (Supabase)
1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL Editor
3. Run `supabase/exercise_sessions.sql` for pose tracking persistence
4. Disable email confirmation in Authentication settings

## Features
- ✅ 10 Knee Injury Types Supported (ACL, PCL, Meniscus, Replacement, etc.)
- ✅ 6 Predictive ML Models (Score, Phase, Risk, Days Left)
- ✅ 15+ Table Relational Database with RLS
- ✅ BlazePose Heavy Webcam Tracking (33 landmarks, per-exercise validation)
- ✅ Medical Report AI (Translates Jargon, Auto-Fills Profile, Extracts Restrictions)
- ✅ Voice Coach AI (Empathetic tone, custom workout generation)
- ✅ AI Meal Planner (Generates 4-5 custom recipes based on available ingredients)
- ✅ RPG Gamification (100-Point stat tracking, Tier-based premium avatars, Cooldown logic)
- ✅ Auto-Locking Daily Check-ins with Edit functionality
- ✅ Patient-Friendly Plain English Assessments
- ✅ Context-Aware AI Chatbot (with exercise session data)
- ✅ 4-Chart Progress Dashboard (Score, Pain, Exercise, Form)
- ✅ Milestone Journey Tracking

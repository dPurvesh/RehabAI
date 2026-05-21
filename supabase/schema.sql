-- ============================================================
-- KneeRevive AI - Complete Supabase Schema
-- 15 Tables + RLS + Triggers + Seed Data
-- ============================================================

-- 1. PROFILES (auto-created on signup)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, email TEXT, avatar_url TEXT,
  role TEXT DEFAULT 'patient' CHECK (role IN ('patient','physio','admin')),
  onboarding_done BOOLEAN DEFAULT FALSE,
  physio_code TEXT UNIQUE,
  physio_specialization TEXT,
  physio_experience_years INTEGER,
  physio_qualification TEXT,
  physio_license TEXT,
  physio_hospital TEXT,
  physio_city TEXT,
  physio_state TEXT,
  physio_phone TEXT,
  physio_bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup (with role + physio_code support)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_code TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  IF v_role = 'physio' THEN
    v_code := 'PHY-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
  END IF;
  INSERT INTO public.profiles (id, full_name, email, role, physio_code, onboarding_done)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.email,
    v_role,
    v_code,
    CASE WHEN v_role = 'physio' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- 2. PATIENT PROFILES
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER CHECK (age BETWEEN 10 AND 100),
  gender TEXT CHECK (gender IN ('male','female','other')),
  weight_kg NUMERIC(5,1), height_cm NUMERIC(5,1), bmi NUMERIC(4,1),
  injury_type TEXT NOT NULL CHECK (injury_type IN ('acl_tear','pcl_tear','mcl_tear','lcl_tear','meniscus_tear','knee_replacement','patellar_tendon','knee_fracture','osteoarthritis','knee_dislocation')),
  injury_severity TEXT CHECK (injury_severity IN ('mild','moderate','severe')),
  surgery_type TEXT CHECK (surgery_type IN ('acl_reconstruction','pcl_reconstruction','ligament_repair','meniscectomy','meniscus_repair','total_knee_replacement','partial_knee_replacement','tendon_repair','fracture_fixation','arthroscopy','conservative_treatment','osteotomy')),
  surgery_date DATE,
  graft_type TEXT DEFAULT 'none' CHECK (graft_type IN ('autograft','allograft','synthetic','none')),
  affected_side TEXT DEFAULT 'right' CHECK (affected_side IN ('left','right','bilateral')),
  comorbidities TEXT DEFAULT 'none' CHECK (comorbidities IN ('none','diabetes','hypertension','obesity','osteoporosis')),
  activity_before_injury TEXT DEFAULT 'moderate' CHECK (activity_before_injury IN ('sedentary','moderate','active','athlete')),
  surgeon_name TEXT, physio_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_select" ON public.patient_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_insert" ON public.patient_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_update" ON public.patient_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER pp_updated BEFORE UPDATE ON public.patient_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto BMI
CREATE OR REPLACE FUNCTION public.calc_bmi()
RETURNS TRIGGER AS $$ BEGIN
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
    NEW.bmi = ROUND((NEW.weight_kg / ((NEW.height_cm / 100.0) ^ 2))::NUMERIC, 1);
  END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER calc_bmi_trigger BEFORE INSERT OR UPDATE ON public.patient_profiles FOR EACH ROW EXECUTE FUNCTION public.calc_bmi();

-- 3. DAILY CHECKINS
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_number INTEGER, pain_level NUMERIC(3,1), swelling_level INTEGER,
  stiffness_level INTEGER, exercises_completed_percent NUMERIC(5,1),
  exercise_duration_mins INTEGER, exercise_difficulty INTEGER, steps_walked INTEGER,
  sleep_hours NUMERIC(3,1), sleep_quality INTEGER, times_woken_up INTEGER,
  rested_feeling INTEGER, fatigue_level INTEGER, mood_score INTEGER,
  medication_taken INTEGER DEFAULT 0, physio_session_today INTEGER DEFAULT 0,
  independence_level INTEGER, ice_applied_today INTEGER DEFAULT 0,
  in_relapse INTEGER DEFAULT 0, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dc_sel" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dc_ins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dc_upd" ON public.daily_checkins FOR UPDATE USING (auth.uid() = user_id);

-- 4. WEEKLY ASSESSMENTS
CREATE TABLE IF NOT EXISTS public.weekly_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_number INTEGER, rom_flexion NUMERIC(5,1), rom_extension_deficit NUMERIC(4,1),
  muscle_strength_score INTEGER, balance_score INTEGER,
  gait_status TEXT CHECK (gait_status IN ('non_weight_bearing','partial','full_assisted','independent')),
  functional_mobility_score NUMERIC(5,1), quad_activation_score INTEGER,
  brace_status TEXT CHECK (brace_status IN ('locked_extension','hinged_limited','hinged_full','none')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, assessment_date)
);
ALTER TABLE public.weekly_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_sel" ON public.weekly_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wa_ins" ON public.weekly_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wa_upd" ON public.weekly_assessments FOR UPDATE USING (auth.uid() = user_id);

-- 5. ML PREDICTIONS
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES public.daily_checkins(id),
  prediction_date DATE DEFAULT CURRENT_DATE,
  recovery_score NUMERIC(5,2), risk_level TEXT, recovery_rate TEXT,
  days_remaining INTEGER, physio_alert BOOLEAN DEFAULT FALSE,
  rehab_phase TEXT, risk_probabilities JSONB, rate_probabilities JSONB,
  phase_probabilities JSONB, physio_alert_confidence NUMERIC(5,4),
  model_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_sel" ON public.ml_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mp_ins" ON public.ml_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. EXERCISE LIBRARY (public read)
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, instructions TEXT,
  target_injury TEXT[] DEFAULT '{}',
  difficulty_level TEXT CHECK (difficulty_level IN ('easy','medium','hard')),
  rehab_phase TEXT CHECK (rehab_phase IN ('protection','mobility','strengthening','functional')),
  duration_secs INTEGER DEFAULT 60, repetitions INTEGER DEFAULT 10, sets INTEGER DEFAULT 3,
  mediapipe_enabled BOOLEAN DEFAULT FALSE, body_parts TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "el_read" ON public.exercise_library FOR SELECT TO authenticated USING (true);

-- 7. EXERCISE PLANS
CREATE TABLE IF NOT EXISTS public.exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE DEFAULT CURRENT_DATE,
  plan_name TEXT, summary TEXT, ai_reasoning TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','skipped')),
  recovery_score NUMERIC(5,2), risk_level TEXT, rehab_phase TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exercise_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ep_sel" ON public.exercise_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ep_ins" ON public.exercise_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ep_upd" ON public.exercise_plans FOR UPDATE USING (auth.uid() = user_id);

-- 8. PLAN EXERCISES (junction)
CREATE TABLE IF NOT EXISTS public.plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.exercise_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercise_library(id),
  order_index INTEGER DEFAULT 0, sets_override INTEGER, reps_override INTEGER,
  notes TEXT, completed BOOLEAN DEFAULT FALSE
);
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pe_sel" ON public.plan_exercises FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.exercise_plans WHERE id = plan_id AND user_id = auth.uid()));
CREATE POLICY "pe_ins" ON public.plan_exercises FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.exercise_plans WHERE id = plan_id AND user_id = auth.uid()));
CREATE POLICY "pe_upd" ON public.plan_exercises FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.exercise_plans WHERE id = plan_id AND user_id = auth.uid()));

-- 9. EXERCISE SESSIONS
CREATE TABLE IF NOT EXISTS public.exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.exercise_plans(id),
  total_duration_secs INTEGER, exercises_done INTEGER, exercises_total INTEGER,
  completion_percent NUMERIC(5,1), avg_form_score NUMERIC(3,1),
  reps_counted INTEGER, pain_after INTEGER, completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "es_sel" ON public.exercise_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "es_ins" ON public.exercise_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. MEDICAL REPORTS
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT, file_url TEXT, file_type TEXT,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending','processing','done','failed')),
  extracted_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr_sel" ON public.medical_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mr_ins" ON public.medical_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mr_upd" ON public.medical_reports FOR UPDATE USING (auth.uid() = user_id);

-- 11. AI CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, role TEXT CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL, tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_sel" ON public.ai_chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cm_ins" ON public.ai_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 12. RECOVERY JOURNEY
CREATE TABLE IF NOT EXISTS public.recovery_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_date DATE DEFAULT CURRENT_DATE,
  milestone_type TEXT, title TEXT, description TEXT,
  recovery_score NUMERIC(5,2), photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.recovery_journey ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rj_sel" ON public.recovery_journey FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rj_ins" ON public.recovery_journey FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 13. EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, relationship TEXT, phone TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_sel" ON public.emergency_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ec_ins" ON public.emergency_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ec_upd" ON public.emergency_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ec_del" ON public.emergency_contacts FOR DELETE USING (auth.uid() = user_id);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT, title TEXT, body TEXT, data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nt_sel" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "nt_ins" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nt_upd" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 15. REHAB PROTOCOLS
CREATE TABLE IF NOT EXISTS public.rehab_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_type TEXT NOT NULL, phase TEXT NOT NULL,
  week_start INTEGER, week_end INTEGER,
  rom_target_flexion INTEGER, rom_target_extension INTEGER,
  weight_bearing TEXT, brace_type TEXT,
  restrictions TEXT[] DEFAULT '{}', goals TEXT[] DEFAULT '{}'
);
ALTER TABLE public.rehab_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp_read" ON public.rehab_protocols FOR SELECT TO authenticated USING (true);

-- 16. PHYSIO-PATIENT LINKING
CREATE TABLE IF NOT EXISTS public.physio_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physio_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(physio_id, patient_id)
);
ALTER TABLE public.physio_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_link_sel" ON public.physio_patients FOR SELECT USING (auth.uid() = physio_id OR auth.uid() = patient_id);
CREATE POLICY "pp_link_ins" ON public.physio_patients FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "pp_link_del" ON public.physio_patients FOR DELETE USING (auth.uid() = physio_id OR auth.uid() = patient_id);

-- 17. MEETING REQUESTS
CREATE TABLE IF NOT EXISTS public.meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_role TEXT NOT NULL CHECK (from_role IN ('physio','patient')),
  message TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr_sel" ON public.meeting_requests FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "mr_ins" ON public.meeting_requests FOR INSERT WITH CHECK (auth.uid() = from_id);
CREATE POLICY "mr_upd" ON public.meeting_requests FOR UPDATE USING (auth.uid() = from_id OR auth.uid() = to_id);

-- Allow physios to read linked patients' profiles and data
CREATE POLICY "physio_read_patient_profiles" ON public.patient_profiles FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = patient_profiles.user_id AND status = 'active')
);
CREATE POLICY "physio_read_checkins" ON public.daily_checkins FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = daily_checkins.user_id AND status = 'active')
);
CREATE POLICY "physio_read_journey" ON public.recovery_journey FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = recovery_journey.user_id AND status = 'active')
);
CREATE POLICY "physio_read_linked_profiles" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = profiles.id AND status = 'active') OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE patient_id = auth.uid() AND physio_id = profiles.id AND status = 'active')
);

-- ============ SEED: EXERCISE LIBRARY ============
INSERT INTO public.exercise_library (name, description, instructions, target_injury, difficulty_level, rehab_phase, repetitions, sets, mediapipe_enabled, body_parts) VALUES
('Quad Sets','Isometric quad contraction','Sit with leg straight. Tighten thigh muscles, push knee down. Hold 5 sec.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","patellar_tendon","knee_fracture","osteoarthritis","knee_dislocation"}','easy','protection',10,3,false,'{"quadriceps"}'),
('Ankle Pumps','Ankle dorsiflexion/plantarflexion','Move foot up and down repeatedly. Promotes circulation.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","patellar_tendon","knee_fracture","osteoarthritis","knee_dislocation"}','easy','protection',20,3,false,'{"ankle","calf"}'),
('Heel Slides','Supine knee flexion','Lie on back. Slide heel toward buttocks bending knee. Return slowly.','{"acl_tear","pcl_tear","meniscus_tear","knee_replacement","osteoarthritis"}','easy','protection',10,3,true,'{"quadriceps","hamstrings"}'),
('Straight Leg Raises','Hip flexion with extended knee','Lie on back, tighten quad, lift leg 12 inches. Hold 3 sec.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","knee_fracture","osteoarthritis","knee_dislocation"}','easy','protection',10,3,true,'{"quadriceps","hip_flexors"}'),
('Prone Knee Flexion','Face-down knee bending','Lie face down. Bend knee bringing heel toward buttocks.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear"}','easy','protection',10,3,true,'{"hamstrings"}'),
('Patellar Mobilization','Kneecap glides','Gently push kneecap up/down/side to side with fingers.','{"acl_tear","pcl_tear","knee_replacement","patellar_tendon","knee_fracture"}','easy','protection',10,2,false,'{"patella"}'),
('Wall Slides','Standing knee flexion against wall','Stand with back against wall. Slowly slide down to 45 degrees.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","osteoarthritis"}','easy','mobility',10,3,true,'{"quadriceps","glutes"}'),
('Short Arc Quads','Terminal knee extension','Place towel roll under knee. Straighten knee fully, hold 3 sec.','{"acl_tear","pcl_tear","knee_replacement","knee_fracture"}','easy','mobility',10,3,false,'{"quadriceps"}'),
('Seated Knee Extension','Open chain extension','Sit on chair. Straighten knee fully. Hold 3 sec. Lower slowly.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","osteoarthritis","knee_dislocation"}','easy','mobility',10,3,true,'{"quadriceps"}'),
('Standing Hamstring Curls','Standing knee flexion','Stand holding support. Bend knee bringing heel to buttocks.','{"acl_tear","pcl_tear","meniscus_tear","mcl_tear","lcl_tear"}','easy','mobility',10,3,true,'{"hamstrings"}'),
('Calf Raises','Standing heel raises','Stand holding support. Rise up on toes. Hold 2 sec. Lower slowly.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","osteoarthritis","knee_dislocation"}','easy','mobility',15,3,true,'{"calf","ankle"}'),
('Stationary Bike','Low resistance cycling','Cycle with no/low resistance for 10-15 min. Adjust seat height.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","osteoarthritis"}','easy','mobility',1,1,false,'{"quadriceps","hamstrings"}'),
('Wall Squats','Isometric squat against wall','Back against wall, feet shoulder-width. Slide to 60 degrees. Hold.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","patellar_tendon","knee_fracture","osteoarthritis","knee_dislocation"}','medium','strengthening',10,3,true,'{"quadriceps","glutes"}'),
('Step-Ups','Forward step onto platform','Step up onto 6-inch step leading with surgical leg. Step down.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","osteoarthritis"}','medium','strengthening',10,3,true,'{"quadriceps","glutes"}'),
('Single Leg Balance','Unilateral stance','Stand on surgical leg. Hold balance 30 sec. Use support if needed.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","knee_dislocation"}','medium','strengthening',5,3,true,'{"ankle","knee","hip"}'),
('Bridges','Supine hip extension','Lie on back, knees bent. Lift hips off floor. Hold 5 sec.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","patellar_tendon","knee_fracture","osteoarthritis","knee_dislocation"}','medium','strengthening',10,3,true,'{"glutes","hamstrings"}'),
('Clamshells','Side-lying hip abduction','Lie on side, knees bent. Open top knee like clamshell. Hold 3 sec.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","osteoarthritis"}','medium','strengthening',15,3,true,'{"hip_abductors","glutes"}'),
('Side-lying Hip Abduction','Lateral leg raise','Lie on side. Lift top leg 18 inches. Hold 3 sec. Lower slowly.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","osteoarthritis","knee_dislocation"}','medium','strengthening',10,3,true,'{"hip_abductors"}'),
('Terminal Knee Extension','Band-resisted extension','Loop band around knee. Step back for tension. Straighten knee.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear"}','medium','strengthening',10,3,true,'{"quadriceps"}'),
('Forward Lunges','Stepping lunge','Step forward into lunge position. Front knee over ankle. Push back.','{"acl_tear","pcl_tear","meniscus_tear","mcl_tear","lcl_tear"}','medium','functional',10,3,true,'{"quadriceps","glutes","hamstrings"}'),
('Single Leg Squat','Unilateral squat','Stand on one leg. Squat to 60 degrees. Return to standing.','{"acl_tear","pcl_tear","meniscus_tear","knee_replacement"}','hard','functional',8,3,true,'{"quadriceps","glutes"}'),
('Lateral Band Walks','Resisted side stepping','Band around ankles. Step sideways maintaining tension. 10 each way.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_replacement","knee_dislocation"}','medium','functional',10,3,true,'{"hip_abductors","glutes"}'),
('Box Jumps Low','Low plyometric jump','Jump onto 6-inch box. Land softly with knees bent. Step down.','{"acl_tear","pcl_tear"}','hard','functional',8,3,true,'{"quadriceps","calf","glutes"}'),
('Bosu Ball Balance','Unstable surface balance','Stand on Bosu ball. Maintain balance 30 sec. Progress to eyes closed.','{"acl_tear","pcl_tear","mcl_tear","lcl_tear","meniscus_tear","knee_dislocation"}','hard','functional',5,3,true,'{"ankle","knee","core"}'),
('Plyometric Jumps','Jump and land training','Two-footed jump forward/lateral. Land softly. For return-to-sport.','{"acl_tear","pcl_tear"}','hard','functional',8,3,true,'{"quadriceps","calf","glutes"}');

-- ============ SEED: REHAB PROTOCOLS ============
INSERT INTO public.rehab_protocols (injury_type, phase, week_start, week_end, rom_target_flexion, rom_target_extension, weight_bearing, brace_type, restrictions, goals) VALUES
('acl_tear','protection',0,6,90,0,'partial','hinged_limited','{"no open chain extension","no pivoting","no running"}','{"achieve 90 flexion","full extension","quad activation"}'),
('acl_tear','mobility',6,12,125,0,'full_assisted','hinged_full','{"no cutting movements","no contact sports"}','{"normalize gait","120+ flexion","light strengthening"}'),
('acl_tear','strengthening',12,24,140,0,'independent','none','{"no plyometrics until cleared"}','{"full ROM","single leg balance","quad strength symmetry"}'),
('acl_tear','functional',24,52,140,0,'independent','none','{}','{"return to sport","agility drills","plyometrics"}'),
('knee_replacement','protection',0,6,90,0,'full_assisted','hinged_limited','{"no kneeling on surgical knee","no high impact"}','{"90 flexion","independent walking with aid","reduce swelling"}'),
('knee_replacement','mobility',6,12,110,0,'independent','none','{"no running","no jumping"}','{"110+ flexion","stair climbing","stationary bike"}'),
('knee_replacement','strengthening',12,24,120,0,'independent','none','{"no high impact sports"}','{"full strength","normal gait","return to daily activities"}'),
('knee_replacement','functional',24,52,120,0,'independent','none','{}','{"maintain ROM","low impact activities","long term health"}'),
('meniscus_tear','protection',0,6,90,0,'partial','hinged_limited','{"no deep squats","no twisting"}','{"reduce swelling","gentle ROM","quad activation"}'),
('meniscus_tear','mobility',6,12,130,0,'full_assisted','none','{"no pivoting sports"}','{"full ROM","normal gait","light strengthening"}'),
('meniscus_tear','strengthening',12,18,140,0,'independent','none','{}','{"full strength","balance training","sport-specific prep"}'),
('meniscus_tear','functional',18,26,140,0,'independent','none','{}','{"return to sport","agility","plyometrics"}');

-- =========================================
-- PHYSIO PORTAL MIGRATION
-- Run this in your Supabase SQL Editor
-- =========================================

-- 1. Add physio_code and professional profile columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_specialization TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_experience_years INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_qualification TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_license TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_hospital TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS physio_bio TEXT;

-- 2. Update the signup trigger to support physio role + auto-generate physio_code
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

-- 3. Create physio_patients linking table
CREATE TABLE IF NOT EXISTS public.physio_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physio_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(physio_id, patient_id)
);
ALTER TABLE public.physio_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pp_link_sel" ON public.physio_patients;
DROP POLICY IF EXISTS "pp_link_ins" ON public.physio_patients;
DROP POLICY IF EXISTS "pp_link_del" ON public.physio_patients;
CREATE POLICY "pp_link_sel" ON public.physio_patients FOR SELECT USING (auth.uid() = physio_id OR auth.uid() = patient_id);
CREATE POLICY "pp_link_ins" ON public.physio_patients FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "pp_link_del" ON public.physio_patients FOR DELETE USING (auth.uid() = physio_id OR auth.uid() = patient_id);

-- 4. Create meeting_requests table
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
DROP POLICY IF EXISTS "mr_sel" ON public.meeting_requests;
DROP POLICY IF EXISTS "mr_ins" ON public.meeting_requests;
DROP POLICY IF EXISTS "mr_upd" ON public.meeting_requests;
CREATE POLICY "mr_sel" ON public.meeting_requests FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "mr_ins" ON public.meeting_requests FOR INSERT WITH CHECK (auth.uid() = from_id);
CREATE POLICY "mr_upd" ON public.meeting_requests FOR UPDATE USING (auth.uid() = from_id OR auth.uid() = to_id);

-- 5. Allow physios to read linked patients' data (add extra SELECT policies)
DROP POLICY IF EXISTS "physio_read_patient_profiles" ON public.patient_profiles;
CREATE POLICY "physio_read_patient_profiles" ON public.patient_profiles FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = patient_profiles.user_id AND status = 'active')
);

DROP POLICY IF EXISTS "physio_read_checkins" ON public.daily_checkins;
CREATE POLICY "physio_read_checkins" ON public.daily_checkins FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = daily_checkins.user_id AND status = 'active')
);

DROP POLICY IF EXISTS "physio_read_journey" ON public.recovery_journey;
CREATE POLICY "physio_read_journey" ON public.recovery_journey FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = recovery_journey.user_id AND status = 'active')
);

DROP POLICY IF EXISTS "physio_read_linked_profiles" ON public.profiles;
CREATE POLICY "physio_read_linked_profiles" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = profiles.id AND status = 'active') OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE patient_id = auth.uid() AND physio_id = profiles.id AND status = 'active')
);

-- 6. RPC function to look up a physio by code (bypasses RLS so patients can find them)
CREATE OR REPLACE FUNCTION public.lookup_physio_by_code(p_code TEXT)
RETURNS TABLE(id UUID, full_name TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT profiles.id, profiles.full_name
    FROM public.profiles
    WHERE profiles.physio_code = p_code AND profiles.role = 'physio'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Physio Portal is now ready.

-- 7. Allow physios to read linked patients' ML predictions
DROP POLICY IF EXISTS "physio_read_predictions" ON public.ml_predictions;
CREATE POLICY "physio_read_predictions" ON public.ml_predictions FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.physio_patients WHERE physio_id = auth.uid() AND patient_id = ml_predictions.user_id AND status = 'active')
);

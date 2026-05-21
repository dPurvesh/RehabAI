-- Exercise Sessions table for RehabAI
-- Stores webcam pose tracking session data for each exercise

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  profile_key TEXT NOT NULL DEFAULT 'generic',
  reps_completed INTEGER NOT NULL DEFAULT 0,
  target_reps INTEGER NOT NULL DEFAULT 10,
  min_angle NUMERIC(5,1),
  max_angle NUMERIC(5,1),
  avg_form_score INTEGER DEFAULT 0,
  duration_secs INTEGER DEFAULT 0,
  issues TEXT[] DEFAULT '{}',
  angle_samples NUMERIC(5,1)[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying user sessions
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user
  ON exercise_sessions(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see and insert their own sessions
CREATE POLICY "Users can view own sessions"
  ON exercise_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON exercise_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON exercise_sessions FOR DELETE
  USING (auth.uid() = user_id);

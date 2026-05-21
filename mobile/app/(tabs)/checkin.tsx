import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { predict } from '@/lib/api';
import { useRouter } from 'expo-router';

export default function CheckinScreen() {
  const { user, patientProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    pain_level: '3', swelling_level: '2', stiffness_level: '2',
    exercises_completed_percent: '80', exercise_duration_mins: '25',
    exercise_difficulty: '2', steps_walked: '2000',
    sleep_hours: '7', sleep_quality: '4', times_woken_up: '1', rested_feeling: '4',
    fatigue_level: '3', mood_score: '4',
    medication_taken: '0', physio_session_today: '0',
    independence_level: '3', ice_applied_today: '1',
    notes: '',
  });

  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!user || !patientProfile) return Alert.alert('Error', 'Profile not loaded');
    setLoading(true);
    try {
      // Calculate day number
      const surgeryDate = new Date(patientProfile.surgery_date);
      const today = new Date();
      const dayNumber = Math.max(1, Math.ceil((today.getTime() - surgeryDate.getTime()) / 86400000));

      // Save check-in to Supabase
      const checkinData = {
        user_id: user.id, checkin_date: today.toISOString().split('T')[0],
        day_number: dayNumber, pain_level: Number(f.pain_level),
        swelling_level: Number(f.swelling_level), stiffness_level: Number(f.stiffness_level),
        exercises_completed_percent: Number(f.exercises_completed_percent),
        exercise_duration_mins: Number(f.exercise_duration_mins),
        exercise_difficulty: Number(f.exercise_difficulty), steps_walked: Number(f.steps_walked),
        sleep_hours: Number(f.sleep_hours), sleep_quality: Number(f.sleep_quality),
        times_woken_up: Number(f.times_woken_up), rested_feeling: Number(f.rested_feeling),
        fatigue_level: Number(f.fatigue_level), mood_score: Number(f.mood_score),
        medication_taken: Number(f.medication_taken), physio_session_today: Number(f.physio_session_today),
        independence_level: Number(f.independence_level), ice_applied_today: Number(f.ice_applied_today),
        notes: f.notes || null,
      };

      const { data: checkin, error: cErr } = await supabase.from('daily_checkins')
        .upsert(checkinData, { onConflict: 'user_id,checkin_date' }).select().single();
      if (cErr) throw cErr;

      // Get latest weekly assessment (or defaults)
      const { data: assessment } = await supabase.from('weekly_assessments').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();

      // Build prediction payload
      const payload: Record<string, any> = {
        age: patientProfile.age, gender: patientProfile.gender,
        weight_kg: patientProfile.weight_kg, height_cm: patientProfile.height_cm,
        bmi: patientProfile.bmi, injury_type: patientProfile.injury_type,
        surgery_type: patientProfile.surgery_type, severity: patientProfile.injury_severity,
        comorbidity: patientProfile.comorbidities, activity: patientProfile.activity_before_injury,
        graft_type: patientProfile.graft_type || 'none',
        affected_side: patientProfile.affected_side || 'right',
        day_number: dayNumber, ...checkinData,
        range_of_motion_flexion: assessment?.rom_flexion ?? 45,
        range_of_motion_extension: assessment?.rom_extension_deficit ?? 8,
        muscle_strength_score: assessment?.muscle_strength_score ?? 2,
        balance_score: assessment?.balance_score ?? 2,
        gait_status: assessment?.gait_status ?? 'partial',
        functional_mobility_score: assessment?.functional_mobility_score ?? 40,
        quad_activation_score: assessment?.quad_activation_score ?? 2,
        brace_status: assessment?.brace_status ?? 'hinged_limited',
        pain_trend_7day: 0, exercise_trend_7day: 0, sleep_trend_7day: 0, in_relapse: 0,
      };

      // Call Flask API
      const result = await predict(payload);
      if (result.status !== 'success') throw new Error(result.errors?.join(', ') || 'Prediction failed');

      // Save prediction
      const p = result.predictions;
      await supabase.from('ml_predictions').insert({
        user_id: user.id, checkin_id: checkin.id,
        recovery_score: p.recovery_score, risk_level: p.risk_level,
        recovery_rate: p.recovery_rate, days_remaining: p.days_remaining,
        physio_alert: p.physio_alert, rehab_phase: p.rehab_phase,
        risk_probabilities: p.risk_probabilities, rate_probabilities: p.rate_probabilities,
        phase_probabilities: p.phase_probabilities,
        physio_alert_confidence: p.physio_alert_confidence,
      });

      Alert.alert('Check-in Complete!',
        `Recovery Score: ${p.recovery_score}\nRisk: ${p.risk_level}\nPhase: ${p.rehab_phase}`,
        [{ text: 'View Dashboard', onPress: () => router.push('/(tabs)/dashboard') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <Text style={s.title}>Daily Check-in</Text>
        <Text style={s.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <Section title="Pain & Symptoms">
        <SliderRow label="Pain Level" value={f.pain_level} onChange={v => set('pain_level', v)} min={0} max={10} step={0.5} />
        <SliderRow label="Swelling" value={f.swelling_level} onChange={v => set('swelling_level', v)} min={1} max={5} />
        <SliderRow label="Stiffness" value={f.stiffness_level} onChange={v => set('stiffness_level', v)} min={1} max={5} />
        <SliderRow label="Fatigue" value={f.fatigue_level} onChange={v => set('fatigue_level', v)} min={1} max={10} />
        <SliderRow label="Mood" value={f.mood_score} onChange={v => set('mood_score', v)} min={1} max={5} />
      </Section>

      <Section title="Exercise">
        <SliderRow label="Completion %" value={f.exercises_completed_percent} onChange={v => set('exercises_completed_percent', v)} min={0} max={100} step={5} />
        <SliderRow label="Duration (min)" value={f.exercise_duration_mins} onChange={v => set('exercise_duration_mins', v)} min={0} max={90} step={5} />
        <SliderRow label="Difficulty" value={f.exercise_difficulty} onChange={v => set('exercise_difficulty', v)} min={1} max={5} />
        <NumField label="Steps Walked" value={f.steps_walked} onChange={v => set('steps_walked', v)} />
      </Section>

      <Section title="Sleep">
        <SliderRow label="Hours" value={f.sleep_hours} onChange={v => set('sleep_hours', v)} min={0} max={12} step={0.5} />
        <SliderRow label="Quality" value={f.sleep_quality} onChange={v => set('sleep_quality', v)} min={1} max={5} />
        <SliderRow label="Times Woken" value={f.times_woken_up} onChange={v => set('times_woken_up', v)} min={0} max={10} />
        <SliderRow label="Rested Feeling" value={f.rested_feeling} onChange={v => set('rested_feeling', v)} min={1} max={5} />
      </Section>

      <Section title="Medical">
        <ToggleRow label="Medication Taken" value={f.medication_taken} onChange={v => set('medication_taken', v)} />
        <ToggleRow label="Physio Today" value={f.physio_session_today} onChange={v => set('physio_session_today', v)} />
        <ToggleRow label="Ice Applied" value={f.ice_applied_today} onChange={v => set('ice_applied_today', v)} />
        <SliderRow label="Independence" value={f.independence_level} onChange={v => set('independence_level', v)} min={1} max={5} />
      </Section>

      <View style={s.pad}>
        <Text style={s.label}>Notes (optional)</Text>
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={f.notes}
          onChangeText={v => set('notes', v)} placeholder="How are you feeling today?"
          placeholderTextColor={Colors.textMuted} multiline />
      </View>

      <View style={s.pad}>
        <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Submitting...' : 'Submit Check-in & Get Prediction'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SliderRow({ label, value, onChange, min, max, step = 1 }: any) {
  const num = Number(value);
  return (
    <View style={s.sliderRow}>
      <Text style={s.sliderLabel}>{label}</Text>
      <View style={s.sliderControls}>
        <TouchableOpacity style={s.sliderBtn} onPress={() => onChange(String(Math.max(min, num - step)))}>
          <Text style={s.sliderBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.sliderValue}>{value}</Text>
        <TouchableOpacity style={s.sliderBtn} onPress={() => onChange(String(Math.min(max, num + step)))}>
          <Text style={s.sliderBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: any) {
  return (
    <TouchableOpacity style={s.toggleRow} onPress={() => onChange(value === '1' ? '0' : '1')}>
      <Text style={s.sliderLabel}>{label}</Text>
      <View style={[s.toggle, value === '1' && s.toggleOn]}>
        <Text style={s.toggleText}>{value === '1' ? 'YES' : 'NO'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function NumField({ label, value, onChange }: any) {
  return (
    <View style={s.sliderRow}>
      <Text style={s.sliderLabel}>{label}</Text>
      <TextInput style={s.numInput} value={value} onChangeText={onChange} keyboardType="numeric" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  section: { backgroundColor: Colors.bgCard, margin: 16, marginBottom: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  pad: { paddingHorizontal: 16 },
  label: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 16, color: Colors.textPrimary },
  btn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sliderLabel: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  sliderControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgInput, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  sliderBtnText: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  sliderValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, minWidth: 40, textAlign: 'center' },
  numInput: { backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 8, fontSize: 16, color: Colors.textPrimary, width: 80, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  toggle: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  toggleOn: { backgroundColor: Colors.primaryDark, borderColor: Colors.primary },
  toggleText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
});

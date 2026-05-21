import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const INJURIES = ['acl_tear','pcl_tear','mcl_tear','lcl_tear','meniscus_tear','knee_replacement','patellar_tendon','knee_fracture','osteoarthritis','knee_dislocation'];
const SURGERIES = ['acl_reconstruction','pcl_reconstruction','ligament_repair','meniscectomy','meniscus_repair','total_knee_replacement','partial_knee_replacement','tendon_repair','fracture_fixation','arthroscopy','conservative_treatment','osteotomy'];
const SEVERITIES = ['mild','moderate','severe'];
const GENDERS = ['male','female','other'];
const GRAFTS = ['autograft','allograft','synthetic','none'];
const SIDES = ['left','right','bilateral'];
const COMORBIDITIES = ['none','diabetes','hypertension','obesity','osteoporosis'];
const ACTIVITIES = ['sedentary','moderate','active','athlete'];

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    age: '', gender: 'male', weight_kg: '', height_cm: '',
    injury_type: 'acl_tear', injury_severity: 'moderate', surgery_type: 'acl_reconstruction',
    surgery_date: '', graft_type: 'autograft', affected_side: 'right',
    comorbidities: 'none', activity_before_injury: 'moderate',
    surgeon_name: '', physio_name: '',
  });

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const bmi = form.weight_kg && form.height_cm
    ? (Number(form.weight_kg) / ((Number(form.height_cm) / 100) ** 2)).toFixed(1) : '--';

  const handleSubmit = async () => {
    if (!form.age || !form.weight_kg || !form.height_cm) return Alert.alert('Error', 'Fill in all required fields');
    if (!form.surgery_date) return Alert.alert('Error', 'Enter surgery date');
    setLoading(true);
    try {
      const { error: ppError } = await supabase.from('patient_profiles').upsert({
        user_id: user!.id, age: Number(form.age), gender: form.gender,
        weight_kg: Number(form.weight_kg), height_cm: Number(form.height_cm),
        injury_type: form.injury_type, injury_severity: form.injury_severity,
        surgery_type: form.surgery_type, surgery_date: form.surgery_date,
        graft_type: form.graft_type, affected_side: form.affected_side,
        comorbidities: form.comorbidities, activity_before_injury: form.activity_before_injury,
        surgeon_name: form.surgeon_name || null, physio_name: form.physio_name || null,
      }, { onConflict: 'user_id' });
      if (ppError) throw ppError;

      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user!.id);
      await refreshProfile();
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <Text style={s.title}>Setup Your Profile</Text>
        <Text style={s.subtitle}>Step {step} of 3</Text>
        <View style={s.dots}>
          {[1,2,3].map(i => <View key={i} style={[s.dot, step >= i && s.dotActive]} />)}
        </View>
      </View>

      {step === 1 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Personal Information</Text>
          <Field label="Age *" value={form.age} onChange={v => set('age', v)} keyboard="numeric" placeholder="e.g. 32" />
          <PickerField label="Gender" options={GENDERS} value={form.gender} onChange={v => set('gender', v)} />
          <Field label="Weight (kg) *" value={form.weight_kg} onChange={v => set('weight_kg', v)} keyboard="numeric" placeholder="e.g. 75" />
          <Field label="Height (cm) *" value={form.height_cm} onChange={v => set('height_cm', v)} keyboard="numeric" placeholder="e.g. 178" />
          <View style={s.bmiBox}>
            <Text style={s.bmiLabel}>Calculated BMI</Text>
            <Text style={s.bmiValue}>{bmi}</Text>
          </View>
          <TouchableOpacity style={s.btn} onPress={() => {
            if (!form.age || !form.weight_kg || !form.height_cm) return Alert.alert('Error', 'Fill all fields');
            setStep(2);
          }}>
            <Text style={s.btnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Knee Injury Details</Text>
          <PickerField label="Injury Type *" options={INJURIES} value={form.injury_type} onChange={v => set('injury_type', v)} />
          <PickerField label="Severity" options={SEVERITIES} value={form.injury_severity} onChange={v => set('injury_severity', v)} />
          <PickerField label="Surgery Type" options={SURGERIES} value={form.surgery_type} onChange={v => set('surgery_type', v)} />
          <PickerField label="Graft Type" options={GRAFTS} value={form.graft_type} onChange={v => set('graft_type', v)} />
          <PickerField label="Affected Side" options={SIDES} value={form.affected_side} onChange={v => set('affected_side', v)} />
          <Field label="Surgery Date *" value={form.surgery_date} onChange={v => set('surgery_date', v)} placeholder="YYYY-MM-DD" />
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => setStep(1)}>
              <Text style={[s.btnText, { color: Colors.primary }]}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btn} onPress={() => {
              if (!form.surgery_date) return Alert.alert('Error', 'Enter surgery date');
              setStep(3);
            }}>
              <Text style={s.btnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Medical History</Text>
          <PickerField label="Comorbidities" options={COMORBIDITIES} value={form.comorbidities} onChange={v => set('comorbidities', v)} />
          <PickerField label="Activity Level (Before Injury)" options={ACTIVITIES} value={form.activity_before_injury} onChange={v => set('activity_before_injury', v)} />
          <Field label="Surgeon Name" value={form.surgeon_name} onChange={v => set('surgeon_name', v)} placeholder="Optional" />
          <Field label="Physio Name" value={form.physio_name} onChange={v => set('physio_name', v)} placeholder="Optional" />
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => setStep(2)}>
              <Text style={[s.btnText, { color: Colors.primary }]}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
              <Text style={s.btnText}>{loading ? 'Saving...' : 'Complete Setup ✓'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard }: any) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={Colors.textMuted}
        keyboardType={keyboard || 'default'} />
    </View>
  );
}

function PickerField({ label, options, value, onChange }: any) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.pickerRow}>
        {options.map((opt: string) => (
          <TouchableOpacity key={opt}
            style={[s.chip, value === opt && s.chipActive]}
            onPress={() => onChange(opt)}>
            <Text style={[s.chipText, value === opt && s.chipTextActive]}>
              {opt.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 14, fontSize: 16, color: Colors.textPrimary },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.bgInput,
    borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white, fontWeight: '600' },
  btn: { flex: 1, backgroundColor: Colors.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 12 },
  bmiBox: { backgroundColor: Colors.bgCard, padding: 14, borderRadius: 10, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  bmiLabel: { fontSize: 13, color: Colors.textSecondary },
  bmiValue: { fontSize: 20, fontWeight: '700', color: Colors.accent },
});

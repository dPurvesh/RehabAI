import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function WeeklyAssessmentScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    rom_flexion: '90', rom_extension_deficit: '5',
    muscle_strength_score: '3', balance_score: '3',
    gait_status: 'partial', functional_mobility_score: '55',
    quad_activation_score: '3', brace_status: 'hinged_limited',
  });
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('weekly_assessments').upsert({
        user_id: user!.id, assessment_date: new Date().toISOString().split('T')[0],
        week_number: Math.ceil(Number(f.rom_flexion) / 7),
        rom_flexion: Number(f.rom_flexion), rom_extension_deficit: Number(f.rom_extension_deficit),
        muscle_strength_score: Number(f.muscle_strength_score), balance_score: Number(f.balance_score),
        gait_status: f.gait_status, functional_mobility_score: Number(f.functional_mobility_score),
        quad_activation_score: Number(f.quad_activation_score), brace_status: f.brace_status,
      }, { onConflict: 'user_id,assessment_date' });
      if (error) throw error;
      Alert.alert('Saved!', 'Weekly assessment recorded.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setLoading(false);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{paddingBottom:40}}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Weekly Assessment</Text>
        <Text style={s.subtitle}>Clinical measurements</Text>
      </View>
      <View style={s.card}>
        <SliderRow label="ROM Flexion (°)" value={f.rom_flexion} onChange={v=>set('rom_flexion',v)} min={0} max={160} step={5} />
        <SliderRow label="Extension Deficit (°)" value={f.rom_extension_deficit} onChange={v=>set('rom_extension_deficit',v)} min={0} max={20} />
        <SliderRow label="Strength (1-5)" value={f.muscle_strength_score} onChange={v=>set('muscle_strength_score',v)} min={1} max={5} />
        <SliderRow label="Balance (1-5)" value={f.balance_score} onChange={v=>set('balance_score',v)} min={1} max={5} />
        <SliderRow label="Mobility Score" value={f.functional_mobility_score} onChange={v=>set('functional_mobility_score',v)} min={0} max={100} step={5} />
        <SliderRow label="Quad Activation (1-5)" value={f.quad_activation_score} onChange={v=>set('quad_activation_score',v)} min={1} max={5} />
        <PickField label="Gait Status" options={['non_weight_bearing','partial','full_assisted','independent']} value={f.gait_status} onChange={v=>set('gait_status',v)} />
        <PickField label="Brace Status" options={['locked_extension','hinged_limited','hinged_full','none']} value={f.brace_status} onChange={v=>set('brace_status',v)} />
      </View>
      <View style={{paddingHorizontal:16}}>
        <TouchableOpacity style={[s.btn, loading&&{opacity:0.5}]} onPress={handleSubmit} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Saving...' : 'Save Assessment'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SliderRow({label,value,onChange,min,max,step=1}:any) {
  const n = Number(value);
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.controls}>
        <TouchableOpacity style={s.ctrlBtn} onPress={()=>onChange(String(Math.max(min,n-step)))}><Text style={s.ctrlText}>−</Text></TouchableOpacity>
        <Text style={s.val}>{value}</Text>
        <TouchableOpacity style={s.ctrlBtn} onPress={()=>onChange(String(Math.min(max,n+step)))}><Text style={s.ctrlText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function PickField({label,options,value,onChange}:any) {
  return (
    <View style={{marginTop:12}}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:6}}>
        {options.map((o:string)=>(
          <TouchableOpacity key={o} style={[s.chip,value===o&&s.chipActive]} onPress={()=>onChange(o)}>
            <Text style={[s.chipText,value===o&&{color:Colors.white}]}>{o.replace(/_/g,' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:24,paddingTop:60},
  back:{color:Colors.primary,fontSize:14,fontWeight:'600',marginBottom:8},
  title:{fontSize:26,fontWeight:'800',color:Colors.textPrimary},
  subtitle:{fontSize:13,color:Colors.textSecondary,marginTop:4},
  card:{backgroundColor:Colors.bgCard,margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.border},
  rowLabel:{fontSize:14,color:Colors.textPrimary},
  controls:{flexDirection:'row',alignItems:'center',gap:10},
  ctrlBtn:{width:36,height:36,borderRadius:18,backgroundColor:Colors.bgInput,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:Colors.border},
  ctrlText:{fontSize:18,color:Colors.primary,fontWeight:'700'},
  val:{fontSize:18,fontWeight:'700',color:Colors.textPrimary,minWidth:40,textAlign:'center'},
  chip:{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border},
  chipActive:{backgroundColor:Colors.primaryDark,borderColor:Colors.primary},
  chipText:{fontSize:11,color:Colors.textSecondary,textTransform:'capitalize'},
  btn:{backgroundColor:Colors.primary,padding:18,borderRadius:12,alignItems:'center',marginTop:16},
  btnText:{color:Colors.white,fontSize:16,fontWeight:'700'},
});

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function JourneyScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', milestone_type: 'achievement' });

  useEffect(() => { fetchMilestones(); }, []);

  const fetchMilestones = async () => {
    const { data } = await supabase.from('recovery_journey').select('*').eq('user_id', user!.id).order('milestone_date', { ascending: false });
    if (data) setMilestones(data);
  };

  const addMilestone = async () => {
    if (!form.title) return Alert.alert('Error', 'Title is required');
    await supabase.from('recovery_journey').insert({ user_id: user!.id, ...form, milestone_date: new Date().toISOString().split('T')[0] });
    setShowAdd(false); setForm({ title: '', description: '', milestone_type: 'achievement' });
    fetchMilestones();
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Recovery Journey</Text>
      </View>

      <View style={s.timeline}>
        {milestones.map((m, i) => (
          <View key={m.id} style={s.item}>
            <View style={s.line} />
            <View style={[s.dot, m.milestone_type === 'achievement' ? { backgroundColor: Colors.success } : { backgroundColor: Colors.primary }]} />
            <View style={s.card}>
              <Text style={s.date}>{new Date(m.milestone_date).toLocaleDateString()}</Text>
              <Text style={s.itemTitle}>{m.title}</Text>
              {m.description ? <Text style={s.desc}>{m.description}</Text> : null}
            </View>
          </View>
        ))}
        {milestones.length === 0 && (
          <View style={{alignItems:'center',padding:40}}><Text style={{color:Colors.textMuted}}>No milestones yet. Celebrate small wins!</Text></View>
        )}
      </View>

      {showAdd ? (
        <View style={s.addCard}>
          <TextInput style={s.input} placeholder="E.g., Walked without crutches!" placeholderTextColor={Colors.textMuted} value={form.title} onChangeText={v => setForm(p=>({...p,title:v}))} />
          <TextInput style={[s.input, {height:80, textAlignVertical:'top'}]} placeholder="How did it feel?" placeholderTextColor={Colors.textMuted} value={form.description} onChangeText={v => setForm(p=>({...p,description:v}))} multiline />
          <View style={s.typeRow}>
            {['achievement', 'clinical_milestone', 'personal_goal'].map(t => (
              <TouchableOpacity key={t} style={[s.typeChip, form.milestone_type === t && s.typeChipActive]} onPress={() => setForm(p=>({...p,milestone_type:t}))}>
                <Text style={[s.typeText, form.milestone_type === t && s.typeTextActive]}>{t.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{flexDirection:'row',gap:8,marginTop:12}}>
            <TouchableOpacity style={[s.btn,{flex:1,backgroundColor:'transparent',borderWidth:1,borderColor:Colors.border}]} onPress={()=>setShowAdd(false)}><Text style={[s.btnText,{color:Colors.textSecondary}]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,{flex:1}]} onPress={addMilestone}><Text style={s.btnText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}><Text style={s.addBtnText}>+ Log Milestone</Text></TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:24,paddingTop:60},
  back:{color:Colors.primary,fontSize:14,fontWeight:'600',marginBottom:8},
  title:{fontSize:26,fontWeight:'800',color:Colors.textPrimary},
  timeline:{padding:20},
  item:{flexDirection:'row',marginBottom:20},
  line:{position:'absolute',left:11,top:24,bottom:-24,width:2,backgroundColor:Colors.border},
  dot:{width:24,height:24,borderRadius:12,borderWidth:4,borderColor:Colors.bgPrimary,marginRight:16},
  card:{flex:1,backgroundColor:Colors.bgCard,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border},
  date:{fontSize:11,color:Colors.textSecondary,fontWeight:'700',marginBottom:4},
  itemTitle:{fontSize:16,fontWeight:'700',color:Colors.textPrimary},
  desc:{fontSize:13,color:Colors.textSecondary,marginTop:4},
  addCard:{backgroundColor:Colors.bgCard,margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.primary,gap:10},
  input:{backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border,borderRadius:10,padding:12,fontSize:15,color:Colors.textPrimary},
  typeRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:4},
  typeChip:{paddingHorizontal:12,paddingVertical:6,borderRadius:16,backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border},
  typeChipActive:{backgroundColor:Colors.primaryDark,borderColor:Colors.primary},
  typeText:{fontSize:11,color:Colors.textSecondary,textTransform:'capitalize'},
  typeTextActive:{color:Colors.white,fontWeight:'600'},
  btn:{backgroundColor:Colors.primary,padding:14,borderRadius:10,alignItems:'center'},
  btnText:{color:Colors.white,fontWeight:'700',fontSize:15},
  addBtn:{margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border,borderStyle:'dashed',alignItems:'center'},
  addBtnText:{color:Colors.primary,fontWeight:'700',fontSize:15},
});

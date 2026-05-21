import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { generatePlan } from '@/lib/api';

const PHASES = ['all','protection','mobility','strengthening','functional'];

export default function ExercisesScreen() {
  const { patientProfile } = useAuth();
  const router = useRouter();
  const [exercises, setExercises] = useState<any[]>([]);
  const [phase, setPhase] = useState('all');
  const [search, setSearch] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [aiPlan, setAiPlan] = useState<any>(null);

  useEffect(() => { fetchExercises(); }, []);

  const fetchExercises = async () => {
    const { data } = await supabase.from('exercise_library').select('*').order('name');
    if (data) setExercises(data);
  };

  const injury = patientProfile?.injury_type || '';
  const filtered = exercises.filter(e => {
    if (phase !== 'all' && e.rehab_phase !== phase) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (injury && e.target_injury && !e.target_injury.includes(injury)) return false;
    return true;
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Exercise Library</Text>
        <Text style={s.subtitle}>{filtered.length} exercises for {injury?.replace(/_/g,' ') || 'your injury'}</Text>
      </View>

      <View style={s.searchBox}>
        <TextInput style={s.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search exercises..." placeholderTextColor={Colors.textMuted} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={{paddingHorizontal:16,gap:8}}>
        {PHASES.map(p => (
          <TouchableOpacity key={p} style={[s.tab, phase === p && s.tabActive]} onPress={() => setPhase(p)}>
            <Text style={[s.tabText, phase === p && s.tabTextActive]}>{p === 'all' ? 'All' : p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* AI Daily Plan Section */}
      <View style={{paddingHorizontal: 16, marginBottom: 12}}>
        <TouchableOpacity 
          style={{backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center'}}
          onPress={async () => {
            if (aiPlan) { setAiPlan(null); return; }
            setLoadingPlan(true);
            try {
              const res = await generatePlan(patientProfile || {});
              setAiPlan(res.plan || { error: 'Failed to generate plan' });
            } catch (e) {
              setAiPlan({ error: 'Failed to fetch plan' });
            } finally {
              setLoadingPlan(false);
            }
          }}
        >
          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 15}}>
            {loadingPlan ? '🤖 Generating Plan...' : aiPlan ? 'Close AI Plan' : '🤖 Get Today\'s AI Plan'}
          </Text>
        </TouchableOpacity>

        {aiPlan && !aiPlan.error && (
          <View style={{marginTop: 12, backgroundColor: Colors.bgCard, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.accent}}>
            <Text style={{color: Colors.accent, fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>🤖 Your Personalized Plan</Text>
            <Text style={{color: Colors.textPrimary, fontSize: 14, marginBottom: 4}}><Text style={{fontWeight: 'bold'}}>Phase:</Text> {aiPlan.phase}</Text>
            <Text style={{color: Colors.textSecondary, fontSize: 14, marginBottom: 12}}>{aiPlan.rationale}</Text>
            <Text style={{color: Colors.textPrimary, fontWeight: 'bold', marginBottom: 4}}>Exercises for today:</Text>
            {aiPlan.exercises?.map((ex: any, i: number) => (
              <View key={i} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                <Text style={{color: Colors.success, marginRight: 8}}>•</Text>
                <Text style={{color: Colors.textPrimary, flex: 1}}>{ex.name}</Text>
                <Text style={{color: Colors.textMuted, fontSize: 12}}>{ex.sets}x{ex.reps}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView style={s.list} contentContainerStyle={{paddingBottom:100}}>
        {filtered.map(ex => (
          <View key={ex.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardName}>{ex.name}</Text>
              {ex.mediapipe_enabled && <Text style={s.mpBadge}>📹 MediaPipe</Text>}
            </View>
            <Text style={s.cardDesc} numberOfLines={2}>{ex.description}</Text>
            <View style={s.cardMeta}>
              <View style={[s.badge, {backgroundColor: ex.difficulty_level==='easy'?'#065f46':ex.difficulty_level==='medium'?'#78350f':'#7f1d1d'}]}>
                <Text style={s.badgeText}>{ex.difficulty_level}</Text>
              </View>
              <Text style={s.metaText}>{ex.sets}×{ex.repetitions} reps</Text>
              <View style={[s.badge, {backgroundColor: Colors.bgInput}]}>
                <Text style={s.badgeText}>{ex.rehab_phase}</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
              <TouchableOpacity style={[s.expandBtn, {flex: 1}]} onPress={() => {/* toggle instructions */}}>
                <Text style={s.expandText}>View Instructions</Text>
              </TouchableOpacity>
              {ex.mediapipe_enabled && (
                <TouchableOpacity 
                  style={[s.expandBtn, {flex: 1, borderTopColor: Colors.accent}]} 
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: ex.id, name: ex.name } })}
                >
                  <Text style={[s.expandText, {color: Colors.accent}]}>📹 Start AI Session</Text>
                </TouchableOpacity>
              )}
            </View>
            {ex._expanded && <Text style={s.instructions}>{ex.instructions}</Text>}
          </View>
        ))}
        {filtered.length === 0 && (
          <View style={s.empty}><Text style={s.emptyText}>No exercises found</Text></View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:24,paddingTop:60},
  title:{fontSize:26,fontWeight:'800',color:Colors.textPrimary},
  subtitle:{fontSize:13,color:Colors.textSecondary,marginTop:4},
  searchBox:{paddingHorizontal:16,marginBottom:8},
  searchInput:{backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border,borderRadius:10,padding:12,fontSize:15,color:Colors.textPrimary},
  tabs:{maxHeight:44,marginBottom:8},
  tab:{paddingHorizontal:16,paddingVertical:8,borderRadius:20,backgroundColor:Colors.bgCard,borderWidth:1,borderColor:Colors.border},
  tabActive:{backgroundColor:Colors.primaryDark,borderColor:Colors.primary},
  tabText:{fontSize:13,color:Colors.textSecondary,textTransform:'capitalize'},
  tabTextActive:{color:Colors.white,fontWeight:'600'},
  list:{flex:1,paddingHorizontal:16},
  card:{backgroundColor:Colors.bgCard,borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:Colors.border},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  cardName:{fontSize:16,fontWeight:'700',color:Colors.textPrimary,flex:1},
  mpBadge:{fontSize:11,color:Colors.accent,fontWeight:'600'},
  cardDesc:{fontSize:13,color:Colors.textSecondary,marginTop:6},
  cardMeta:{flexDirection:'row',gap:8,marginTop:10,alignItems:'center'},
  badge:{paddingHorizontal:8,paddingVertical:3,borderRadius:6},
  badgeText:{fontSize:11,color:Colors.textPrimary,textTransform:'capitalize',fontWeight:'600'},
  metaText:{fontSize:12,color:Colors.textMuted},
  expandBtn:{marginTop:10,paddingTop:10,borderTopWidth:1,borderTopColor:Colors.border},
  expandText:{fontSize:13,color:Colors.primary,fontWeight:'600'},
  instructions:{fontSize:13,color:Colors.textSecondary,marginTop:8,lineHeight:20},
  empty:{alignItems:'center',padding:40},
  emptyText:{fontSize:16,color:Colors.textMuted},
});

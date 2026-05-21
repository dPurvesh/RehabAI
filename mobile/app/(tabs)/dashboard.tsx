import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function DashboardScreen() {
  const { user, profile, patientProfile } = useAuth();
  const [prediction, setPrediction] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLatest = async () => {
    if (!user) return;
    const { data } = await supabase.from('ml_predictions').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
    if (data) setPrediction(data);
  };

  useEffect(() => { fetchLatest(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await fetchLatest(); setRefreshing(false); };

  const score = prediction?.recovery_score ?? '--';
  const risk = prediction?.risk_level ?? '--';
  const phase = prediction?.rehab_phase ?? '--';
  const days = prediction?.days_remaining ?? '--';
  const alert = prediction?.physio_alert ?? false;
  const riskColor = risk === 'LOW' ? Colors.success : risk === 'MEDIUM' ? Colors.warning : risk === 'HIGH' ? Colors.danger : Colors.textMuted;
  const phaseColor = phase === 'PROTECTION' ? Colors.danger : phase === 'MOBILITY' ? Colors.warning : phase === 'STRENGTHENING' ? Colors.accent : Colors.success;

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
      <View style={s.header}>
        <Text style={s.greeting}>Hello, {profile?.full_name || 'Patient'} 👋</Text>
        <Text style={s.injury}>{patientProfile?.injury_type?.replace(/_/g, ' ').toUpperCase() || 'No injury set'}</Text>
      </View>

      {alert && <View style={s.alertBanner}><Text style={s.alertText}>⚠️ PHYSIO ALERT — Contact your physiotherapist</Text></View>}

      <View style={s.scoreCard}>
        <Text style={s.scoreLabel}>RECOVERY SCORE</Text>
        <Text style={[s.scoreValue, { color: Number(score) >= 70 ? Colors.success : Number(score) >= 40 ? Colors.warning : Colors.danger }]}>{score}</Text>
        <Text style={s.scoreUnit}>/ 100</Text>
      </View>

      <View style={s.row}>
        <View style={[s.card, { borderLeftColor: riskColor, borderLeftWidth: 4 }]}>
          <Text style={s.cardLabel}>RISK LEVEL</Text>
          <Text style={[s.cardValue, { color: riskColor }]}>{risk}</Text>
        </View>
        <View style={[s.card, { borderLeftColor: phaseColor, borderLeftWidth: 4 }]}>
          <Text style={s.cardLabel}>REHAB PHASE</Text>
          <Text style={[s.cardValue, { color: phaseColor, fontSize: 16 }]}>{phase}</Text>
        </View>
      </View>

      <View style={s.row}>
        <View style={s.card}>
          <Text style={s.cardLabel}>DAYS LEFT</Text>
          <Text style={[s.cardValue, { color: Colors.info }]}>{days}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>RECOVERY RATE</Text>
          <Text style={[s.cardValue, { color: Colors.accent }]}>{prediction?.recovery_rate ?? '--'}</Text>
        </View>
      </View>

      {!prediction && (
        <View style={s.empty}>
          <Text style={s.emptyText}>No predictions yet</Text>
          <Text style={s.emptyHint}>Complete your first daily check-in to see results</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:24,paddingTop:60},
  greeting:{fontSize:24,fontWeight:'700',color:Colors.textPrimary},
  injury:{fontSize:13,color:Colors.primary,marginTop:4,fontWeight:'600'},
  alertBanner:{backgroundColor:'#3b1525',borderWidth:1,borderColor:Colors.danger,margin:16,padding:14,borderRadius:10},
  alertText:{color:Colors.danger,fontWeight:'700',textAlign:'center',fontSize:14},
  scoreCard:{backgroundColor:Colors.bgCard,margin:16,padding:24,borderRadius:16,alignItems:'center',borderWidth:1,borderColor:Colors.border},
  scoreLabel:{fontSize:11,color:Colors.textSecondary,letterSpacing:2},
  scoreValue:{fontSize:64,fontWeight:'800',marginVertical:4},
  scoreUnit:{fontSize:16,color:Colors.textMuted},
  row:{flexDirection:'row',paddingHorizontal:16,gap:12,marginBottom:12},
  card:{flex:1,backgroundColor:Colors.bgCard,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border},
  cardLabel:{fontSize:10,color:Colors.textSecondary,letterSpacing:1.5,marginBottom:6},
  cardValue:{fontSize:22,fontWeight:'700',color:Colors.textPrimary},
  empty:{alignItems:'center',padding:40},
  emptyText:{fontSize:18,color:Colors.textSecondary,fontWeight:'600'},
  emptyHint:{fontSize:13,color:Colors.textMuted,marginTop:8,textAlign:'center'},
});

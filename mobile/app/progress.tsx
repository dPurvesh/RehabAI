import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function ProgressScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('ml_predictions').select('prediction_date,recovery_score,risk_level,rehab_phase')
      .eq('user_id', user.id).order('prediction_date', { ascending: true })
      .then(({ data }) => { if (data) setData(data); });
  }, [user]);

  const maxScore = Math.max(...data.map(d => d.recovery_score || 0), 100);

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Recovery Progress</Text>
        <Text style={s.subtitle}>{data.length} data points</Text>
      </View>

      {data.length > 0 ? (
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Recovery Score Over Time</Text>
          <View style={s.chart}>
            {data.map((d, i) => (
              <View key={i} style={s.bar}>
                <View style={[s.barFill, { height: `${(d.recovery_score / maxScore) * 100}%`,
                  backgroundColor: d.recovery_score >= 70 ? Colors.success : d.recovery_score >= 40 ? Colors.warning : Colors.danger }]} />
                <Text style={s.barLabel}>{d.recovery_score?.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={s.empty}><Text style={s.emptyText}>No progress data yet. Complete daily check-ins to see your trend.</Text></View>
      )}

      {data.length > 0 && (
        <View style={s.statsCard}>
          <Text style={s.chartTitle}>Summary</Text>
          <StatRow label="Latest Score" value={`${data[data.length-1]?.recovery_score?.toFixed(1)}`} />
          <StatRow label="Highest Score" value={`${Math.max(...data.map(d=>d.recovery_score)).toFixed(1)}`} />
          <StatRow label="Average Score" value={`${(data.reduce((a,d)=>a+d.recovery_score,0)/data.length).toFixed(1)}`} />
          <StatRow label="Total Check-ins" value={`${data.length}`} />
          <StatRow label="Current Phase" value={data[data.length-1]?.rehab_phase || '--'} />
        </View>
      )}
    </ScrollView>
  );
}

function StatRow({label,value}:{label:string;value:string}) {
  return <View style={s.statRow}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text></View>;
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:24,paddingTop:60},
  title:{fontSize:26,fontWeight:'800',color:Colors.textPrimary},
  subtitle:{fontSize:13,color:Colors.textSecondary,marginTop:4},
  chartCard:{backgroundColor:Colors.bgCard,margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border},
  chartTitle:{fontSize:14,fontWeight:'700',color:Colors.primary,marginBottom:16,textTransform:'uppercase',letterSpacing:1},
  chart:{flexDirection:'row',height:200,alignItems:'flex-end',gap:4},
  bar:{flex:1,height:'100%',justifyContent:'flex-end',alignItems:'center'},
  barFill:{width:'100%',borderRadius:4,minHeight:4},
  barLabel:{fontSize:9,color:Colors.textMuted,marginTop:4},
  statsCard:{backgroundColor:Colors.bgCard,margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border},
  statRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:1,borderBottomColor:Colors.border},
  statLabel:{fontSize:14,color:Colors.textSecondary},
  statValue:{fontSize:14,color:Colors.textPrimary,fontWeight:'700'},
  empty:{alignItems:'center',padding:40},
  emptyText:{fontSize:14,color:Colors.textMuted,textAlign:'center'},
});

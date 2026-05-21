import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { profile, patientProfile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const pp = patientProfile;

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{profile?.full_name?.[0] || '?'}</Text></View>
        <Text style={s.name}>{profile?.full_name || 'Patient'}</Text>
        <Text style={s.email}>{profile?.email}</Text>
      </View>

      {pp && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Medical Profile</Text>
          <InfoRow label="Injury" value={pp.injury_type?.replace(/_/g, ' ')} />
          <InfoRow label="Severity" value={pp.injury_severity} />
          <InfoRow label="Surgery" value={pp.surgery_type?.replace(/_/g, ' ')} />
          <InfoRow label="Surgery Date" value={pp.surgery_date} />
          <InfoRow label="Side" value={pp.affected_side} />
          <InfoRow label="Age" value={pp.age} />
          <InfoRow label="BMI" value={pp.bmi} />
          <InfoRow label="Comorbidities" value={pp.comorbidities} />
          <InfoRow label="Activity Level" value={pp.activity_before_injury} />
        </View>
      )}

      <View style={s.card}>
        <Text style={s.cardTitle}>App Features</Text>
        <NavRow icon="📈" label="Recovery Progress" onPress={() => router.push('/progress')} />
        <NavRow icon="🩺" label="Weekly Assessment" onPress={() => router.push('/weekly-assessment')} />
        <NavRow icon="🏆" label="Recovery Journey" onPress={() => router.push('/journey')} />
        <NavRow icon="📄" label="Upload Medical Report" onPress={() => router.push('/upload-report')} />
        <NavRow icon="🚨" label="Emergency Contacts" onPress={() => router.push('/emergency')} />
      </View>

      <TouchableOpacity style={s.signOut} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || '--'}</Text>
    </View>
  );
}

function NavRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.navRow} onPress={onPress}>
      <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
        <Text style={{fontSize:18}}>{icon}</Text>
        <Text style={s.navLabel}>{label}</Text>
      </View>
      <Text style={{color:Colors.textMuted}}>→</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{alignItems:'center',paddingTop:60,paddingBottom:24},
  avatar:{width:80,height:80,borderRadius:40,backgroundColor:Colors.primary,justifyContent:'center',alignItems:'center'},
  avatarText:{fontSize:32,fontWeight:'700',color:Colors.white},
  name:{fontSize:22,fontWeight:'700',color:Colors.textPrimary,marginTop:12},
  email:{fontSize:13,color:Colors.textSecondary,marginTop:2},
  card:{backgroundColor:Colors.bgCard,margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border},
  cardTitle:{fontSize:14,fontWeight:'700',color:Colors.primary,marginBottom:12,textTransform:'uppercase',letterSpacing:1},
  infoRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderBottomWidth:1,borderBottomColor:Colors.border},
  infoLabel:{fontSize:13,color:Colors.textSecondary},
  infoValue:{fontSize:13,color:Colors.textPrimary,fontWeight:'600',textTransform:'capitalize'},
  signOut:{margin:16,padding:16,borderRadius:10,borderWidth:1,borderColor:Colors.danger,alignItems:'center'},
  signOutText:{color:Colors.danger,fontWeight:'700',fontSize:15},
  navRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.border},
  navLabel:{fontSize:15,color:Colors.textPrimary,fontWeight:'500'},
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { extractReport } from '@/lib/api';

export default function UploadReportScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExtract = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const res = await extractReport(text);
      setResult(res.extracted_data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Medical Report AI</Text>
      </View>
      <View style={s.card}>
        <Text style={s.icon}>📄</Text>
        <Text style={s.cardTitle}>Extract Clinical Details</Text>
        <Text style={s.desc}>Paste your surgical notes, MRI report, or physio discharge summary below. The AI will extract clinical details to improve your recovery plan.</Text>
        <TextInput 
          style={s.input} 
          placeholder="Paste medical report text here..." 
          placeholderTextColor={Colors.textMuted}
          multiline 
          value={text} 
          onChangeText={setText} 
        />
        <TouchableOpacity style={s.btn} onPress={handleExtract} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Extracting...' : 'Extract via Gemini AI'}</Text>
        </TouchableOpacity>
      </View>
      
      {result && (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>Extraction Successful</Text>
          <Text style={s.resultLabel}>Diagnosis:</Text><Text style={s.resultVal}>{result.diagnosis}</Text>
          <Text style={s.resultLabel}>Surgery:</Text><Text style={s.resultVal}>{result.surgery_details}</Text>
          <Text style={s.resultLabel}>Follow-up:</Text><Text style={s.resultVal}>{result.follow_up_date}</Text>
          <Text style={s.resultLabel}>Restrictions:</Text>
          {result.restrictions?.map((r: string, i: number) => <Text key={i} style={s.resultVal}>• {r}</Text>)}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:24,paddingTop:60},
  back:{color:Colors.primary,fontSize:14,fontWeight:'600',marginBottom:8},
  title:{fontSize:26,fontWeight:'800',color:Colors.textPrimary},
  card:{backgroundColor:Colors.bgCard,margin:16,padding:24,borderRadius:12,borderWidth:1,borderColor:Colors.border,alignItems:'center'},
  icon:{fontSize:48,marginBottom:16},
  cardTitle:{fontSize:18,fontWeight:'700',color:Colors.textPrimary,marginBottom:8},
  desc:{fontSize:14,color:Colors.textSecondary,textAlign:'center',lineHeight:20,marginBottom:24},
  btn:{backgroundColor:Colors.primary,paddingHorizontal:24,paddingVertical:14,borderRadius:10},
  btnText:{color:Colors.white,fontWeight:'700',fontSize:16},
  input:{backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border,borderRadius:10,padding:12,fontSize:15,color:Colors.textPrimary,minHeight:120,textAlignVertical:'top',marginBottom:16,width:'100%'},
  resultCard:{backgroundColor:Colors.bgCard,margin:16,marginTop:0,padding:24,borderRadius:12,borderWidth:1,borderColor:Colors.success},
  resultTitle:{fontSize:18,fontWeight:'700',color:Colors.success,marginBottom:16},
  resultLabel:{fontSize:13,color:Colors.textSecondary,marginTop:8},
  resultVal:{fontSize:15,color:Colors.textPrimary,fontWeight:'500'},
});

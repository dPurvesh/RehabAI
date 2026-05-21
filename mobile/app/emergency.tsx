import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function EmergencyScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: '', phone: '', is_primary: false });

  useEffect(() => { fetchContacts(); }, []);
  const fetchContacts = async () => {
    const { data } = await supabase.from('emergency_contacts').select('*').eq('user_id', user!.id).order('is_primary', { ascending: false });
    if (data) setContacts(data);
  };

  const addContact = async () => {
    if (!form.name || !form.phone) return Alert.alert('Error', 'Name and phone required');
    await supabase.from('emergency_contacts').insert({ user_id: user!.id, ...form });
    setShowAdd(false); setForm({ name: '', relationship: '', phone: '', is_primary: false });
    fetchContacts();
  };

  const deleteContact = (id: string) => {
    Alert.alert('Delete', 'Remove this contact?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('emergency_contacts').delete().eq('id', id);
        fetchContacts();
      }},
    ]);
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Emergency Contacts</Text>
      </View>

      {contacts.map(c => (
        <View key={c.id} style={s.card}>
          <View style={s.cardRow}>
            <View style={{flex:1}}>
              <Text style={s.name}>{c.name} {c.is_primary && '⭐'}</Text>
              <Text style={s.info}>{c.relationship} • {c.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteContact(c.id)}><Text style={s.del}>✕</Text></TouchableOpacity>
          </View>
        </View>
      ))}

      {showAdd ? (
        <View style={s.addCard}>
          <TextInput style={s.input} placeholder="Name" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm(p=>({...p,name:v}))} />
          <TextInput style={s.input} placeholder="Relationship" placeholderTextColor={Colors.textMuted} value={form.relationship} onChangeText={v => setForm(p=>({...p,relationship:v}))} />
          <TextInput style={s.input} placeholder="Phone" placeholderTextColor={Colors.textMuted} value={form.phone} onChangeText={v => setForm(p=>({...p,phone:v}))} keyboardType="phone-pad" />
          <TouchableOpacity style={s.toggle} onPress={() => setForm(p=>({...p,is_primary:!p.is_primary}))}>
            <Text style={s.toggleText}>{form.is_primary ? '⭐ Primary' : 'Set as Primary'}</Text>
          </TouchableOpacity>
          <View style={{flexDirection:'row',gap:8}}>
            <TouchableOpacity style={[s.btn,{flex:1,backgroundColor:'transparent',borderWidth:1,borderColor:Colors.border}]} onPress={()=>setShowAdd(false)}>
              <Text style={[s.btnText,{color:Colors.textSecondary}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn,{flex:1}]} onPress={addContact}>
              <Text style={s.btnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add Contact</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:24,paddingTop:60},
  back:{color:Colors.primary,fontSize:14,fontWeight:'600',marginBottom:8},
  title:{fontSize:26,fontWeight:'800',color:Colors.textPrimary},
  card:{backgroundColor:Colors.bgCard,marginHorizontal:16,marginBottom:8,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border},
  cardRow:{flexDirection:'row',alignItems:'center'},
  name:{fontSize:16,fontWeight:'700',color:Colors.textPrimary},
  info:{fontSize:13,color:Colors.textSecondary,marginTop:4},
  del:{fontSize:18,color:Colors.danger,fontWeight:'700',padding:8},
  addCard:{backgroundColor:Colors.bgCard,margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.primary,gap:10},
  input:{backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border,borderRadius:10,padding:12,fontSize:15,color:Colors.textPrimary},
  toggle:{padding:10,alignItems:'center'},
  toggleText:{color:Colors.primary,fontWeight:'600'},
  btn:{backgroundColor:Colors.primary,padding:14,borderRadius:10,alignItems:'center'},
  btnText:{color:Colors.white,fontWeight:'700',fontSize:15},
  addBtn:{margin:16,padding:16,borderRadius:12,borderWidth:1,borderColor:Colors.border,borderStyle:'dashed',alignItems:'center'},
  addBtnText:{color:Colors.primary,fontWeight:'700',fontSize:15},
});

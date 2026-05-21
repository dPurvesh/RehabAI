import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!fullName || !email || !password) return Alert.alert('Error', 'Fill in all fields');
    if (password !== confirm) return Alert.alert('Error', 'Passwords do not match');
    if (password.length < 6) return Alert.alert('Error', 'Password must be 6+ characters');
    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (error) Alert.alert('Registration Failed', error.message);
    else Alert.alert('Success', 'Account created! You can now sign in.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={s.title}>Create Account</Text>
      <Text style={s.subtitle}>Join KneeRevive AI</Text>
      <View style={s.form}>
        <Text style={s.label}>Full Name</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName}
          placeholder="Your name" placeholderTextColor={Colors.textMuted} />
        <Text style={s.label}>Email</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail}
          placeholder="your@email.com" placeholderTextColor={Colors.textMuted}
          keyboardType="email-address" autoCapitalize="none" />
        <Text style={s.label}>Password</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword}
          placeholder="Min 6 characters" placeholderTextColor={Colors.textMuted} secureTextEntry />
        <Text style={s.label}>Confirm Password</Text>
        <TextInput style={s.input} value={confirm} onChangeText={setConfirm}
          placeholder="Repeat password" placeholderTextColor={Colors.textMuted} secureTextEntry />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.link}>Already have an account? <Text style={s.linkBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary,justifyContent:'center',padding:24},
  title:{fontSize:28,fontWeight:'800',color:Colors.textPrimary,textAlign:'center'},
  subtitle:{fontSize:14,color:Colors.textSecondary,textAlign:'center',marginBottom:32},
  form:{gap:8},
  label:{fontSize:12,color:Colors.textSecondary,textTransform:'uppercase',letterSpacing:1,marginTop:8},
  input:{backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border,borderRadius:10,
    padding:14,fontSize:16,color:Colors.textPrimary},
  btn:{backgroundColor:Colors.primary,padding:16,borderRadius:10,alignItems:'center',marginTop:20},
  btnDisabled:{opacity:0.5},
  btnText:{color:Colors.white,fontSize:16,fontWeight:'700'},
  link:{color:Colors.textSecondary,textAlign:'center',marginTop:20,fontSize:14},
  linkBold:{color:Colors.primary,fontWeight:'600'},
});

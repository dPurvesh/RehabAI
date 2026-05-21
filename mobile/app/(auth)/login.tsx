import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Fill in all fields');
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <Text style={s.logo}>🦿</Text>
        <Text style={s.title}>KneeRevive AI</Text>
        <Text style={s.subtitle}>Your knee rehabilitation companion</Text>
      </View>
      <View style={s.form}>
        <Text style={s.label}>Email</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail}
          placeholder="your@email.com" placeholderTextColor={Colors.textMuted}
          keyboardType="email-address" autoCapitalize="none" />
        <Text style={s.label}>Password</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword}
          placeholder="Enter password" placeholderTextColor={Colors.textMuted} secureTextEntry />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={s.link}>Don't have an account? <Text style={s.linkBold}>Sign Up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary,justifyContent:'center',padding:24},
  header:{alignItems:'center',marginBottom:40},
  logo:{fontSize:64,marginBottom:12},
  title:{fontSize:32,fontWeight:'800',color:Colors.textPrimary},
  subtitle:{fontSize:14,color:Colors.textSecondary,marginTop:4},
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

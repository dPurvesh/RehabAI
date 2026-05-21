import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { chatWithAI } from '@/lib/api';

type Msg = { role: 'user' | 'assistant'; content: string; };

export default function ChatScreen() {
  const { user, patientProfile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: `Hi! I'm your KneeRevive AI assistant. I can help with questions about your ${patientProfile?.injury_type?.replace(/_/g,' ') || 'knee'} recovery. How are you feeling today?` }]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || typing) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setTyping(true);

    try {
      // Save user message
      const sessionId = 'default';
      await supabase.from('ai_chat_messages').insert({
        user_id: user!.id, session_id: sessionId, role: 'user', content: userMsg,
      });

      // Get latest prediction for context
      const { data: pred } = await supabase.from('ml_predictions').select('*')
        .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1).single();

      const context = {
        injury_type: patientProfile?.injury_type,
        day_number: 30, score: pred?.recovery_score ?? 50,
        phase: pred?.rehab_phase ?? 'MOBILITY',
        pain: 3, rom: 85,
      };

      let reply = '';
      try {
        const res = await chatWithAI(userMsg, context);
        reply = res.response || res.message || "I'm here to help with your recovery. Could you tell me more?";
      } catch {
        // Mock response if API not available
        reply = getMockResponse(userMsg);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      await supabase.from('ai_chat_messages').insert({
        user_id: user!.id, session_id: sessionId, role: 'assistant', content: reply,
      });
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that. Please try again." }]);
    }
    setTyping(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <Text style={s.title}>AI Rehab Assistant</Text>
        <Text style={s.subtitle}>Ask about your knee recovery</Text>
      </View>

      <ScrollView ref={scrollRef} style={s.chat} contentContainerStyle={{padding:16,paddingBottom:20}}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
            <Text style={[s.bubbleText, m.role === 'user' && { color: Colors.white }]}>{m.content}</Text>
          </View>
        ))}
        {typing && (
          <View style={s.aiBubble}>
            <Text style={s.typingDots}>● ● ●</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput style={s.input} value={input} onChangeText={setInput}
          placeholder="Ask about your recovery..." placeholderTextColor={Colors.textMuted}
          onSubmitEditing={sendMessage} returnKeyType="send" />
        <TouchableOpacity style={s.sendBtn} onPress={sendMessage} disabled={typing}>
          <Text style={s.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function getMockResponse(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('pain')) return "Pain is normal during recovery. If it's below 5/10, that's expected. Apply ice for 15-20 minutes and elevate your knee. If pain exceeds 7/10 or is sharp/sudden, please contact your physiotherapist.";
  if (m.includes('exercise') || m.includes('workout')) return "Consistency is key! Try to complete at least 70% of your daily exercises. Start with gentle ROM exercises and gradually increase intensity. Remember to stop if you feel sharp pain.";
  if (m.includes('sleep')) return "Good sleep is crucial for recovery. Try elevating your knee with a pillow, take prescribed medication before bed if needed, and maintain a consistent sleep schedule. Aim for 7-9 hours.";
  if (m.includes('swelling') || m.includes('swollen')) return "Some swelling is normal. Use the RICE method: Rest, Ice (15-20 min), Compression, and Elevation. If swelling increases significantly or doesn't improve in 2-3 days, consult your physio.";
  if (m.includes('walk') || m.includes('gait')) return "Progress your walking gradually. Start with assisted walking, then move to independent walking as your strength improves. Focus on equal weight distribution and avoid limping.";
  return "That's a great question about your recovery! While I can provide general guidance, please consult your physiotherapist for specific medical advice. Is there anything else about your knee rehabilitation I can help with?";
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bgPrimary},
  header:{padding:20,paddingTop:60,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:22,fontWeight:'800',color:Colors.textPrimary},
  subtitle:{fontSize:13,color:Colors.textSecondary,marginTop:2},
  chat:{flex:1},
  bubble:{maxWidth:'80%',padding:14,borderRadius:16,marginBottom:10},
  userBubble:{backgroundColor:Colors.primary,alignSelf:'flex-end',borderBottomRightRadius:4},
  aiBubble:{backgroundColor:Colors.bgCard,alignSelf:'flex-start',borderBottomLeftRadius:4,borderWidth:1,borderColor:Colors.border},
  bubbleText:{fontSize:14,color:Colors.textPrimary,lineHeight:20},
  typingDots:{color:Colors.primary,fontSize:16,letterSpacing:4},
  inputRow:{flexDirection:'row',padding:12,gap:8,borderTopWidth:1,borderTopColor:Colors.border,backgroundColor:Colors.bgSecondary},
  input:{flex:1,backgroundColor:Colors.bgInput,borderWidth:1,borderColor:Colors.border,borderRadius:24,paddingHorizontal:16,paddingVertical:12,fontSize:15,color:Colors.textPrimary},
  sendBtn:{width:48,height:48,borderRadius:24,backgroundColor:Colors.primary,justifyContent:'center',alignItems:'center'},
  sendText:{fontSize:20,color:Colors.white,fontWeight:'700'},
});

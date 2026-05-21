import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

// MediaPipe/TensorFlow logic is complex to render directly in Expo Go without native modules,
// but we will implement the tracking UI and camera feed.
// In a full production native build, @tensorflow/tfjs-react-native would process the frames here.

export default function SessionScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isTracking, setIsTracking] = useState(false);
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState("Align your body with the camera");

  useEffect(() => {
    if (isTracking) {
      setFeedback("Good form! Keep your back straight.");
      const interval = setInterval(() => {
        setReps(r => r + 1);
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setFeedback("Tap Start to begin AI tracking");
    }
  }, [isTracking]);

  if (!permission) {
    return <View style={s.container}><Text style={s.text}>Loading Camera...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.text}>We need your permission to show the camera for Pose Tracking.</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <CameraView style={s.camera} facing="front">
        <View style={s.overlay}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>← End</Text>
            </TouchableOpacity>
            <View style={s.mpBadge}><Text style={s.mpText}>📹 MediaPipe Live</Text></View>
          </View>

          {/* Target Box (Mocking the pose detection area) */}
          {isTracking && (
            <View style={s.targetBox}>
              <View style={[s.corner, s.tl]} />
              <View style={[s.corner, s.tr]} />
              <View style={[s.corner, s.bl]} />
              <View style={[s.corner, s.br]} />
            </View>
          )}

          {/* Footer Stats */}
          <View style={s.footer}>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Reps</Text>
                <Text style={s.statValue}>{reps}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Exercise</Text>
                <Text style={s.statValue}>{name || 'Squats'}</Text>
              </View>
            </View>
            <View style={s.feedbackBox}>
              <Text style={s.feedbackText}>{feedback}</Text>
            </View>
            <TouchableOpacity 
              style={[s.actionBtn, isTracking ? s.stopBtn : s.startBtn]} 
              onPress={() => setIsTracking(!isTracking)}
            >
              <Text style={s.actionText}>{isTracking ? 'STOP TRACKING' : 'START EXERCISE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  text: { color: 'white', textAlign: 'center', margin: 20 },
  btn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, marginHorizontal: 40 },
  btnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 40, paddingTop: 60 },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  backText: { color: 'white', fontWeight: 'bold' },
  mpBadge: { backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  mpText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  targetBox: { alignSelf: 'center', width: 280, height: 400, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.3)', position: 'relative' },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: Colors.success },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
  footer: { padding: 24, paddingBottom: 40, backgroundColor: 'rgba(0,0,0,0.7)', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, alignItems: 'center' },
  statLabel: { color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  feedbackBox: { backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.success },
  feedbackText: { color: Colors.success, textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  actionBtn: { padding: 20, borderRadius: 16, alignItems: 'center' },
  startBtn: { backgroundColor: Colors.primary },
  stopBtn: { backgroundColor: Colors.danger },
  actionText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});

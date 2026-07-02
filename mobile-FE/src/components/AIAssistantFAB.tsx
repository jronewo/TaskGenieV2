import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AIBottomSheet from './AIBottomSheet';

export default function AIAssistantFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1250, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1250, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <>
      <Animated.View style={[s.fab, { transform: [{ scale: pulse }] }]}>
        <TouchableOpacity onPress={() => setIsOpen(true)} activeOpacity={0.85}>
          <LinearGradient colors={['#7C4DFF', '#2962FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
            <Sparkles size={24} color="#fff" strokeWidth={1.75} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {isOpen && <AIBottomSheet onClose={() => setIsOpen(false)} />}
    </>
  );
}

const s = StyleSheet.create({
  fab: { position: 'absolute', bottom: 108, right: 20, zIndex: 30, shadowColor: '#7C4DFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
  btn: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

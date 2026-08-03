// app/(decision)/decision-type.tsx
import StepIndicator from '@/src/components/decision/steps-indicator';
import { DECISIONS, DecisionType } from '@/src/constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // ✅ correct import
import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function DecisionTypeScreen() {
  const router = useRouter();

  const handleNext = (decisionType: DecisionType) => {
    // ✅ correct navigation to the combined input flow
    router.push({
      pathname: '/input-flow',
      params: { decisionType },
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" />
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0A3B28" />
          </TouchableOpacity>
          <StepIndicator current={0} total={6} />
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          {/* <Text style={s.stepLabel}>STEP 1 OF 4</Text> */}
          <Text style={s.title}>What decision{'\n'}are you making?</Text>
          <Text style={s.subtitle}>Select the type of agricultural decision to analyze.</Text>
        </View>

        {/* Cards */}
        <View style={s.cards}>
          {DECISIONS.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={s.card}
              activeOpacity={0.75}
              onPress={() => handleNext(d.id)}
            >
              <View style={s.iconWrap}>
                <Ionicons name={d.icon} size={24} color="#0A3B28" />
              </View>
              <View style={s.cardText}>
                <Text style={s.cardLabel}>{d.label}</Text>
                <Text style={s.cardDesc}>{d.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#0A3B28" style={{ opacity: 0.35 }} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 36,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E8E2D6', alignItems: 'center', justifyContent: 'center',
  },

  titleBlock: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: '#0A3B28', lineHeight: 34, marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#6B7B6E', lineHeight: 19 },

  cards: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#EAF2EC', alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#0A3B28', marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#6B7B6E', lineHeight: 17 },
});
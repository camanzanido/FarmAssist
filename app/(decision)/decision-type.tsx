import { wizardHeader } from '@/src/components/decision/wizard-styles';
import StepIndicator from '@/src/components/decision/steps-indicator';
import { DECISIONS, DecisionType } from '@/src/constants';
import { Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { decisionTypeCopy as copy } from '@/src/constants/copy';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
    router.push({
      pathname: '/input-flow',
      params: { decisionType },
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.ink} />
          </TouchableOpacity>
          <StepIndicator current={0} total={5} />
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{copy.title}</Text>
          <Text style={s.subtitle}>{copy.subtitle}</Text>
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
                <Ionicons name={d.icon} size={24} color={Colors.ink} />
              </View>
              <View style={s.cardText}>
                <Text style={s.cardLabel}>{d.label}</Text>
                <Text style={s.cardDesc}>{d.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.ink} style={{ opacity: 0.35 }} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { ...contentColumn, flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  ...wizardHeader,

  cards: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 18,
    padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 17, fontWeight: '800', color: Colors.ink, marginBottom: 3 },
  cardDesc: { fontSize: 13, color: Colors.inkSoft, lineHeight: 18 },
});

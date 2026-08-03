// app/(inputs)/DecisionInputFlow.tsx
import StepIndicator from '@/src/components/decision/steps-indicator';
import { CLIMATES, DECISION_LABELS, DecisionType, FIELD_CONFIG, FieldGroup, PLACEHOLDERS } from '@/src/constants';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function emptyFive(): string[] {
  return ['', '', '', '', ''];
}

export default function DecisionInputFlow() {
  const router = useRouter();
  const { decisionType } = useLocalSearchParams<{ decisionType: DecisionType }>();
  if (!decisionType) {
    // Fallback – should not happen if navigated correctly
    router.back();
    return null;
  }

  // ---------- Naming state ----------
  const [names, setNames] = useState<string[]>(['', '']);
  const placeholders = PLACEHOLDERS[decisionType];
  const namesValid = names[0].trim().length > 0 && names[1].trim().length > 0;

  // ---------- Data state for both options ----------
  // Each option: yield[5], cost[5], addCost[5], price (string)
  const [optionData, setOptionData] = useState([
    { yield: emptyFive(), cost: emptyFive(), addCost: emptyFive(), price: '' },
    { yield: emptyFive(), cost: emptyFive(), addCost: emptyFive(), price: '' },
  ]);


  const [driest, setDriest] = useState('33');
  const [wettest, setWettest] = useState('33');

  // Automatic calculation: 100 - driest - wettest
  const dVal = parseInt(driest) || 0;
  const wVal = parseInt(wettest) || 0;
  const mid = Math.max(0, 100 - dVal - wVal);

  const isWeatherValid = dVal + wVal <= 100 && (driest !== '' && wettest !== '');

  // ---------- Internal step ----------
  type Step = 'naming' | 'data-0' | 'data-1' | 'weather';
  const [step, setStep] = useState<Step>('naming');

  const currentOptionIdx = step === 'data-0' ? 0 : 1;
  const currentOptionData = optionData[currentOptionIdx];

  const isDataValid = () => {
    const data = currentOptionData;
    return (
      data.yield.every(v => v.trim() !== '') &&
      data.cost.every(v => v.trim() !== '') &&
      data.addCost.every(v => v.trim() !== '') &&
      data.price.trim() !== ''
    );
  };

  const updateCurrentOptionField = (group: FieldGroup, index: number, value: string) => {
    setOptionData(prev => {
      const updated = [...prev];
      const newGroup = [...updated[currentOptionIdx][group]];
      newGroup[index] = value;
      updated[currentOptionIdx] = { ...updated[currentOptionIdx], [group]: newGroup };
      return updated;
    });
  };

  const updateCurrentOptionPrice = (value: string) => {
    setOptionData(prev => {
      const updated = [...prev];
      updated[currentOptionIdx] = { ...updated[currentOptionIdx], price: value };
      return updated;
    });
  };


  const handleNext = () => {
    if (step === 'naming') {
      if (namesValid) setStep('data-0');
    } else if (step === 'data-0') {
      if (isDataValid()) setStep('data-1');
    } else if (step === 'data-1') {
      if (isDataValid()) setStep('weather'); // Go to climate input instead of results
    } else if (step === 'weather') {
      // Final navigation to results
      router.push({
        pathname: '/result',
        params: {
          decisionType: JSON.stringify(decisionType),
          optionNames: JSON.stringify(names.map(n => n.trim())),
          yieldData: JSON.stringify(optionData.map(o => o.yield)),
          costData: JSON.stringify(optionData.map(o => o.cost)),
          addCostData: JSON.stringify(optionData.map(o => o.addCost)),
          priceData: JSON.stringify(optionData.map(o => o.price)),
          climate: JSON.stringify([driest, mid, wettest])
        },
      });
    }
  };

  const goBack = () => {
    if (step === 'data-0') setStep('naming');
    else if (step === 'data-1') setStep('data-0');
    else if (step === 'weather') setStep('data-1');
    else router.back();
  };

  // Helper to get step number (1-3) for indicator
  const getStepNumber = (): { current: number; total: number } => {
    switch (step) {
      case 'naming': return { current: 1, total: 5 };
      case 'data-0': return { current: 2, total: 5 };
      case 'data-1': return { current: 3, total: 5 };
      case 'weather': return { current: 4, total: 5 };
      default: return { current: 1, total: 5 };
    }
  };

  const { current, total } = getStepNumber();

  // ---------- Render naming step ----------
  if (step === 'naming') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.container}>
            <View style={s.header}>
              <TouchableOpacity onPress={goBack} style={s.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#0A3B28" />
              </TouchableOpacity>
              <StepIndicator current={current} total={total} />
            </View>

            <View style={s.titleBlock}>
              {/* <Text style={s.stepLabel}>STEP 1 OF 3</Text> */}
              <Text style={s.title}>Name your{'\n'}two options</Text>
              <Text style={s.subtitle}>
                For <Text style={s.bold}>{DECISION_LABELS[decisionType]}</Text>, give each option a short name.
              </Text>
            </View>

            <View style={s.inputGroup}>
              {[0, 1].map(i => (
                <View key={i} style={s.inputWrap}>
                  <View style={s.inputLabel}>
                    <View style={s.badge}><Text style={s.badgeText}>Option {i + 1}</Text></View>
                  </View>
                  <TextInput
                    style={s.input}
                    placeholder={placeholders[i]}
                    placeholderTextColor="#B0A898"
                    value={names[i]}
                    onChangeText={v => setNames(prev => { const updated = [...prev]; updated[i] = v; return updated; })}
                    returnKeyType="next"
                  />
                </View>
              ))}
            </View>

            <View style={s.footer}>
              <TouchableOpacity
                style={[s.nextBtn, !namesValid && s.nextBtnDisabled]}
                onPress={handleNext}
                disabled={!namesValid}
                activeOpacity={0.8}
              >
                <Text style={s.nextBtnText}>Continue to Data Entry</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---------- Render Weather Step ----------
  else if (step === 'weather') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.container}>
            <View style={s.header}>
              <TouchableOpacity onPress={() => setStep('data-1')} style={s.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#0A3B28" />
              </TouchableOpacity>
              <StepIndicator current={4} total={5} />
            </View>

            <View style={s.titleBlock}>
              <Text style={s.title}>Climate{'\n'}Probabilities</Text>
              <Text style={s.subtitle}>
                How likely is each scenario? The total must be 100%.
              </Text>
            </View>

            <View style={s.weatherCard}>
              {/* Driest Input */}
              <View style={s.weatherRow}>
                <View style={s.weatherInfo}>
                  <Text style={s.weatherLabel}>Driest Years</Text>
                  <Text style={s.weatherSubLabel}>Low rainfall frequency</Text>
                </View>
                <View style={s.weatherInputWrap}>
                  <TextInput
                    style={s.weatherInput}
                    keyboardType="numeric"
                    value={driest}
                    onChangeText={(v) => {
                      if (parseInt(v) + wVal <= 100 || v === '') setDriest(v);
                    }}
                    maxLength={3}
                  />
                  <Text style={s.percentSymbol}>%</Text>
                </View>
              </View>

              <View style={s.divider} />

              {/* Mid (Automatic) */}
              <View style={s.weatherRow}>
                <View style={s.weatherInfo}>
                  <Text style={s.weatherLabel}>Normal/Mid Years</Text>
                  <Text style={s.weatherSubLabel}>Calculated automatically</Text>
                </View>
                <View style={[s.weatherInputWrap, { backgroundColor: '#E8E2D6' }]}>
                  <Text style={s.autoValue}>{mid}</Text>
                  <Text style={s.percentSymbol}>%</Text>
                </View>
              </View>

              <View style={s.divider} />

            {/* Wettest Input */}
              <View style={s.weatherRow}>
                <View style={s.weatherInfo}>
                  <Text style={s.weatherLabel}>Wettest Years</Text>
                  <Text style={s.weatherSubLabel}>High rainfall frequency</Text>
                </View>
                <View style={s.weatherInputWrap}>
                  <TextInput
                    style={s.weatherInput}
                    keyboardType="numeric"
                    value={wettest}
                    onChangeText={(v) => {
                      if (parseInt(v) + dVal <= 100 || v === '') setWettest(v);
                    }}
                    maxLength={3}
                  />
                  <Text style={s.percentSymbol}>%</Text>
                </View>
              </View>
          </View>

            {dVal + wVal > 100 && (
              <Text style={s.errorText}>Total cannot exceed 100%</Text>
            )}

            <View style={s.footer}>
              <TouchableOpacity
                style={[s.nextBtn, !isWeatherValid && s.nextBtnDisabled]}
                onPress={handleNext}
                disabled={!isWeatherValid}>
                <Text style={s.nextBtnText}>Calculate Results</Text>
                <Ionicons name="analytics" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---------- Render data entry step (for either option 0 or 1) ----------
  const optionName = names[currentOptionIdx];
  const isSecondOption = step === 'data-1';
  const nextButtonText = isSecondOption ? 'Continue to climate' : `Continue to ${names[1]}`;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={goBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#0A3B28" />
            </TouchableOpacity>
            <StepIndicator current={current} total={total} />
          </View>

          <View style={s.titleBlock}>
            {/* <Text style={s.stepLabel}>
              STEP {current + 1} OF 3 · OPTION {currentOptionIdx + 1} OF 2
            </Text> */}
            <Text style={s.title} numberOfLines={1}>{optionName}</Text>
            <Text style={s.subtitle}>Enter values for each climate scenario.</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            {/* Price Block - Full Width Input */}
            <View style={s.fieldBlock}>
              <View style={s.fieldLabelRow}>
                <Ionicons name="pricetag-outline" size={14} color="#5A9A6E" />
                <Text style={s.fieldLabel}>Price</Text>
                <Text style={s.fieldUnit}>(₱/kg)</Text>
              </View>
              <TextInput
                style={s.fullWidthInput}
                keyboardType="numeric"
                value={currentOptionData.price}
                onChangeText={updateCurrentOptionPrice}
                placeholder="e.g. 18.00"
                placeholderTextColor="#C0B8AC"
              />
            </View>

            {/* Dynamic Fields (Yield, Cost, etc.) */}
            {FIELD_CONFIG.map(({ key, label, unit, icon }) => (
              <View key={key} style={s.fieldBlock}>
                <View style={s.fieldLabelRow}>
                  <Ionicons name={icon} size={14} color="#5A9A6E" />
                  <Text style={s.fieldLabel}>{label}</Text>
                  <Text style={s.fieldUnit}>({unit})</Text>
                </View>

                <View style={s.gridRow}>
                  {CLIMATES.map((climateName, i) => (
                    <View key={i} style={s.gridColumn}>
                      <Text style={s.columnLabel}>{climateName}</Text>
                      <TextInput
                        style={s.cell}
                        keyboardType="numeric"
                        value={currentOptionData[key][i]}
                        onChangeText={v => updateCurrentOptionField(key, i, v)}
                        placeholder="0"
                        placeholderTextColor="#C0B8AC"
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={{ height: 120 }} />
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity
              style={[s.nextBtn, !isDataValid() && s.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!isDataValid()}
              activeOpacity={0.8}
            >
              <Text style={s.nextBtnText}>{nextButtonText}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8E2D6', alignItems: 'center', justifyContent: 'center' },

  titleBlock: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#0A3B28', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7B6E' },
  bold: { fontWeight: '700', color: '#0A3B28' },

  inputGroup: { gap: 16 },
  inputWrap: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  inputLabel: { marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#EAF2EC', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0A3B28', letterSpacing: 0.5 },
  input: { fontSize: 16, fontWeight: '600', color: '#0A3B28', paddingVertical: 4, borderBottomWidth: 1.5, borderBottomColor: '#E0D9CE' },

  scroll: { paddingBottom: 16 },
  climateHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, gap: 6 },
  climateHeader: { flex: 1, fontSize: 10, fontWeight: '700', color: '#5A9A6E', textAlign: 'center', letterSpacing: 0.3 },

  fieldBlock: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 1 },
  //fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  //fieldLabel: { fontSize: 13, fontWeight: '700', color: '#0A3B28' },
  //fieldUnit: { fontSize: 11, color: '#8A8070' },
  inputRow: { flexDirection: 'row', gap: 6 },
  //cell: { flex: 1, backgroundColor: '#F5F0E8', borderRadius: 8, paddingVertical: 8, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#0A3B28', borderWidth: 1.5, borderColor: '#E0D9CE' },
  priceBlock: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 1, marginBottom: 10 },
  priceLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  priceInput: { flex: 1, backgroundColor: '#F5F0E8', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, fontWeight: '600', color: '#0A3B28', borderWidth: 1.5, borderColor: '#E0D9CE', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 28, left: 24, right: 24 },
  nextBtn: { backgroundColor: '#0A3B28', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnDisabled: { backgroundColor: '#B0C4B8' },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // fieldBlock: {
  //   backgroundColor: '#FFFFFF',
  //   borderRadius: 12,
  //   padding: 16,
  //   marginBottom: 16,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.05,
  //   shadowRadius: 8,
  //   elevation: 2
  // },

  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },

  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#0A3B28', textTransform: 'capitalize' },
  fieldUnit: { fontSize: 11, color: '#8A8070' },

  // Price input spans the full width of the card
  fullWidthInput: {
    backgroundColor: '#F5F0E8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#0A3B28',
    borderWidth: 1,
    borderColor: '#E0D9CE',
  },

  // Grid layout for Climate scenarios
  gridRow: {
    flexDirection: 'row',
    gap: 8
  },

  gridColumn: {
    flex: 1,
    alignItems: 'center'
  },

  columnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7B6E',
    marginBottom: 6,
    textAlign: 'center'
  },

  cell: {
    width: '100%',
    backgroundColor: '#F5F0E8',
    borderRadius: 6,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#0A3B28',
    borderWidth: 1,
    borderColor: '#E0D9CE'
  },

  weatherCard: { backgroundColor: '#FFFFFF', borderRadius: 20,  padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,  shadowRadius: 10,  elevation: 3, },
  weatherRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, },
  weatherInfo: { flex: 1 },
  weatherLabel: { fontSize: 16, fontWeight: '700', color: '#0A3B28' },
  weatherSubLabel: { fontSize: 12, color: '#8A8070' },
  weatherInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F0E8', borderRadius: 10, paddingHorizontal: 12, width: 80, height: 45,},
  weatherInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0A3B28', textAlign: 'center',},
  autoValue: {flex: 1, fontSize: 18, fontWeight: '700', color: '#5A9A6E', textAlign: 'center',},
  percentSymbol: { fontSize: 14, fontWeight: '600', color: '#8A8070', marginLeft: 2 },
  divider: { height: 1, backgroundColor: '#F0EBE0', marginVertical: 4 },
  errorText: { color: '#D9534F', fontSize: 12, textAlign: 'center', marginTop: 12, fontWeight: '600' },
});
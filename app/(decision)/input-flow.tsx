import { wizardHeader } from '@/src/components/decision/wizard-styles';
import StepIndicator from '@/src/components/decision/steps-indicator';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { CLIMATES, DECISION_LABELS, DecisionType, PLACEHOLDERS } from '@/src/constants';
import { ClimateColors, Colors, ForecastColors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { climateCopy, dataEntryCopy, namingCopy } from '@/src/constants/copy';
import { isForecastComputable } from '@/src/rcda/decisionTree';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function emptyFive(): string[] {
  return ['', '', '', '', ''];
}

const CLIMATE_COLOR_LIST = [
  ClimateColors.driest,
  ClimateColors.below_ave,
  ClimateColors.average,
  ClimateColors.above_ave,
  ClimateColors.wettest,
];

export default function DecisionInputFlow() {
  const router = useRouter();
  const { confirm } = useFeedback();
  const { decisionType } = useLocalSearchParams<{ decisionType: DecisionType }>();

  useEffect(() => {
    if (!decisionType) router.back();
  }, [decisionType]);

  const [names, setNames] = useState<string[]>(['', '']);
  const placeholders = decisionType ? PLACEHOLDERS[decisionType] : undefined;
  const namesFilled = names[0].trim().length > 0 && names[1].trim().length > 0;
  const namesDuplicate = namesFilled && names[0].trim().toLowerCase() === names[1].trim().toLowerCase();
  const namesValid = namesFilled && !namesDuplicate;

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

  const isOver100 = dVal + wVal > 100;
  const hasNoAverage = !isOver100 && !isForecastComputable([dVal, mid, wVal]);
  const isWeatherValid = !isOver100 && !hasNoAverage && (driest !== '' && wettest !== '');

  const adjustDriest = (delta: number) => {
    const next = Math.max(0, dVal + delta);
    if (next + wVal <= 99) setDriest(String(next));
  };
  const adjustWettest = (delta: number) => {
    const next = Math.max(0, wVal + delta);
    if (dVal + next <= 99) setWettest(String(next));
  };

  const handleDriestInput = (v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    if (cleaned === '') { setDriest(''); return; }
    setDriest(String(Math.min(100, parseInt(cleaned, 10))));
  };
  const handleWettestInput = (v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    if (cleaned === '') { setWettest(''); return; }
    setWettest(String(Math.min(100, parseInt(cleaned, 10))));
  };
  const handleDriestBlur = () => { if (driest === '') setDriest('0'); };
  const handleWettestBlur = () => { if (wettest === '') setWettest('0'); };

  // ---------- Internal step ----------
  type Step = 'naming' | 'data-0' | 'data-1' | 'weather';
  const [step, setStep] = useState<Step>('naming');

  const currentOptionIdx = step === 'data-0' ? 0 : 1;
  const currentOptionData = optionData[currentOptionIdx];

  const NUMBER_PATTERN = /^\d+(\.\d+)?$/;
  const isValidNumber = (v: string) => NUMBER_PATTERN.test(v.trim());
  const isValidPrice = (v: string) => isValidNumber(v) && Number(v) > 0;

  const isFieldInvalid = (v: string) => v.trim() !== '' && !isValidNumber(v);
  const isPriceFieldInvalid = (v: string) => v.trim() !== '' && !isValidPrice(v);

  const isDataValid = () => {
    const data = currentOptionData;
    return (
      data.yield.every(isValidNumber) &&
      data.cost.every(isValidNumber) &&
      data.addCost.every(isValidNumber) &&
      isValidPrice(data.price)
    );
  };

  const hasInvalidEntry =
    currentOptionData.yield.some(isFieldInvalid) ||
    currentOptionData.cost.some(isFieldInvalid) ||
    currentOptionData.addCost.some(isFieldInvalid) ||
    isFieldInvalid(currentOptionData.price);

  const hasPriceError = isPriceFieldInvalid(currentOptionData.price)
    || (isValidNumber(currentOptionData.price) && !isValidPrice(currentOptionData.price));

  const filledScenarioCount = CLIMATES.filter((_, i) =>
    isValidNumber(currentOptionData.yield[i]) &&
    isValidNumber(currentOptionData.cost[i]) &&
    isValidNumber(currentOptionData.addCost[i])
  ).length;

  const updateCurrentOptionField = (group: 'yield' | 'cost' | 'addCost', index: number, value: string) => {
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
      if (isDataValid()) setStep('weather');
    } else if (step === 'weather') {
      // Final navigation to results
      router.push({
        pathname: '/result',
        params: {
          decisionType: decisionType,
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

  const exitFlow = async () => {
    const hasEnteredNames = names[0].trim().length > 0 || names[1].trim().length > 0;
    if (!hasEnteredNames) {
      router.back();
      return;
    }
    const confirmed = await confirm({
      title: namingCopy.discardTitle,
      message: namingCopy.discardBody,
      confirmText: namingCopy.discardConfirm,
      cancelText: namingCopy.discardCancel,
      tone: 'destructive',
    });
    if (confirmed) router.back();
  };

  const goBack = () => {
    if (step === 'data-0') setStep('naming');
    else if (step === 'data-1') setStep('data-0');
    else if (step === 'weather') setStep('data-1');
    else exitFlow();
  };

  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

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

  if (!decisionType) return null;

  // ---------- Render naming step ----------
  if (step === 'naming') {
    const decisionLabel = DECISION_LABELS[decisionType];
    return (
      <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.container}>
            <View style={s.header}>
              <TouchableOpacity onPress={goBack} style={s.backBtn}>
                <Ionicons name="arrow-back" size={22} color={Colors.ink} />
              </TouchableOpacity>
              <StepIndicator current={current} total={total} context={decisionLabel} />
            </View>

            <View style={s.titleBlock}>
              <Text style={s.title}>{namingCopy.titleFor(decisionLabel)}</Text>
              <Text style={s.subtitle}>{namingCopy.subtitle(decisionLabel)}</Text>
            </View>

            <View style={s.namingGroup}>
              {[0, 1].map(i => (
                <View key={i} style={[s.namingCard, namesDuplicate && s.namingCardInvalid]}>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{i === 0 ? namingCopy.firstOption : namingCopy.secondOption}</Text>
                  </View>
                  <TextInput
                    style={s.namingInput}
                    placeholder={placeholders?.[i]}
                    placeholderTextColor={Colors.placeholder}
                    value={names[i]}
                    onChangeText={v => setNames(prev => { const updated = [...prev]; updated[i] = v; return updated; })}
                    returnKeyType="next"
                  />
                </View>
              ))}
            </View>
            {namesDuplicate && <Text style={s.errorText}>{namingCopy.duplicateNames}</Text>}

            <View style={s.helperRow}>
              <Ionicons name="information-circle-outline" size={19} color={Colors.inkFaint} />
              <Text style={s.helperText}>{namingCopy.helper}</Text>
            </View>

            <View style={s.footer}>
              <TouchableOpacity
                style={[s.nextBtn, !namesValid && s.nextBtnDisabled]}
                onPress={handleNext}
                disabled={!namesValid}
                activeOpacity={0.8}
              >
                <Text style={s.nextBtnText}>{namingCopy.continue}</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.onDark} />
              </TouchableOpacity>
              {!namesValid && !namesDuplicate && <Text style={s.hintText}>{namingCopy.continueDisabledHint}</Text>}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </>
    );
  }

  // ---------- Render Weather Step ----------
  else if (step === 'weather') {
    return (
      <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.container}>
            <View style={s.header}>
              <TouchableOpacity onPress={() => setStep('data-1')} style={s.backBtn}>
                <Ionicons name="arrow-back" size={22} color={Colors.ink} />
              </TouchableOpacity>
              <StepIndicator current={4} total={5} />
            </View>

            <View style={s.titleBlock}>
              <Text style={s.title}>{climateCopy.title}</Text>
              <Text style={s.subtitle}>{climateCopy.subtitle}</Text>
            </View>

            <View style={s.climateCard}>
              <View style={s.climateBar}>
                <View style={[s.climateBarSeg, { width: `${dVal}%`, backgroundColor: ForecastColors.dry }]}>
                  {dVal >= 12 && (
                    <>
                      <Text style={s.climateBarPct}>{dVal}%</Text>
                      <Text style={s.climateBarLabel}>Dry</Text>
                    </>
                  )}
                </View>
                <View style={[s.climateBarSeg, { width: `${mid}%`, backgroundColor: ForecastColors.average }]}>
                  {mid >= 12 && (
                    <>
                      <Text style={[s.climateBarPct, { color: ForecastColors.averageText }]}>{mid}%</Text>
                      <Text style={[s.climateBarLabel, { color: ForecastColors.averageText, opacity: 0.85 }]}>Average</Text>
                    </>
                  )}
                </View>
                <View style={[s.climateBarSeg, { width: `${wVal}%`, backgroundColor: ForecastColors.wet }]}>
                  {wVal >= 12 && (
                    <>
                      <Text style={s.climateBarPct}>{wVal}%</Text>
                      <Text style={s.climateBarLabel}>Wet</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Dry Years */}
              <View style={s.climateRow}>
                <View style={s.climateRowInfo}>
                  <View style={[s.climateDot, { backgroundColor: ClimateColors.driest }]} />
                  <View>
                    <Text style={s.climateRowLabel}>{climateCopy.dryYears}</Text>
                    <Text style={s.climateRowSub}>{climateCopy.dryYearsSub}</Text>
                  </View>
                </View>
                <View style={s.stepperRow}>
                  <TouchableOpacity style={s.stepperBtn} onPress={() => adjustDriest(-1)}>
                    <Ionicons name="remove" size={19} color={Colors.ink} />
                  </TouchableOpacity>
                  <TextInput
                    style={s.stepperInput}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={driest}
                    onChangeText={handleDriestInput}
                    onBlur={handleDriestBlur}
                    selectTextOnFocus
                  />
                  <TouchableOpacity style={[s.stepperBtn, s.stepperBtnAdd]} onPress={() => adjustDriest(1)}>
                    <Ionicons name="add" size={19} color={Colors.ink} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.divider} />

              {/* Average (auto) */}
              <View style={s.climateRow}>
                <View style={s.climateRowInfo}>
                  <View style={[s.climateDot, { backgroundColor: ForecastColors.average }]} />
                  <View>
                    <Text style={s.climateRowLabel}>{climateCopy.averageYears}</Text>
                    <Text style={s.climateRowSub}>{climateCopy.averageYearsSub}</Text>
                  </View>
                </View>
                <Text style={s.autoValue}>{mid}</Text>
              </View>
              <View style={s.divider} />

              {/* Wet Years */}
              <View style={s.climateRow}>
                <View style={s.climateRowInfo}>
                  <View style={[s.climateDot, { backgroundColor: ForecastColors.wet }]} />
                  <View>
                    <Text style={s.climateRowLabel}>{climateCopy.wetYears}</Text>
                    <Text style={s.climateRowSub}>{climateCopy.wetYearsSub}</Text>
                  </View>
                </View>
                <View style={s.stepperRow}>
                  <TouchableOpacity style={s.stepperBtn} onPress={() => adjustWettest(-1)}>
                    <Ionicons name="remove" size={19} color={Colors.ink} />
                  </TouchableOpacity>
                  <TextInput
                    style={s.stepperInput}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={wettest}
                    onChangeText={handleWettestInput}
                    onBlur={handleWettestBlur}
                    selectTextOnFocus
                  />
                  <TouchableOpacity style={[s.stepperBtn, s.stepperBtnAdd]} onPress={() => adjustWettest(1)}>
                    <Ionicons name="add" size={19} color={Colors.ink} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={s.offlineNoteRow}>
              <Ionicons name="cloud-offline-outline" size={19} color={Colors.inkFaint} />
              <Text style={s.offlineNoteText}>{climateCopy.offlineNote}</Text>
            </View>

            {isOver100 && (
              <Text style={s.errorText}>{climateCopy.errorOver100}</Text>
            )}
            {hasNoAverage && (
              <Text style={s.errorText}>{climateCopy.errorNoAverage}</Text>
            )}

            <View style={s.footer}>
              <TouchableOpacity
                style={[s.nextBtn, !isWeatherValid && s.nextBtnDisabled]}
                onPress={handleNext}
                disabled={!isWeatherValid}>
                <Text style={s.nextBtnText}>{climateCopy.submit}</Text>
                <Ionicons name="analytics" size={18} color={Colors.onDark} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </>
    );
  }

  // ---------- Render data entry step (for either option 0 or 1), grouped by climate scenario ----------
  const optionName = names[currentOptionIdx];
  const isSecondOption = step === 'data-1';
  const nextButtonText = isSecondOption ? dataEntryCopy.continueToClimate : dataEntryCopy.continueToOption(names[1]);

  return (
    <>
    <Stack.Screen options={{ gestureEnabled: false }} />
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={goBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.ink} />
            </TouchableOpacity>
            <StepIndicator current={current} total={total} context={optionName || undefined} />
          </View>

          <View style={s.titleBlock}>
            <Text style={s.title} numberOfLines={1}>{optionName}</Text>
            <Text style={s.subtitle}>Enter values for each climate scenario.</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            {/* Price Block - Full Width Input */}
            <View style={s.priceBlock}>
              <Ionicons name="pricetag-outline" size={20} color={Colors.accentSoft} />
              <View style={{ flex: 1 }}>
                <Text style={s.priceLabel}>{dataEntryCopy.price}</Text>
                <Text style={s.priceUnit}>{dataEntryCopy.priceUnit}</Text>
              </View>
              <View style={[s.priceInputWrap, hasPriceError && s.fieldInvalidBorder]}>
                <Text style={s.priceSymbol}>₱</Text>
                <TextInput
                  style={s.priceInput}
                  keyboardType="numeric"
                  value={currentOptionData.price}
                  onChangeText={updateCurrentOptionPrice}
                  placeholder="18.00"
                  placeholderTextColor={Colors.placeholder}
                />
              </View>
            </View>
            {hasPriceError && <Text style={s.priceErrorText}>{dataEntryCopy.errorPriceMustBePositive}</Text>}

            <Text style={s.scenariosHeading}>{dataEntryCopy.scenariosHeading}</Text>

            {CLIMATES.map((climateName, i) => (
              <View key={climateName} style={[s.scenarioCard, { borderLeftColor: CLIMATE_COLOR_LIST[i] }]}>
                <View style={s.scenarioHeader}>
                  <Text style={s.scenarioName}>{climateName}</Text>
                </View>
                <View style={s.scenarioFields}>
                  <View style={s.scenarioField}>
                    <Text style={s.scenarioFieldLabel}>{dataEntryCopy.yield} <Text style={s.scenarioFieldUnit}>{dataEntryCopy.yieldUnit}</Text></Text>
                    <TextInput
                      style={[s.scenarioInput, isFieldInvalid(currentOptionData.yield[i]) && s.fieldInvalidBorder]}
                      keyboardType="numeric"
                      value={currentOptionData.yield[i]}
                      onChangeText={v => updateCurrentOptionField('yield', i, v)}
                      placeholder="0"
                      placeholderTextColor={Colors.placeholder}
                    />
                  </View>
                  <View style={s.scenarioField}>
                    <Text style={s.scenarioFieldLabel}>{dataEntryCopy.cost} <Text style={s.scenarioFieldUnit}>{dataEntryCopy.costUnit}</Text></Text>
                    <TextInput
                      style={[s.scenarioInput, isFieldInvalid(currentOptionData.cost[i]) && s.fieldInvalidBorder]}
                      keyboardType="numeric"
                      value={currentOptionData.cost[i]}
                      onChangeText={v => updateCurrentOptionField('cost', i, v)}
                      placeholder="0"
                      placeholderTextColor={Colors.placeholder}
                    />
                  </View>
                  <View style={s.scenarioField}>
                    <Text style={s.scenarioFieldLabel}>{dataEntryCopy.addCost} <Text style={s.scenarioFieldUnit}>{dataEntryCopy.addCostUnit}</Text></Text>
                    <TextInput
                      style={[s.scenarioInput, isFieldInvalid(currentOptionData.addCost[i]) && s.fieldInvalidBorder]}
                      keyboardType="numeric"
                      value={currentOptionData.addCost[i]}
                      onChangeText={v => updateCurrentOptionField('addCost', i, v)}
                      placeholder="0"
                      placeholderTextColor={Colors.placeholder}
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={{ height: 110 }} />
          </ScrollView>
          <View style={s.footer}>
            <View style={s.footerMeta}>
              <Text style={s.footerMetaText}>{dataEntryCopy.filledCount(filledScenarioCount)}</Text>
              {hasInvalidEntry && <Text style={s.errorTextInline}>{dataEntryCopy.errorNumbersOnly}</Text>}
            </View>
            <TouchableOpacity
              style={[s.nextBtn, !isDataValid() && s.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!isDataValid()}
              activeOpacity={0.8}
            >
              <Text style={s.nextBtnText}>{nextButtonText}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.onDark} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </>
  );
}


const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { ...contentColumn, flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  ...wizardHeader,
  bold: { fontWeight: '700', color: Colors.ink },

  // Naming step
  namingGroup: { gap: 12 },
  namingCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, borderWidth: 1.5, borderColor: 'transparent' },
  namingCardInvalid: { borderColor: Colors.danger },
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.accentTint, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12 },
  badgeText: { fontSize: 13, fontWeight: '700', color: Colors.ink, letterSpacing: 0.4 },
  namingInput: { fontSize: 19, fontWeight: '700', color: Colors.ink, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: Colors.ink },
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18, paddingHorizontal: 4 },
  helperText: { flex: 1, fontSize: 13, color: Colors.inkFaint, lineHeight: 18 },

  // Data entry step
  scroll: { paddingBottom: 16 },
  priceBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 15,
    marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 1,
  },
  priceLabel: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  priceUnit: { fontSize: 12, color: Colors.inkFaint },
  priceInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.ink, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  priceSymbol: { fontSize: 15, color: Colors.inkFaint },
  priceInput: { fontSize: 18, fontWeight: '800', color: Colors.ink, minWidth: 64 },
  priceErrorText: { fontSize: 12, color: Colors.danger, fontWeight: '600', marginTop: -8, marginBottom: 12, marginLeft: 4 },

  scenariosHeading: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: Colors.inkFaint, marginBottom: 10, marginLeft: 2 },

  scenarioCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 15, marginBottom: 10, borderLeftWidth: 5 },
  scenarioHeader: { marginBottom: 12 },
  scenarioName: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  scenarioFields: { flexDirection: 'row', gap: 8 },
  scenarioField: { flex: 1 },
  scenarioFieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.inkSoft, marginBottom: 5 },
  scenarioFieldUnit: { color: Colors.inkDim },
  scenarioInput: {
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 9,
    paddingVertical: 11, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.ink,
  },
  fieldInvalidBorder: { borderColor: Colors.danger, borderWidth: 1.5 },

  footer: { position: 'absolute', bottom: 28, left: 24, right: 24 },
  footerMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  footerMetaText: { fontSize: 12, color: Colors.inkFaint },
  errorTextInline: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  nextBtn: { backgroundColor: Colors.ink, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnDisabled: { backgroundColor: Colors.disabled },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: Colors.onDark },
  hintText: { textAlign: 'center', fontSize: 12, color: Colors.inkFaint, marginTop: 9 },

  errorText: { color: Colors.danger, fontSize: 12, textAlign: 'center', marginTop: 12, fontWeight: '600' },

  // Climate step
  climateCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 16 },
  climateBar: { flexDirection: 'row', height: 64, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  climateBarSeg: { alignItems: 'center', justifyContent: 'center' },
  climateBarPct: { fontSize: 20, fontWeight: '800', color: Colors.onDark },
  climateBarLabel: { fontSize: 11, fontWeight: '600', color: Colors.onDark, opacity: 0.9 },

  climateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  climateRowInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  climateDot: { width: 12, height: 12, borderRadius: 3 },
  climateRowLabel: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  climateRowSub: { fontSize: 12, color: Colors.inkFaint },
  divider: { height: 1, backgroundColor: Colors.divider },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.divider, alignItems: 'center', justifyContent: 'center' },
  stepperBtnAdd: { backgroundColor: Colors.accentTint },
  stepperValue: { fontSize: 20, fontWeight: '800', color: Colors.ink, minWidth: 40, textAlign: 'center' },
  stepperInput: {
    fontSize: 20, fontWeight: '800', color: Colors.ink, minWidth: 48, textAlign: 'center',
    paddingVertical: 6, paddingHorizontal: 4, backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 8,
  },
  autoValue: { fontSize: 20, fontWeight: '800', color: Colors.accentSoft, backgroundColor: Colors.divider, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },

  offlineNoteRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 4 },
  offlineNoteText: { flex: 1, fontSize: 13, color: Colors.inkFaint, lineHeight: 18 },
});

import { useAuth } from '@/src/auth/AuthContext';
import { TermHelpButton } from '@/src/components/help/term-help';
import { ForecastDonut } from '@/src/components/decision/forecast-donut';
import { PredefinedPicker } from '@/src/components/decision/predefined-picker';
import { wizardHeader } from '@/src/components/decision/wizard-styles';
import { GradientText } from '@/src/components/ui/gradient-text';
import StepIndicator from '@/src/components/decision/steps-indicator';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { CLIMATES, DECISION_LABELS, DecisionType, PLACEHOLDERS } from '@/src/constants';
import { BrandGradient, brandGradientCss, CARD_PADDING, cardShadow, cardSurface, Colors, ForecastColors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { climateCopy, dataEntryCopy, namingCopy, predefinedCopy } from '@/src/constants/copy';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { isForecastComputable } from '@/src/rcda/decisionTree';
import { formatNumberDisplay, normalizeNumberInput } from '@/src/utils/numberInput';
import { PredefinedOption, climateRowToFormValues } from '@/src/utils/predefinedOptions';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OptionEntry = { yield: string[]; cost: string[]; addCost: string[]; price: string };
// What an option looked like before saved values were loaded, so Remove can put it back.
type LoadedSaved = { id: string; before: { name: string; data: OptionEntry } };

function emptyFive(): string[] {
  return ['', '', '', '', ''];
}

export default function DecisionInputFlow() {
  const router = useRouter();
  const { confirm, notify } = useFeedback();
  const { user } = useAuth();
  const { connected } = useSyncStatus();
  const { decisionType } = useLocalSearchParams<{ decisionType: DecisionType }>();

  useEffect(() => {
    if (!decisionType) router.back();
  }, [decisionType]);

  const [names, setNames] = useState<string[]>(['', '']);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<(LoadedSaved | null)[]>([null, null]);
  const placeholders = decisionType ? PLACEHOLDERS[decisionType] : undefined;
  const namesFilled = names[0].trim().length > 0 && names[1].trim().length > 0;
  const namesDuplicate = namesFilled && names[0].trim().toLowerCase() === names[1].trim().toLowerCase();
  const namesValid = namesFilled && !namesDuplicate;

  const [optionData, setOptionData] = useState<OptionEntry[]>([
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
  const handleDonutChange = (nextDriest: number, nextWettest: number) => {
    setDriest(String(nextDriest));
    setWettest(String(nextWettest));
  };
  const handleDriestBlur = () => { if (driest === '') setDriest('0'); };
  const handleWettestBlur = () => { if (wettest === '') setWettest('0'); };

  // ---------- Internal step ----------
  type Step = 'naming' | 'data-0' | 'data-1' | 'weather';
  const [step, setStep] = useState<Step>('naming');

  const currentOptionIdx = step === 'data-0' ? 0 : 1;
  const currentOptionData = optionData[currentOptionIdx];

  const NUMBER_PATTERN = /^\d+(\.\d*)?$/;
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
      newGroup[index] = normalizeNumberInput(value);
      updated[currentOptionIdx] = { ...updated[currentOptionIdx], [group]: newGroup };
      return updated;
    });
  };

  const applyPredefined = (index: number, option: PredefinedOption) => {
    const values = climateRowToFormValues(option);
    setNames(prev => { const next = [...prev]; next[index] = values.name; return next; });
    setOptionData(prev => {
      const next = [...prev];
      next[index] = { yield: values.yield, cost: values.cost, addCost: values.addCost, price: values.price };
      return next;
    });
    setLoaded(prev => {
      const next = [...prev];
      next[index] = { id: option.id, before: prev[index]?.before ?? { name: names[index], data: optionData[index] } };
      return next;
    });
    setPickerFor(null);
    notify.success(predefinedCopy.loaded(values.name), predefinedCopy.loadedBody);
  };

  const removePredefined = (index: number) => {
    const entry = loaded[index];
    if (!entry) return;
    setNames(prev => { const next = [...prev]; next[index] = entry.before.name; return next; });
    setOptionData(prev => { const next = [...prev]; next[index] = entry.before.data; return next; });
    setLoaded(prev => { const next = [...prev]; next[index] = null; return next; });
    notify.success(predefinedCopy.removed);
  };

  const updateCurrentOptionPrice = (value: string) => {
    setOptionData(prev => {
      const updated = [...prev];
      updated[currentOptionIdx] = { ...updated[currentOptionIdx], price: normalizeNumberInput(value) };
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

  // Only while this screen is focused; a mounted-but-hidden wizard must not swallow back presses elsewhere.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBackRef.current();
        return true;
      });
      return () => sub.remove();
    }, [])
  );

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
                  {user && (
                    <View style={s.useSavedRow}>
                      {loaded[i] ? (
                        <View style={[s.useSavedBtn, s.loadedBtn]}>
                          <TouchableOpacity
                            style={s.loadedBody}
                            onPress={() => setPickerFor(i)}
                            disabled={!connected}
                            accessibilityRole="button"
                            accessibilityLabel={predefinedCopy.showSavedLabel}
                          >
                            <Ionicons name="checkmark-circle" size={16} color={Colors.onDark} />
                            <Text style={s.loadedBtnText}>{predefinedCopy.loadedTag}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.loadedClear}
                            onPress={() => removePredefined(i)}
                            accessibilityRole="button"
                            accessibilityLabel={predefinedCopy.removeLabel}
                            hitSlop={8}
                          >
                            <Ionicons name="close" size={16} color={Colors.onDark} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[s.useSavedBtn, !connected && s.useSavedBtnDisabled]}
                          onPress={() => setPickerFor(i)}
                          disabled={!connected}
                          accessibilityRole="button"
                        >
                          <Ionicons name={connected ? 'download-outline' : 'cloud-offline-outline'} size={16} color={connected ? Colors.accent : Colors.inkFaint} />
                          <Text style={[s.useSavedText, !connected && s.useSavedTextDisabled]}>
                            {connected ? predefinedCopy.useSaved : predefinedCopy.goOnline}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
            {namesDuplicate && <Text style={s.errorText}>{namingCopy.duplicateNames}</Text>}

            {user && decisionType && (
              <PredefinedPicker
                visible={pickerFor !== null}
                decisionType={decisionType}
                userId={user.id}
                currentId={pickerFor !== null ? loaded[pickerFor]?.id ?? null : null}
                takenId={pickerFor !== null ? loaded[1 - pickerFor]?.id ?? null : null}
                takenLabel={pickerFor === 0 ? predefinedCopy.usedBySecond : predefinedCopy.usedByFirst}
                onPick={option => pickerFor !== null && applyPredefined(pickerFor, option)}
                onClose={() => setPickerFor(null)}
              />
            )}

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
              <View style={s.subtitleRow}>
                <Text style={[s.subtitle, { flex: 1 }]}>{climateCopy.subtitle}</Text>
                <TermHelpButton terms={['forecast', 'normalYear', 'scenarios']} />
              </View>
            </View>

            <View style={s.climateCard}>
              <View style={s.donutWrap}>
                <ForecastDonut
                  driest={dVal}
                  wettest={wVal}
                  labels={{ dry: climateCopy.dryYears, average: climateCopy.averageYears, wet: climateCopy.wetYears }}
                  onChange={handleDonutChange}
                />
                <Text style={s.donutHint}>{climateCopy.donutHint}</Text>
              </View>

              {/* Dry Years */}
              <View style={s.climateRow}>
                <View style={s.climateRowInfo}>
                  <View style={[s.climateDot, { backgroundColor: ForecastColors.dry }]} />
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
                style={[s.nextBtn, isWeatherValid ? s.calcBtn : s.nextBtnDisabled]}
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
            <GradientText text={optionName} colors={BrandGradient} style={s.optionTitle} numberOfLines={1} />
            <Text style={s.subtitle}>Enter values for each climate scenario.</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            {/* Price Block - Full Width Input */}
            <View style={s.priceBlock}>
              <Ionicons name="pricetag-outline" size={20} color={Colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={s.priceLabel}>{dataEntryCopy.price}</Text>
                <Text style={s.priceUnit}>{dataEntryCopy.priceUnit}</Text>
              </View>
              <View style={[s.priceInputWrap, hasPriceError && s.fieldInvalidBorder]}>
                <Text style={s.priceSymbol}>₱</Text>
                <TextInput
                  style={s.priceInput}
                  keyboardType="numeric"
                  value={formatNumberDisplay(currentOptionData.price)}
                  onChangeText={updateCurrentOptionPrice}
                  placeholder="18.00"
                  placeholderTextColor={Colors.placeholder}
                />
              </View>
            </View>
            {hasPriceError && <Text style={s.priceErrorText}>{dataEntryCopy.errorPriceMustBePositive}</Text>}

            <View style={s.scenariosHeadingRow}>
              <Text style={[s.scenariosHeading, { marginBottom: 0 }]}>{dataEntryCopy.scenariosHeading}</Text>
              <TermHelpButton terms={['scenarios', 'price', 'yield', 'cost', 'addCost']} />
            </View>

            {CLIMATES.map((climateName, i) => (
              <View key={climateName} style={s.scenarioCard}>
                <View style={s.scenarioHeader}>
                  <Text style={s.scenarioName}>{climateName}</Text>
                  <Text style={s.scenarioMeaning}>{dataEntryCopy.scenarioMeaning[i]}</Text>
                </View>
                <View style={s.scenarioFields}>
                  <View style={s.scenarioField}>
                    <Text style={s.scenarioFieldLabel}>{dataEntryCopy.yield} <Text style={s.scenarioFieldUnit}>{dataEntryCopy.yieldUnit}</Text></Text>
                    <TextInput
                      style={[s.scenarioInput, isFieldInvalid(currentOptionData.yield[i]) && s.fieldInvalidBorder]}
                      keyboardType="numeric"
                      value={formatNumberDisplay(currentOptionData.yield[i])}
                      onChangeText={v => updateCurrentOptionField('yield', i, v)}
                      placeholder="0"
                      placeholderTextColor={Colors.placeholder}
                    />
                  </View>
                  <View style={s.scenarioField}>
                    <Text style={s.scenarioFieldLabel}>{dataEntryCopy.cost} <Text style={s.scenarioFieldUnit}>{dataEntryCopy.costUnit}</Text></Text>
                    <View style={[s.scenarioInput, s.moneyInputWrap, isFieldInvalid(currentOptionData.cost[i]) && s.fieldInvalidBorder]}>
                      <Text style={s.moneySymbol}>₱</Text>
                      <TextInput
                        style={s.moneyInput}
                        keyboardType="numeric"
                        value={formatNumberDisplay(currentOptionData.cost[i])}
                        onChangeText={v => updateCurrentOptionField('cost', i, v)}
                        placeholder="0"
                        placeholderTextColor={Colors.placeholder}
                      />
                    </View>
                  </View>
                  <View style={s.scenarioField}>
                    <Text style={s.scenarioFieldLabel}>{dataEntryCopy.addCost} <Text style={s.scenarioFieldUnit}>{dataEntryCopy.addCostUnit}</Text></Text>
                    <View style={[s.scenarioInput, s.moneyInputWrap, isFieldInvalid(currentOptionData.addCost[i]) && s.fieldInvalidBorder]}>
                      <Text style={s.moneySymbol}>₱</Text>
                      <TextInput
                        style={s.moneyInput}
                        keyboardType="numeric"
                        value={formatNumberDisplay(currentOptionData.addCost[i])}
                        onChangeText={v => updateCurrentOptionField('addCost', i, v)}
                        placeholder="0"
                        placeholderTextColor={Colors.placeholder}
                      />
                    </View>
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
  namingCard: { ...cardSurface, padding: CARD_PADDING },
  namingCardInvalid: { borderColor: Colors.danger },
  badge: { alignSelf: 'flex-start', marginBottom: 10 },
  badgeText: { fontSize: 14, fontWeight: '700', color: Colors.inkSoft },
  namingInput: { fontSize: 19, fontWeight: '700', color: Colors.ink, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: Colors.ink },
  useSavedRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  useSavedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.accentTintStrong, backgroundColor: Colors.accentTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  useSavedBtnDisabled: { borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  useSavedText: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  useSavedTextDisabled: { color: Colors.inkFaint, fontWeight: '600' },
  loadedBtn: { backgroundColor: Colors.accent, borderColor: Colors.accent, paddingVertical: 0, paddingHorizontal: 0, gap: 0 },
  loadedBody: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 8, paddingVertical: 7 },
  loadedBtnText: { fontSize: 13, fontWeight: '700', color: Colors.onDark },
  loadedClear: { paddingLeft: 8, paddingRight: 10, paddingVertical: 7, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.35)' },
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18, paddingHorizontal: 4 },
  helperText: { flex: 1, fontSize: 13, color: Colors.inkFaint, lineHeight: 18 },

  // Data entry step
  scroll: { paddingBottom: 16 },
  priceBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 15,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: 14, ...cardShadow,
  },
  priceLabel: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  priceUnit: { fontSize: 12, color: Colors.inkFaint },
  priceInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  priceSymbol: { fontSize: 15, color: Colors.inkFaint },
  priceInput: { fontSize: 18, fontWeight: '800', color: Colors.ink, minWidth: 64 },
  priceErrorText: { fontSize: 12, color: Colors.danger, fontWeight: '600', marginTop: -8, marginBottom: 12, marginLeft: 4 },

  scenariosHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  subtitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  scenariosHeading: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: Colors.inkFaint, marginBottom: 10, marginLeft: 2 },

  scenarioCard: { ...cardSurface, padding: CARD_PADDING, marginBottom: 12 },
  scenarioHeader: { marginBottom: 12 },
  optionTitle: { ...wizardHeader.title, fontSize: 30, lineHeight: 36, marginBottom: 6 },
  scenarioName: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  scenarioMeaning: { fontSize: 12, color: Colors.inkFaint, marginTop: 2 },
  scenarioFields: { flexDirection: 'row', gap: 8 },
  scenarioField: { flex: 1 },
  scenarioFieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.inkSoft, marginBottom: 5 },
  scenarioFieldUnit: { color: Colors.inkDim },
  scenarioInput: {
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 9,
    paddingVertical: 11, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.ink,
  },
  moneyInputWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 0, paddingHorizontal: 6 },
  moneySymbol: { fontSize: 13, color: Colors.inkFaint, marginRight: 2 },
  moneyInput: { flexShrink: 1, paddingVertical: 11, fontSize: 15, fontWeight: '700', color: Colors.ink, textAlign: 'center' },
  fieldInvalidBorder: { borderColor: Colors.danger, borderWidth: 1.5 },

  footer: { position: 'absolute', bottom: 28, left: 24, right: 24 },
  footerMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  footerMetaText: { fontSize: 12, color: Colors.inkFaint },
  errorTextInline: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  nextBtn: { backgroundColor: Colors.ink, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnDisabled: { backgroundColor: Colors.disabled },
  calcBtn: { experimental_backgroundImage: brandGradientCss(90) },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: Colors.onDark },
  hintText: { textAlign: 'center', fontSize: 12, color: Colors.inkFaint, marginTop: 9 },

  errorText: { color: Colors.danger, fontSize: 12, textAlign: 'center', marginTop: 12, fontWeight: '600' },

  // Climate step
  climateCard: { ...cardSurface, padding: CARD_PADDING, marginBottom: 16 },
  donutWrap: { alignItems: 'center', marginBottom: 8 },
  donutHint: { fontSize: 12, color: Colors.inkFaint, marginTop: 8, textAlign: 'center' },

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
    paddingVertical: 6, paddingHorizontal: 4, backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 8,
  },
  autoValue: { fontSize: 20, fontWeight: '800', color: Colors.ink, backgroundColor: Colors.divider, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },

  offlineNoteRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 4 },
  offlineNoteText: { flex: 1, fontSize: 13, color: Colors.inkFaint, lineHeight: 18 },
});

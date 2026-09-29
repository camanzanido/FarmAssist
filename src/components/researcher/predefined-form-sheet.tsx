import { CLIMATES, DECISIONS, DecisionType } from '@/src/constants';
import { ResearcherColors as C } from '@/src/constants/colors';
import type { PredefinedInput } from '@/src/database/repositories/predefined';
import { formatNumberDisplay, normalizeNumberInput } from '@/src/utils/numberInput';
import { emptyFormValues, OptionFormValues, predefinedKey, validateOptionForm } from '@/src/utils/predefinedOptions';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

type Group = 'yield' | 'cost' | 'addCost';
const GROUPS: { key: Group; label: string; money: boolean }[] = [
  { key: 'yield', label: 'Yield kg/ha', money: false },
  { key: 'cost', label: 'Cost /ha', money: true },
  { key: 'addCost', label: 'Add\'l /ha', money: true },
];

export type PredefinedFormMode = 'create' | 'edit' | 'publish';

export interface PredefinedFormInitial {
  decisionType: DecisionType;
  province: string;
  municipality: string;
  values: OptionFormValues;
  source: { entries: number; farmers: number } | null;
}

const TITLES: Record<PredefinedFormMode, string> = {
  create: 'New predefined option',
  edit: 'Edit predefined option',
  publish: 'Review farmer average',
};

export function PredefinedFormSheet({
  visible, mode, initial, knownPlaces, publishedIds, editingId, saving, onCancel, onSave, onDelete,
}: {
  visible: boolean;
  mode: PredefinedFormMode;
  initial: PredefinedFormInitial;
  knownPlaces: Record<string, string[]>;
  publishedIds: Map<string, string>;
  editingId?: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: PredefinedInput) => void;
  onDelete?: () => void;
}) {
  const [decisionType, setDecisionType] = useState<DecisionType>(initial.decisionType);
  const [province, setProvince] = useState(initial.province);
  const [municipality, setMunicipality] = useState(initial.municipality);
  const [values, setValues] = useState<OptionFormValues>(initial.values);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDecisionType(initial.decisionType);
    setProvince(initial.province);
    setMunicipality(initial.municipality);
    setValues(initial.values);
    setSubmitted(false);
  }, [visible, initial]);

  const knownProvinces = Object.keys(knownPlaces).sort((a, b) => a.localeCompare(b));
  const provinceKey = knownProvinces.find((p) => p.toLowerCase() === province.trim().toLowerCase());
  const knownCities = provinceKey ? knownPlaces[provinceKey] : [];

  const changeProvince = (next: string) => {
    if (next.trim().toLowerCase() !== province.trim().toLowerCase()) setMunicipality('');
    setProvince(next);
  };

  const effectiveMunicipality = province.trim() ? municipality : '';
  const clashId = publishedIds.get(predefinedKey({ decision_type: decisionType, option_name: values.name, province, municipality: effectiveMunicipality }));
  const clashesWithOther = mode === 'edit' && !!clashId && clashId !== editingId;
  const replacesExisting = mode !== 'edit' && !!clashId;

  const errors = validateOptionForm(values);
  const show = (e?: string) => (submitted ? e : undefined);

  const setField = (group: Group, i: number, text: string) =>
    setValues((v) => {
      const next = [...v[group]];
      next[i] = normalizeNumberInput(text);
      return { ...v, [group]: next };
    });

  const save = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || clashesWithOther) return;
    onSave({ decisionType, province, municipality: effectiveMunicipality, values, source: initial.source });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <View style={s.sheet}>
          <View style={s.grabber} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.title}>{TITLES[mode]}</Text>
            <Text style={s.subtitle}>
              {mode === 'publish'
                ? 'Fix anything that looks wrong, then publish so signed-in farmers can load these values.'
                : 'Signed-in farmers can load these values into their decision.'}
            </Text>
            {initial.source && (
              <View style={s.sourceNote}>
                <Ionicons name="people-outline" size={16} color={C.accent} />
                <Text style={s.sourceText}>
                  Averaged from {initial.source.entries} {initial.source.entries === 1 ? 'entry' : 'entries'} by {initial.source.farmers} {initial.source.farmers === 1 ? 'farmer' : 'farmers'}
                </Text>
              </View>
            )}

            <Text style={s.label}>DECISION TYPE</Text>
            <View style={s.chipRow}>
              {DECISIONS.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[s.chip, decisionType === d.id && s.chipActive]}
                  onPress={() => setDecisionType(d.id)}
                  accessibilityState={{ selected: decisionType === d.id }}
                >
                  <Text style={[s.chipText, decisionType === d.id && s.chipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>OPTION NAME</Text>
            <TextInput
              style={[s.input, show(errors.name) && s.inputError]}
              value={values.name}
              onChangeText={(name) => setValues((v) => ({ ...v, name }))}
              placeholder="e.g. Rice IR64"
              placeholderTextColor={C.textMuted}
            />
            {show(errors.name) && <Text style={s.error}>{errors.name}</Text>}

            <Text style={s.label}>PROVINCE</Text>
            <TextInput
              style={s.input}
              value={province}
              onChangeText={changeProvince}
              placeholder="All provinces"
              placeholderTextColor={C.textMuted}
            />
            <View style={[s.chipRow, { marginTop: 8 }]}>
              <TouchableOpacity style={[s.chip, !province.trim() && s.chipActive]} onPress={() => changeProvince('')}>
                <Text style={[s.chipText, !province.trim() && s.chipTextActive]}>All provinces</Text>
              </TouchableOpacity>
              {knownProvinces.map((p) => {
                const active = province.trim().toLowerCase() === p.toLowerCase();
                return (
                  <TouchableOpacity key={p} style={[s.chip, active && s.chipActive]} onPress={() => changeProvince(p)}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {province.trim() !== '' && (
              <>
                <Text style={s.label}>CITY / MUNICIPALITY</Text>
                <TextInput
                  style={s.input}
                  value={municipality}
                  onChangeText={setMunicipality}
                  placeholder="Whole province"
                  placeholderTextColor={C.textMuted}
                />
                <View style={[s.chipRow, { marginTop: 8 }]}>
                  <TouchableOpacity style={[s.chip, !municipality.trim() && s.chipActive]} onPress={() => setMunicipality('')}>
                    <Text style={[s.chipText, !municipality.trim() && s.chipTextActive]}>Whole province</Text>
                  </TouchableOpacity>
                  {knownCities.map((c) => {
                    const active = municipality.trim().toLowerCase() === c.toLowerCase();
                    return (
                      <TouchableOpacity key={c} style={[s.chip, active && s.chipActive]} onPress={() => setMunicipality(c)}>
                        <Text style={[s.chipText, active && s.chipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={s.label}>SELLING PRICE (PER KG)</Text>
            <View style={[s.input, s.moneyRow, show(errors.price) && s.inputError]}>
              <Text style={s.peso}>₱</Text>
              <TextInput
                style={s.moneyInput}
                keyboardType="numeric"
                value={formatNumberDisplay(values.price)}
                onChangeText={(t) => setValues((v) => ({ ...v, price: normalizeNumberInput(t) }))}
                placeholder="0"
                placeholderTextColor={C.textMuted}
              />
            </View>
            {show(errors.price) && <Text style={s.error}>{errors.price}</Text>}

            <Text style={s.label}>SCENARIOS</Text>
            <View style={s.gridHead}>
              <Text style={[s.gridHeadText, s.gridName]} />
              {GROUPS.map((g) => <Text key={g.key} style={s.gridHeadText}>{g.label}</Text>)}
            </View>
            {CLIMATES.map((climate, i) => (
              <View key={climate} style={s.gridRow}>
                <Text style={[s.gridName, s.gridNameText]} numberOfLines={2}>{climate}</Text>
                {GROUPS.map((g) => (
                  <View key={g.key} style={[s.cell, submitted && !/^\d/.test(values[g.key][i]) && s.inputError]}>
                    {g.money && <Text style={s.cellPeso}>₱</Text>}
                    <TextInput
                      style={s.cellInput}
                      keyboardType="numeric"
                      value={formatNumberDisplay(values[g.key][i])}
                      onChangeText={(t) => setField(g.key, i, t)}
                      placeholder="0"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>
                ))}
              </View>
            ))}
            {show(errors.scenarios) && <Text style={s.error}>{errors.scenarios}</Text>}

            {clashesWithOther && (
              <Text style={[s.error, { marginTop: 14 }]}>Another published option already uses this name and place.</Text>
            )}
            {replacesExisting && (
              <View style={[s.sourceNote, s.replaceNote]}>
                <Ionicons name="swap-horizontal-outline" size={16} color={C.amberText} />
                <Text style={[s.sourceText, { color: C.amberText }]}>Already published for this place. Publishing replaces those values.</Text>
              </View>
            )}

            <View style={s.actions}>
              {mode === 'edit' && onDelete && (
                <TouchableOpacity style={s.deleteBtn} onPress={onDelete} disabled={saving} accessibilityLabel="Delete option">
                  <Ionicons name="trash-outline" size={20} color={C.danger} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.cancelBtn} onPress={onCancel} disabled={saving}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, saving && s.disabled]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color={C.accentDeepText} /> : <Text style={s.saveText}>{mode === 'edit' ? 'Save' : 'Publish'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const blankPredefinedForm = (decisionType: DecisionType = 'crop_choice'): PredefinedFormInitial => ({
  decisionType,
  province: '',
  municipality: '',
  values: emptyFormValues(),
  source: null,
});

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: C.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 30, maxHeight: '94%',
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.24)', alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13.5, color: C.textSoft, marginBottom: 18 },
  sourceNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 4 },
  sourceText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textSoft },
  replaceNote: { backgroundColor: C.amberBg, marginTop: 14 },

  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: C.cardBorder, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textSoft },
  chipTextActive: { color: C.accentDeepText, fontWeight: '800' },

  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, color: C.text },
  inputError: { borderColor: C.danger },
  error: { fontSize: 12.5, color: C.danger, marginTop: 6 },
  moneyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  peso: { fontSize: 15, color: C.textSoft },
  moneyInput: { flex: 1, fontSize: 15, color: C.text, height: '100%' },

  gridHead: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  gridHeadText: { flex: 1, fontSize: 11, fontWeight: '700', color: C.textFaint, textAlign: 'center' },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  gridName: { flex: 0.9 },
  gridNameText: { fontSize: 12.5, fontWeight: '600', color: C.textSoft },
  cell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10, height: 42, paddingHorizontal: 4 },
  cellPeso: { fontSize: 12, color: C.textFaint, marginRight: 1 },
  cellInput: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center', height: '100%' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  deleteBtn: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(224,133,133,0.4)', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: C.text },
  saveBtn: { flex: 1.4, height: 52, borderRadius: 14, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15.5, fontWeight: '800', color: C.accentDeepText },
  disabled: { opacity: 0.5 },
});

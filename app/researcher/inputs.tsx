import { useAuth } from '@/src/auth/AuthContext';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { blankPredefinedForm, PredefinedFormInitial, PredefinedFormSheet } from '@/src/components/researcher/predefined-form-sheet';
import { DECISIONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { ResearcherColors as C } from '@/src/constants/colors';
import { wideColumn } from '@/src/constants/layout';
import {
  createPredefinedOption, deletePredefinedOption, fetchPredefinedOptions, PredefinedInput, updatePredefinedOption,
} from '@/src/database/repositories/predefined';
import { fetchAllLocations } from '@/src/database/repositories/researcher';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { getActionErrorMessage } from '@/src/utils/errors';
import { formatCurrency } from '@/src/utils/formatters';
import { PredefinedOption, predefinedToFormValues } from '@/src/utils/predefinedOptions';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TypeFilter = 'all' | DecisionType;
type Editing = { mode: 'create' } | { mode: 'edit'; option: PredefinedOption };

const EMPTY = { options: [] as PredefinedOption[], provinces: [] as string[] };

export default function ResearcherInputsScreen() {
  const { user } = useAuth();
  const { confirm, notify } = useFeedback();

  const fetchAll = useCallback(async () => {
    const [options, locations] = await Promise.all([fetchPredefinedOptions(), fetchAllLocations()]);
    const provinces = new Map<string, string>();
    for (const l of locations) {
      const p = (l.province ?? '').trim();
      if (p && !provinces.has(p.toLowerCase())) provinces.set(p.toLowerCase(), p);
    }
    return { options, provinces: [...provinces.values()].sort((a, b) => a.localeCompare(b)) };
  }, []);
  const { data: { options, provinces }, isLoading, error, reload } = useResearcherFetch(fetchAll, EMPTY);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [formInitial, setFormInitial] = useState<PredefinedFormInitial>(() => blankPredefinedForm());
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => (typeFilter === 'all' ? options : options.filter((o) => o.decision_type === typeFilter)),
    [options, typeFilter]
  );

  const openCreate = () => {
    setFormInitial(blankPredefinedForm(typeFilter === 'all' ? 'crop_choice' : typeFilter));
    setEditing({ mode: 'create' });
  };

  const openEdit = (option: PredefinedOption) => {
    setFormInitial({
      decisionType: option.decision_type as DecisionType,
      province: option.province ?? '',
      values: predefinedToFormValues(option),
    });
    setEditing({ mode: 'edit', option });
  };

  const handleSave = async (input: PredefinedInput) => {
    if (!editing || !user) return;
    setSaving(true);
    try {
      if (editing.mode === 'create') await createPredefinedOption(input, user.id);
      else await updatePredefinedOption(editing.option.id, input);
      setEditing(null);
      notify.success(editing.mode === 'create' ? 'Option added' : 'Option updated');
      reload();
    } catch (err) {
      console.error('Failed to save predefined option:', err);
      setEditing(null);
      notify.error('Could not save option', getActionErrorMessage(err, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (editing?.mode !== 'edit') return;
    const option = editing.option;
    setEditing(null);
    const confirmed = await confirm({
      title: 'Delete this option?',
      message: `Farmers will no longer be able to load "${option.option_name}". Decisions already made with it are not affected.`,
      confirmText: 'Delete',
      tone: 'destructive',
      icon: 'trash-outline',
    });
    if (!confirmed) return;
    try {
      await deletePredefinedOption(option.id);
      notify.success('Option deleted');
      reload();
    } catch (err) {
      console.error('Failed to delete predefined option:', err);
      notify.error('Could not delete option', getActionErrorMessage(err, 'Please try again.'));
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load predefined inputs. Check your connection."
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Inputs</Text>
              <Text style={s.subtitle}>Predefined values farmers can load into a decision</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={openCreate} accessibilityLabel="Add predefined option">
              <Ionicons name="add" size={20} color={C.accentDeepText} />
              <Text style={s.addText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={s.filterRow}>
            <TouchableOpacity style={[s.filterChip, typeFilter === 'all' && s.filterChipActive]} onPress={() => setTypeFilter('all')}>
              <Text style={[s.filterChipText, typeFilter === 'all' && s.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {DECISIONS.map((d) => (
              <TouchableOpacity key={d.id} style={[s.filterChip, typeFilter === d.id && s.filterChipActive]} onPress={() => setTypeFilter(d.id)}>
                <Text style={[s.filterChipText, typeFilter === d.id && s.filterChipTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon="options-outline"
              title={options.length === 0 ? 'No predefined inputs yet.' : 'None for this decision type.'}
              subtitle="Tap Add to create values farmers can load instead of typing them."
            />
          ) : (
            filtered.map((o) => (
              <TouchableOpacity key={o.id} style={s.row} onPress={() => openEdit(o)} activeOpacity={0.75}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName} numberOfLines={1}>{o.option_name}</Text>
                  <Text style={s.rowMeta}>
                    {DECISION_LABELS[o.decision_type as DecisionType] ?? o.decision_type} · {o.province?.trim() || 'All provinces'}
                  </Text>
                </View>
                <Text style={s.rowPrice}>{formatCurrency(o.price)}/kg</Text>
                <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </ResearcherAsyncState>

      <PredefinedFormSheet
        visible={editing !== null}
        mode={editing?.mode ?? 'create'}
        initial={formInitial}
        knownProvinces={provinces}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, color: C.textFaint, marginTop: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.accentStrong },
  addText: { fontSize: 14, fontWeight: '800', color: C.accentDeepText },

  filterRow: { flexDirection: 'row', gap: 7, marginBottom: 18, flexWrap: 'wrap' },
  filterChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  filterChipActive: { backgroundColor: C.accentStrong },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: C.textSoft },
  filterChipTextActive: { color: C.accentDeepText, fontWeight: '700' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 9 },
  rowName: { fontSize: 15.5, fontWeight: '700', color: C.text },
  rowMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 3 },
  rowPrice: { fontSize: 13.5, fontWeight: '800', color: C.accent },
});

import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { Skeleton } from '@/src/components/ui/skeleton';
import { inputSurface, inputTextStyle, ResearcherColors as C } from '@/src/constants/colors';
import { BUTTON_HEIGHT } from '@/src/constants/layout';
import { fetchCityStats, type CityStats, type Place } from '@/src/database/repositories/researcher';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const placeKey = (p: Place) => `${p.city}|${p.province}`;

type Props = {
  visible: boolean;
  selected: Place[];
  onClose: () => void;
  onApply: (places: Place[]) => void;
};

// Picks one or more municipalities; changes only apply on "Apply" so the stats reload once.
export function LocationFilterSheet({ visible, selected, onClose, onApply }: Props) {
  const [cities, setCities] = useState<CityStats[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setDraft(new Set(selected.map(placeKey)));
    setQuery('');
    let cancelled = false;
    setLoadFailed(false);
    fetchCityStats()
      .then(rows => { if (!cancelled) setCities(rows); })
      .catch(err => {
        console.error('Failed to load locations for the overview filter:', err);
        if (!cancelled) setLoadFailed(true);
      });
    return () => { cancelled = true; };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!cities || !q) return cities ?? [];
    return cities.filter(c => c.city.toLowerCase().includes(q) || c.province.toLowerCase().includes(q));
  }, [cities, query]);

  const toggle = (p: Place) => setDraft(prev => {
    const next = new Set(prev);
    const key = placeKey(p);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const apply = () => {
    const places = (cities ?? []).filter(c => draft.has(placeKey(c))).map(c => ({ city: c.city, province: c.province }));
    onApply(places);
    onClose();
  };

  const clear = () => {
    onApply([]);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <Text style={s.title}>Filter by location</Text>
      <Text style={s.subtitle}>
        {draft.size === 0 ? 'Showing all locations' : `${draft.size} location${draft.size === 1 ? '' : 's'} selected`}
      </Text>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={19} color={C.textFaint} />
        <TextInput
          style={s.searchInput}
          placeholder="Search municipality or province"
          placeholderTextColor={C.textFaint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={C.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.listCard}>
        {loadFailed ? (
          <Text style={s.message}>Couldn&apos;t load locations. Check your connection.</Text>
        ) : cities === null ? (
          <View style={s.skeletons}>
            {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={20} />)}
          </View>
        ) : filtered.length === 0 ? (
          <Text style={s.message}>{cities.length === 0 ? 'No locations with decisions yet.' : 'No municipalities match your search.'}</Text>
        ) : filtered.map((c, i) => {
          const isOn = draft.has(placeKey(c));
          return (
            <TouchableOpacity
              key={placeKey(c)}
              style={[s.row, i < filtered.length - 1 && s.rowBorder]}
              onPress={() => toggle(c)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={`${c.city}, ${c.province}`}
            >
              <View style={[s.checkbox, isOn && s.checkboxChecked]}>
                {isOn && <Ionicons name="checkmark" size={15} color={C.accentDeepText} />}
              </View>
              <View style={s.rowPlace}>
                <Text style={s.rowCity} numberOfLines={1}>{c.city}</Text>
                <Text style={s.rowProvince} numberOfLines={1}>{c.province}</Text>
              </View>
              <Text style={s.rowCount}>{c.decisions}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity style={s.clearBtn} onPress={clear} accessibilityRole="button">
          <Text style={s.clearBtnText}>All locations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.applyBtn, cities === null && s.applyBtnDisabled]}
          onPress={apply}
          disabled={cities === null}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.applyBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13.5, color: C.textSoft, marginBottom: 16 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
    borderWidth: 1, ...inputSurface, borderRadius: 13, height: 46, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, ...inputTextStyle, padding: 0 },

  listCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, overflow: 'hidden', marginBottom: 18 },
  skeletons: { gap: 14, padding: 15 },
  message: { fontSize: 13.5, color: C.textSoft, textAlign: 'center', padding: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  rowPlace: { flex: 1 },
  rowCity: { fontSize: 14.5, fontWeight: '700', color: C.text },
  rowProvince: { fontSize: 12, color: C.textFaint, marginTop: 1 },
  rowCount: { fontSize: 13, fontWeight: '700', color: C.textSoft },

  actionRow: { flexDirection: 'row', gap: 10 },
  clearBtn: { height: BUTTON_HEIGHT, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { fontSize: 15, fontWeight: '700', color: C.text },
  applyBtn: { flex: 1, height: BUTTON_HEIGHT, borderRadius: 12, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: { fontSize: 16, fontWeight: '800', color: C.accentDeepText },
});

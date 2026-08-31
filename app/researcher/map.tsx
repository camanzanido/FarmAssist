import { ResearcherColors as C } from '@/src/constants/colors';
import { getAllDecisions, type Decision } from '@/src/database/repositories/decisions';
import { getAllLocations, type Location } from '@/src/database/repositories/locations';
import { formatCurrency } from '@/src/utils/formatters';
import { median } from '@/src/utils/researcherStats';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResearcherMapScreen() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [d, l] = await Promise.all([getAllDecisions(), getAllLocations()]);
      setDecisions(d);
      setLocations(l);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const byCity = useMemo(() => {
    const locById = new Map(locations.map(l => [l.id, l]));
    const groups = new Map<string, Decision[]>();
    for (const d of decisions) {
      const city = locById.get(d.location_id)?.city;
      if (!city) continue;
      if (!groups.has(city)) groups.set(city, []);
      groups.get(city)!.push(d);
    }
    const arr = Array.from(groups.entries()).map(([city, ds]) => ({
      city,
      count: ds.length,
      farmers: new Set(ds.map(d => d.user_id)).size,
      medianGain: median(ds.map(d => d.profit_increase)),
    }));
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [decisions, locations]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {isLoading ? (
        <View style={s.centerWrap}><ActivityIndicator size="large" color={C.accent} /></View>
      ) : (
        <>
          <View style={s.placeholder}>
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={19} color={C.textFaint} />
              <Text style={s.searchPlaceholder}>Search municipality</Text>
            </View>
            <View style={s.placeholderNote}>
              <Text style={s.placeholderLabel}>MAP PLACEHOLDER</Text>
              <Text style={s.placeholderBody}>
                Decisions grouped by municipality below. A real map needs coordinates added to the locations table.
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {byCity.length === 0 ? (
              <Text style={s.emptyText}>No locations with decisions yet.</Text>
            ) : byCity.map(row => (
              <View key={row.city} style={s.cityCard}>
                <View style={s.cityHeader}>
                  <Text style={s.cityName}>{row.city}</Text>
                  <Text style={s.cityCount}>{row.count} decisions</Text>
                </View>
                <View style={s.cityStatRow}>
                  <View style={s.cityStat}>
                    <Text style={s.cityStatValue}>{row.farmers}</Text>
                    <Text style={s.cityStatLabel}>Farmers</Text>
                  </View>
                  <View style={s.cityStat}>
                    <Text style={[s.cityStatValue, { color: C.accent }]}>{formatCurrency(row.medianGain)}</Text>
                    <Text style={s.cityStatLabel}>Median gain</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  placeholder: {
    minHeight: 220,
    backgroundColor: '#0C3324',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 20,
    justifyContent: 'space-between',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(4,26,18,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 13, height: 48, paddingHorizontal: 14 },
  searchPlaceholder: { flex: 1, fontSize: 15, color: C.textFaint },
  placeholderNote: { alignItems: 'center', marginTop: 20 },
  placeholderLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: C.textFaint, marginBottom: 8 },
  placeholderBody: { fontSize: 13, color: C.textMuted, lineHeight: 19, textAlign: 'center' },

  list: { padding: 20, gap: 10 },
  emptyText: { textAlign: 'center', fontSize: 13, color: C.textFaint, marginTop: 20 },

  cityCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10 },
  cityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  cityName: { fontSize: 17, fontWeight: '800', color: C.text },
  cityCount: { fontSize: 12.5, color: C.textFaint },
  cityStatRow: { flexDirection: 'row', gap: 10 },
  cityStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 },
  cityStatValue: { fontSize: 18, fontWeight: '800', color: C.text },
  cityStatLabel: { fontSize: 11.5, color: C.textSoft, marginTop: 2 },
});

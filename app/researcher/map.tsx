import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { LeafletMap, type LeafletMapHandle, type MapPin } from '@/src/components/researcher/leaflet-map';
import { MAP_HEIGHT_RATIO, MapSkeleton } from '@/src/components/researcher/skeletons';
import { cardShadow, Colors } from '@/src/constants/colors';
import { wideColumn } from '@/src/constants/layout';
import { cityCoordinateKey, ensureCoordinates, type CityCoordinate } from '@/src/database/repositories/cityCoordinates';
import { fetchCityStats, type CityStats } from '@/src/database/repositories/researcher';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const ROW_HEIGHT = 62;
const ROW_GAP = 8;
const EMPTY: CityStats[] = [];

type CityRow = CityStats & { key: string; coord: CityCoordinate | undefined };

function describeCity(row: CityStats): string {
  return `${row.decisions} decision${row.decisions === 1 ? '' : 's'} · ${row.farmers} farmer${row.farmers === 1 ? '' : 's'} · median ${formatCurrency(row.median_gain)}`;
}

function CityListRow({ row, selected, onPress }: { row: CityRow; selected: boolean; onPress: (row: CityRow) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, selected && s.rowSelected, pressed && s.rowPressed]}
      onPress={() => onPress(row)}
      accessibilityRole="button"
      accessibilityHint="Shows this municipality on the map"
    >
      <View style={[s.rowDot, !row.coord && s.rowDotMissing]} />
      <View style={s.rowPlace}>
        <Text style={s.rowCity} numberOfLines={1}>{row.city}</Text>
        <Text style={s.rowProvince} numberOfLines={1}>{row.province}</Text>
      </View>
      <View style={s.rowStats}>
        <Text style={s.rowCount}>{row.decisions} <Text style={s.rowUnit}>dec</Text> · {row.farmers} <Text style={s.rowUnit}>farmers</Text></Text>
        <Text style={s.rowGain}>{formatCurrency(row.median_gain)}</Text>
      </View>
    </Pressable>
  );
}

export default function ResearcherMapScreen() {
  const { data: byCity, isLoading, isRefreshing, error, reload, refresh } = useResearcherFetch(fetchCityStats, EMPTY);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<LeafletMapHandle>(null);
  const listRef = useRef<FlatList<CityRow>>(null);

  const [coords, setCoords] = useState<Map<string, CityCoordinate>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(searchQuery.trim().toLowerCase(), 300);

  useEffect(() => {
    if (byCity.length === 0) return;
    let cancelled = false;
    setIsGeocoding(true);
    setGeocodeFailed(false);
    ensureCoordinates(byCity.map(c => ({ city: c.city, province: c.province })))
      .then(result => { if (!cancelled) setCoords(result); })
      .catch(err => {
        console.error('Failed to resolve city coordinates:', err);
        if (!cancelled) setGeocodeFailed(true);
      })
      .finally(() => { if (!cancelled) setIsGeocoding(false); });
    return () => { cancelled = true; };
  }, [byCity]);

  const rows: CityRow[] = useMemo(() => byCity.map(c => {
    const key = cityCoordinateKey(c.city, c.province);
    return { ...c, key, coord: coords.get(key) };
  }), [byCity, coords]);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return rows;
    return rows.filter(r => r.city.toLowerCase().includes(debouncedQuery) || r.province.toLowerCase().includes(debouncedQuery));
  }, [rows, debouncedQuery]);

  const pins: MapPin[] = useMemo(() => filtered.flatMap(r => r.coord
    ? [{ key: r.key, city: r.city, lat: r.coord.lat, lng: r.coord.lng, details: describeCity(r) }]
    : []), [filtered]);

  const focusRow = useCallback((row: CityRow) => {
    setSelectedKey(row.key);
    if (row.coord) mapRef.current?.focus(row.key);
  }, []);

  const onPinPress = useCallback((key: string) => {
    setSelectedKey(key);
    const index = filtered.findIndex(r => r.key === key);
    if (index >= 0) listRef.current?.scrollToIndex({ index, viewPosition: 0.1, animated: true });
  }, [filtered]);

  const mapHeight = Math.round(height * MAP_HEIGHT_RATIO);

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load the map. Check your connection."
        skeleton={<MapSkeleton />}
      >
        <View style={s.fill}>
          <View style={{ height: mapHeight }}>
            <LeafletMap
              ref={mapRef}
              pins={pins}
              selectedKey={selectedKey}
              topInset={insets.top}
              onPinPress={onPinPress}
              onLoadError={() => setMapFailed(true)}
            />

            {isGeocoding && (
              <View style={[s.badge, { top: insets.top + 10 }]}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={s.badgeText}>Locating…</Text>
              </View>
            )}
            {mapFailed ? (
              <View style={s.notice}>
                <Ionicons name="cloud-offline-outline" size={16} color={Colors.inkFaint} />
                <Text style={s.noticeText}>Couldn&apos;t load the map — check your internet connection.</Text>
              </View>
            ) : !isGeocoding && filtered.length > 0 && pins.length === 0 && (
              <View style={s.notice}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.inkFaint} />
                <Text style={s.noticeText}>
                  {geocodeFailed
                    ? "Couldn't place pins — check your internet connection."
                    : "Couldn't find map coordinates for these locations."}
                </Text>
              </View>
            )}
          </View>

          <View style={s.searchWrap}>
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={19} color={Colors.inkFaint} />
              <TextInput
                style={s.searchInput}
                placeholder="Search municipality or province"
                placeholderTextColor={Colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={Colors.inkFaint} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            ref={listRef}
            style={s.fill}
            data={filtered}
            keyExtractor={r => r.key}
            renderItem={({ item }) => <CityListRow row={item} selected={item.key === selectedKey} onPress={focusRow} />}
            extraData={selectedKey}
            getItemLayout={(_, index) => ({ length: ROW_HEIGHT + ROW_GAP, offset: (ROW_HEIGHT + ROW_GAP) * index, index })}
            ListEmptyComponent={
              <EmptyState
                icon={rows.length === 0 ? 'map-outline' : 'search-outline'}
                title={rows.length === 0 ? 'No locations with decisions yet.' : 'No municipalities match your search.'}
                subtitle={rows.length === 0 ? undefined : 'Try a different city or province.'}
              />
            }
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.ink} colors={[Colors.accent]} />}
          />
        </View>
      </ResearcherAsyncState>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  fill: { flex: 1 },

  badge: {
    position: 'absolute', right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6, ...cardShadow,
  },
  badgeText: { fontSize: 11.5, color: Colors.inkSoft, fontWeight: '600' },
  notice: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, ...cardShadow,
  },
  noticeText: { flex: 1, fontSize: 12, color: Colors.inkSoft, lineHeight: 16 },

  searchWrap: { ...wideColumn, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 13, height: 46, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.ink, padding: 0 },

  list: { ...wideColumn, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  row: {
    height: ROW_HEIGHT, marginBottom: ROW_GAP,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  rowSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentTint },
  rowPressed: { backgroundColor: Colors.surfaceAlt },
  rowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  rowDotMissing: { backgroundColor: Colors.barMuted },
  rowPlace: { flex: 1 },
  rowCity: { fontSize: 15, fontWeight: '800', color: Colors.ink },
  rowProvince: { fontSize: 12, color: Colors.inkFaint, marginTop: 1 },
  rowStats: { alignItems: 'flex-end' },
  rowCount: { fontSize: 12.5, fontWeight: '700', color: Colors.ink },
  rowUnit: { fontWeight: '500', color: Colors.inkSoft },
  rowGain: { fontSize: 13, fontWeight: '800', color: Colors.accent, marginTop: 2 },
});

import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { LeafletMap, type LeafletMapHandle, type MapPin } from '@/src/components/researcher/leaflet-map';
import { MapSkeleton } from '@/src/components/researcher/skeletons';
import { cardShadow, Colors } from '@/src/constants/colors';
import { cityCoordinateKey, ensureCoordinates, type CityCoordinate } from '@/src/database/repositories/cityCoordinates';
import { fetchCityStats, type CityStats } from '@/src/database/repositories/researcher';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

const ROW_HEIGHT = 62;
const ROW_GAP = 8;
const EMPTY: CityStats[] = [];

const PANEL_TOP_GAP = 8;
const HALF_RATIO = 0.5;
const SNAP_TIMING = { duration: 280, easing: Easing.out(Easing.cubic) };
const FLING_PROJECTION = 0.12;

type Snap = 'peek' | 'half' | 'full';
type CityRow = CityStats & { key: string; coord: CityCoordinate | undefined };

export type Place = { city: string; province: string };

function describeCity(row: CityStats): string {
  return `${row.decisions} decision${row.decisions === 1 ? '' : 's'} · ${row.farmers} farmer${row.farmers === 1 ? '' : 's'} · median ${formatCurrency(row.median_gain)}`;
}

function CityListRow({ row, selected, onPress, onView }: {
  row: CityRow;
  selected: boolean;
  onPress: (row: CityRow) => void;
  onView: (row: CityRow) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, selected && s.rowSelected, pressed && s.rowPressed]}
      onPress={() => onPress(row)}
      accessibilityRole="button"
      accessibilityHint="Shows this municipality on the map and lets you view its decisions"
    >
      <View style={[s.rowDot, !row.coord && s.rowDotMissing]} />
      <View style={s.rowPlace}>
        <Text style={s.rowCity} numberOfLines={1}>{row.city}</Text>
        <Text style={s.rowProvince} numberOfLines={1}>{row.province}</Text>
      </View>
      {selected ? (
        <TouchableOpacity
          style={s.viewBtn}
          onPress={() => onView(row)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`View ${row.decisions} decisions in ${row.city}, ${row.province}`}
        >
          <Text style={s.viewBtnText}>View {row.decisions}</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.onDark} />
        </TouchableOpacity>
      ) : (
        <View style={s.rowStats}>
          <Text style={s.rowCount}>{row.decisions} <Text style={s.rowUnit}>dec</Text> · {row.farmers} <Text style={s.rowUnit}>farmers</Text></Text>
          <Text style={s.rowGain}>{formatCurrency(row.median_gain)}</Text>
        </View>
      )}
    </Pressable>
  );
}

// Municipalities with decisions on a full-screen map; choosing one hands its place to the Decisions list.
export function DecisionsMapView({ onShowDecisions, topInset = 0 }: { onShowDecisions: (place: Place) => void; topInset?: number }) {
  const { data: byCity, isLoading, isRefreshing, error, reload, refresh } = useResearcherFetch(fetchCityStats, EMPTY);
  const mapRef = useRef<LeafletMapHandle>(null);
  const listRef = useRef<FlatList<CityRow>>(null);
  const reduceMotion = useReducedMotion();

  const [coords, setCoords] = useState<Map<string, CityCoordinate>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(searchQuery.trim().toLowerCase(), 300);

  const [areaHeight, setAreaHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [snap, setSnap] = useState<Snap>('peek');
  const panelY = useSharedValue(0);
  const dragStart = useSharedValue(0);

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

  // The panel is always full height and slides down; each snap is how far it is pushed off-screen.
  const panelHeight = Math.max(0, areaHeight - topInset - PANEL_TOP_GAP);
  const peekVisible = Math.min(panelHeight, headerHeight + ROW_HEIGHT + ROW_GAP + 12);
  const halfVisible = Math.min(panelHeight, Math.max(peekVisible, Math.round(areaHeight * HALF_RATIO)));
  const offsets = useMemo<Record<Snap, number>>(() => ({
    peek: panelHeight - peekVisible,
    half: panelHeight - halfVisible,
    full: 0,
  }), [panelHeight, peekVisible, halfVisible]);

  useEffect(() => {
    panelY.value = withTiming(offsets[snap], reduceMotion ? { duration: 0 } : SNAP_TIMING);
  }, [offsets, snap, reduceMotion, panelY]);

  // Half open leaves room to see the focused pin above the list.
  const halfCover = panelHeight - offsets.half;
  const focusRow = useCallback((row: CityRow) => {
    setSelectedKey(row.key);
    setSnap('half');
    if (row.coord) mapRef.current?.focus(row.key, halfCover);
  }, [halfCover]);

  const onPinPress = useCallback((key: string) => {
    setSelectedKey(key);
    setSnap(current => (current === 'peek' ? 'half' : current));
    const index = filtered.findIndex(r => r.key === key);
    if (index >= 0) listRef.current?.scrollToIndex({ index, viewPosition: 0.1, animated: true });
  }, [filtered]);

  const settle = useCallback((next: Snap) => setSnap(next), []);
  const panelPan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => { dragStart.value = panelY.value; })
    .onUpdate(e => {
      panelY.value = Math.min(offsets.peek, Math.max(0, dragStart.value + e.translationY));
    })
    .onEnd(e => {
      const projected = panelY.value + e.velocityY * FLING_PROJECTION;
      const choices: Snap[] = ['full', 'half', 'peek'];
      let best: Snap = 'peek';
      let bestDistance = Infinity;
      for (const c of choices) {
        const d = Math.abs(offsets[c] - projected);
        if (d < bestDistance) { best = c; bestDistance = d; }
      }
      panelY.value = withTiming(offsets[best], SNAP_TIMING);
      runOnJS(settle)(best);
    });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: panelY.value }] }));

  const viewRow = useCallback((row: CityRow) => onShowDecisions({ city: row.city, province: row.province }), [onShowDecisions]);
  const overlayTop = topInset + 22;

  return (
    <GestureHandlerRootView style={s.fill}>
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load the map. Check your connection."
        skeleton={<MapSkeleton />}
      >
        <View style={s.fill} onLayout={e => setAreaHeight(Math.round(e.nativeEvent.layout.height))}>
          <LeafletMap
            ref={mapRef}
            pins={pins}
            selectedKey={selectedKey}
            topInset={topInset}
            bottomInset={peekVisible}
            onPinPress={onPinPress}
            onLoadError={() => setMapFailed(true)}
            style={StyleSheet.absoluteFill}
          />

          <View style={[s.overlay, { top: overlayTop }]} pointerEvents="none">
            {isGeocoding && (
              <View style={s.badge}>
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

          {areaHeight > 0 && (
            <Animated.View style={[s.panel, { height: panelHeight }, panelStyle]}>
              <GestureDetector gesture={panelPan}>
                <View onLayout={e => setHeaderHeight(Math.round(e.nativeEvent.layout.height))}>
                  <Pressable
                    style={s.handleZone}
                    onPress={() => setSnap(snap === 'peek' ? 'half' : 'peek')}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Municipality list"
                    accessibilityHint="Drag up or down to resize the list"
                  >
                    <View style={s.grabber} />
                  </Pressable>

                  <View style={s.searchRow}>
                    <Ionicons name="search-outline" size={19} color={Colors.inkFaint} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="Search municipality or province"
                      placeholderTextColor={Colors.placeholder}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onFocus={() => setSnap('full')}
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
              </GestureDetector>

              <FlatList
                ref={listRef}
                style={s.fill}
                data={filtered}
                keyExtractor={r => r.key}
                renderItem={({ item }) => <CityListRow row={item} selected={item.key === selectedKey} onPress={focusRow} onView={viewRow} />}
                extraData={selectedKey}
                getItemLayout={(_, index) => ({ length: ROW_HEIGHT + ROW_GAP, offset: (ROW_HEIGHT + ROW_GAP) * index, index })}
                ListEmptyComponent={
                  <EmptyState
                    icon={rows.length === 0 ? 'map-outline' : 'search-outline'}
                    title={rows.length === 0 ? 'No locations with decisions yet.' : 'No municipalities match your search.'}
                    subtitle={rows.length === 0 ? undefined : 'Try a different city or province.'}
                  />
                }
                contentContainerStyle={[s.list, { paddingBottom: 20 + offsets[snap] }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                windowSize={7}
                removeClippedSubviews={Platform.OS === 'android'}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.ink} colors={[Colors.accent]} />}
              />
            </Animated.View>
          )}
        </View>
      </ResearcherAsyncState>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },

  overlay: { position: 'absolute', left: 12, right: 12, gap: 8, alignItems: 'flex-start' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6, ...cardShadow,
  },
  badgeText: { fontSize: 11.5, color: Colors.inkSoft, fontWeight: '600' },
  notice: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, ...cardShadow,
  },
  noticeText: { flex: 1, fontSize: 12, color: Colors.inkSoft, lineHeight: 16 },

  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border, ...cardShadow,
  },
  handleZone: { height: 26, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.borderStrong },

  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.ink, borderRadius: 999, paddingHorizontal: 14, height: 38 },
  viewBtnText: { fontSize: 13.5, fontWeight: '800', color: Colors.onDark },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 13, height: 46, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.ink, padding: 0 },

  list: { paddingHorizontal: 16, paddingTop: 2 },
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

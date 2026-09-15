import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { ResearcherColors as C } from '@/src/constants/colors';
import { cityCoordinateKey, ensureCoordinates, type CityCoordinate } from '@/src/database/repositories/cityCoordinates';
import { type Decision } from '@/src/database/repositories/decisions';
import { type Location } from '@/src/database/repositories/locations';
import { fetchAllDecisions, fetchAllLocations } from '@/src/database/repositories/researcher';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { formatCurrency } from '@/src/utils/formatters';
import { median } from '@/src/utils/researcherStats';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

function buildMapHtml(pins: {
  city: string; lat: number; lng: number; count: number; farmers: number; medianGainLabel: string;
}[]): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #0C3324; }
  .leaflet-popup-content { font-family: -apple-system, Roboto, sans-serif; font-size: 13px; line-height: 1.5; }
  .farmassist-pin { background: transparent; border: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45)); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
  var pins = ${JSON.stringify(pins)};
  var map = L.map('map', { zoomControl: true }).setView([12.8797, 121.7740], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  function pinSvg(size, count) {
    var h = Math.round(size * 1.3);
    return '<svg width="' + size + '" height="' + h + '" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M20 0C9 0 0 8.9 0 19.8 0 34 20 52 20 52S40 34 40 19.8C40 8.9 31 0 20 0Z" fill="#3FA36B" stroke="#173B27" stroke-width="2.5"/>' +
      '<circle cx="20" cy="19.5" r="13" fill="#0C3324"/>' +
      '<text x="20" y="24.5" font-size="15" font-weight="700" fill="#EAF7EE" text-anchor="middle" font-family="Arial, sans-serif">' + count + '</text>' +
    '</svg>';
  }

  var bounds = [];
  pins.forEach(function (p) {
    var size = Math.min(40 + p.count * 4, 76);
    var height = Math.round(size * 1.3);
    var icon = L.divIcon({
      html: pinSvg(size, p.count),
      className: 'farmassist-pin',
      iconSize: [size, height],
      iconAnchor: [size / 2, height],
      popupAnchor: [0, -height],
    });
    var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
    marker.bindPopup(
      '<b>' + p.city + '</b><br/>' +
      p.count + ' decision' + (p.count === 1 ? '' : 's') + '<br/>' +
      p.farmers + ' farmer' + (p.farmers === 1 ? '' : 's') + '<br/>' +
      'Median gain: ' + p.medianGainLabel
    );
    bounds.push([p.lat, p.lng]);
  });
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }
</script>
</body>
</html>`;
}

const EMPTY = { decisions: [] as Decision[], locations: [] as Location[] };

export default function ResearcherMapScreen() {
  const fetchMapData = useCallback(async () => {
    const [decisions, locations] = await Promise.all([fetchAllDecisions(), fetchAllLocations()]);
    return { decisions, locations };
  }, []);
  const { data: { decisions, locations }, isLoading, error, reload } = useResearcherFetch(fetchMapData, EMPTY);

  const [coords, setCoords] = useState<Map<string, CityCoordinate>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const byCity = useMemo(() => {
    const locById = new Map(locations.map(l => [l.id, l]));
    const groups = new Map<string, { city: string; province: string; decisions: Decision[] }>();
    for (const d of decisions) {
      const loc = locById.get(d.location_id);
      if (!loc?.city || !loc.province) continue;
      const key = cityCoordinateKey(loc.city, loc.province);
      if (!groups.has(key)) groups.set(key, { city: loc.city, province: loc.province, decisions: [] });
      groups.get(key)!.decisions.push(d);
    }
    const arr = Array.from(groups.values()).map(g => ({
      city: g.city,
      province: g.province,
      count: g.decisions.length,
      farmers: new Set(g.decisions.map(d => d.user_id)).size,
      medianGain: median(g.decisions.map(d => d.profit_increase)),
    }));
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [decisions, locations]);

  // Resolve pin coordinates for whichever cities are actually in use —
  // geocodes only cache misses, cached results are reused across sessions.
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

  const filteredByCity = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCity;
    return byCity.filter(row =>
      row.city.toLowerCase().includes(q) || row.province.toLowerCase().includes(q)
    );
  }, [byCity, searchQuery]);

  const pins = useMemo(() => {
    return filteredByCity
      .map(row => {
        const c = coords.get(cityCoordinateKey(row.city, row.province));
        if (!c) return null;
        return {
          city: row.city,
          lat: c.lat,
          lng: c.lng,
          count: row.count,
          farmers: row.farmers,
          medianGainLabel: formatCurrency(row.medianGain),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [filteredByCity, coords]);

  const mapHtml = useMemo(() => buildMapHtml(pins), [pins]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load the map. Check your connection."
      >
        <>
          <View style={s.header}>
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={19} color={C.textFaint} />
              <TextInput
                style={s.searchInput}
                placeholder="Search municipality"
                placeholderTextColor={C.textFaint}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={C.textFaint} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={s.mapWrap}>
            <WebView
              source={{ html: mapHtml }}
              style={s.map}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
            />
            {isGeocoding && (
              <View style={s.mapLoadingBadge}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={s.mapLoadingText}>Locating…</Text>
              </View>
            )}
            {!isGeocoding && byCity.length > 0 && pins.length === 0 && (
              <View style={s.mapNotice}>
                <Ionicons name="alert-circle-outline" size={16} color={C.textFaint} />
                <Text style={s.mapNoticeText}>
                  {geocodeFailed
                    ? "Couldn't place pins — check your internet connection."
                    : "Couldn't find map coordinates for these locations."}
                </Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {filteredByCity.length === 0 ? (
              <EmptyState
                icon={byCity.length === 0 ? 'map-outline' : 'search-outline'}
                title={byCity.length === 0 ? 'No locations with decisions yet.' : 'No municipalities match your search.'}
                subtitle={byCity.length === 0 ? undefined : 'Try a different city or province.'}
              />
            ) : filteredByCity.map(row => (
              <View key={cityCoordinateKey(row.city, row.province)} style={s.cityCard}>
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
      </ResearcherAsyncState>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: { backgroundColor: '#0C3324', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(4,26,18,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13, height: 48, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text, padding: 0 },

  mapWrap: { height: 420 },
  map: { flex: 1, backgroundColor: '#0C3324' },
  mapLoadingBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(4,26,18,0.9)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  mapLoadingText: { fontSize: 11.5, color: C.textFaint, fontWeight: '600' },
  mapNotice: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(4,26,18,0.92)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  mapNoticeText: { flex: 1, fontSize: 12, color: C.textFaint, lineHeight: 16 },

  list: { padding: 20, gap: 10 },

  cityCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10 },
  cityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  cityName: { fontSize: 17, fontWeight: '800', color: C.text },
  cityCount: { fontSize: 12.5, color: C.textFaint },
  cityStatRow: { flexDirection: 'row', gap: 10 },
  cityStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 },
  cityStatValue: { fontSize: 18, fontWeight: '800', color: C.text },
  cityStatLabel: { fontSize: 11.5, color: C.textSoft, marginTop: 2 },
});

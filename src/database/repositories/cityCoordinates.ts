import { supabase } from '../supabase/supabase';

export interface CityCoordinate {
  city: string;
  province: string;
  lat: number;
  lng: number;
}

type CityKey = string; // `${city}|${province}`
const keyOf = (city: string, province: string): CityKey => `${city}|${province}`;

async function getCachedCoordinates(): Promise<Map<CityKey, CityCoordinate>> {
  const { data, error } = await supabase.from('city_coordinates').select('*');
  if (error) throw error;
  const map = new Map<CityKey, CityCoordinate>();
  for (const row of (data ?? []) as CityCoordinate[]) {
    map.set(keyOf(row.city, row.province), row);
  }
  return map;
}

// PSGC city names carry parenthetical annotations — "(Capital)", old names
// like "(Locsin)" — that Nominatim can't match against. Strip them for the
// geocoding query only; the stored/displayed city name is untouched.
function stripAnnotations(city: string): string {
  return city.replace(/\s*\([^)]*\)/g, '').trim();
}

async function geocodeCity(city: string, province: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${stripAnnotations(city)}, ${province}, Philippines`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
    { headers: { 'User-Agent': 'FarmAssist/1.0' } }
  );
  if (!res.ok) return null;
  const results = (await res.json()) as { lat: string; lon: string }[];
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

// Resolves coordinates for the given city/province pairs, geocoding and
// caching only whichever ones aren't already known.
export async function ensureCoordinates(
  pairs: { city: string; province: string }[]
): Promise<Map<CityKey, CityCoordinate>> {
  const cached = await getCachedCoordinates();

  const missing = pairs.filter(p => !cached.has(keyOf(p.city, p.province)));
  const uniqueMissing = Array.from(
    new Map(missing.map(p => [keyOf(p.city, p.province), p])).values()
  );

  for (const p of uniqueMissing) {
    try {
      const coords = await geocodeCity(p.city, p.province);
      if (!coords) {
        console.warn(`No geocoding match for ${p.city}, ${p.province}`);
        continue;
      }
      const row: CityCoordinate = { city: p.city, province: p.province, ...coords };
      const { error } = await supabase.from('city_coordinates').upsert(row);
      if (error) throw error;
      cached.set(keyOf(p.city, p.province), row);
    } catch (err) {
      console.error(`Failed to geocode ${p.city}, ${p.province}:`, err);
    }
  }

  return cached;
}

export { keyOf as cityCoordinateKey };

export interface PlaceRef { city: string; province: string }

// PostgREST reserves , . : ( ) in filter values; double quotes keep names like "Sto. Tomas" intact.
const quote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

// One or-filter matching any of the (city, province) pairs.
export function placesOrFilter(places: PlaceRef[]): string {
  return places.map(p => `and(city.eq.${quote(p.city)},province.eq.${quote(p.province)})`).join(',');
}

export function placesLabel(places: PlaceRef[]): string {
  if (places.length === 0) return 'All locations';
  if (places.length === 1) return places[0].city;
  return `${places.length} locations`;
}

// Short file-name suffix: the single city slugged, or a count.
export function placesFileSuffix(places: PlaceRef[]): string {
  if (places.length === 0) return '';
  if (places.length > 1) return `_${places.length}-locations`;
  const slug = places[0].city.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `_${slug}` : '_1-location';
}

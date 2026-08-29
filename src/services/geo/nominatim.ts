import { GeocodingResult } from './types';

export interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface NominatimSearchResult {
  place_id?: number | string;
  osm_id?: number | string;
  osm_type?: string;
  lat: string | number;
  lon: string | number;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: NominatimAddress;
  boundingbox?: [string | number, string | number, string | number, string | number];
}

export interface PhotonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    town?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
}

export interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

/**
 * Normalizes a raw Nominatim API response item into standard GeocodingResult
 */
export function normalizeNominatimResult(item: NominatimSearchResult): GeocodingResult | null {
  const lat = typeof item.lat === 'number' ? item.lat : parseFloat(item.lat);
  const lon = typeof item.lon === 'number' ? item.lon : parseFloat(item.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const addr = item.address || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.suburb ||
    addr.county;

  const boundingBox: [number, number, number, number] | undefined =
    Array.isArray(item.boundingbox) && item.boundingbox.length === 4
      ? [
          parseFloat(String(item.boundingbox[0])),
          parseFloat(String(item.boundingbox[1])),
          parseFloat(String(item.boundingbox[2])),
          parseFloat(String(item.boundingbox[3])),
        ]
      : undefined;

  return {
    id: item.place_id ? String(item.place_id) : undefined,
    name: item.name || city || item.display_name?.split(',')[0]?.trim(),
    displayName: item.display_name,
    formattedAddress: item.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    latitude: lat,
    longitude: lon,
    city,
    state: addr.state || addr.region,
    country: addr.country,
    countryCode: addr.country_code ? addr.country_code.toUpperCase() : undefined,
    postcode: addr.postcode,
    boundingBox,
  };
}

/**
 * Normalizes a Photon Komoot feature into standard GeocodingResult
 */
export function normalizePhotonFeature(feature: PhotonFeature): GeocodingResult | null {
  if (!feature.geometry || !feature.geometry.coordinates) return null;
  const lon = feature.geometry.coordinates[0];
  const lat = feature.geometry.coordinates[1];

  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const props = feature.properties || {};
  const name = props.name || props.street || props.city;
  const parts = [
    props.housenumber ? `${props.housenumber} ${props.street || ''}`.trim() : props.street || name,
    props.district,
    props.city || props.town,
    props.state,
    props.country,
  ].filter(Boolean);

  const formattedAddress = parts.join(', ') || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  return {
    id: props.osm_id ? String(props.osm_id) : undefined,
    name: name || formattedAddress,
    displayName: formattedAddress,
    formattedAddress,
    latitude: lat,
    longitude: lon,
    city: props.city || props.town,
    state: props.state,
    country: props.country,
    countryCode: props.countrycode ? props.countrycode.toUpperCase() : undefined,
    postcode: props.postcode,
  };
}

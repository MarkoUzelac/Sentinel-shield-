import { GeocodingResult } from './types';

export interface GeoapifyFeatureProperties {
  place_id?: string;
  name?: string;
  country?: string;
  country_code?: string;
  state?: string;
  county?: string;
  city?: string;
  postcode?: string;
  district?: string;
  suburb?: string;
  street?: string;
  housenumber?: string;
  lon?: number;
  lat?: number;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  result_type?: string;
  bbox?: [number, number, number, number];
  [key: string]: unknown;
}

export interface GeoapifyFeature {
  type?: string;
  properties?: GeoapifyFeatureProperties;
  geometry?: {
    type?: string;
    coordinates?: [number, number]; // [lon, lat]
  };
  bbox?: [number, number, number, number];
}

export interface GeoapifyResponse {
  type?: string;
  features?: GeoapifyFeature[];
  results?: GeoapifyFeatureProperties[];
  statusCode?: number;
  error?: string;
  message?: string;
}

/**
 * Normalize Geoapify feature properties into a canonical GeocodingResult
 */
export function normalizeGeoapifyFeature(
  feature: GeoapifyFeature | GeoapifyFeatureProperties
): GeocodingResult | null {
  const isFeature = 'properties' in feature && typeof feature === 'object' && feature !== null;
  const props: GeoapifyFeatureProperties = isFeature && (feature as GeoapifyFeature).properties
    ? (feature as GeoapifyFeature).properties!
    : (feature as GeoapifyFeatureProperties);

  if (!props) return null;

  // Extract coordinates from geometry coordinates or props lat/lon
  let lat = props.lat;
  let lon = props.lon;

  if (
    (lat === undefined || lon === undefined) &&
    isFeature &&
    (feature as GeoapifyFeature).geometry?.coordinates
  ) {
    const coords = (feature as GeoapifyFeature).geometry!.coordinates!;
    lon = coords[0];
    lat = coords[1];
  }

  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const name = props.name || props.address_line1 || props.street || props.city;
  const formattedAddress =
    props.formatted ||
    [props.address_line1, props.address_line2].filter(Boolean).join(', ') ||
    [name, props.city, props.country].filter(Boolean).join(', ') ||
    `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  let boundingBox: [number, number, number, number] | undefined = undefined;
  if (Array.isArray(props.bbox) && props.bbox.length === 4) {
    boundingBox = [props.bbox[1], props.bbox[3], props.bbox[0], props.bbox[2]];
  } else if (isFeature && Array.isArray((feature as GeoapifyFeature).bbox) && (feature as GeoapifyFeature).bbox!.length === 4) {
    const b = (feature as GeoapifyFeature).bbox!;
    boundingBox = [b[1], b[3], b[0], b[2]];
  }

  return {
    id: props.place_id,
    name,
    displayName: formattedAddress,
    formattedAddress,
    latitude: lat,
    longitude: lon,
    city: props.city || props.district || props.suburb,
    state: props.state,
    country: props.country,
    countryCode: props.country_code ? props.country_code.toUpperCase() : undefined,
    postcode: props.postcode,
    boundingBox,
  };
}

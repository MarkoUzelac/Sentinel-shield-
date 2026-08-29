export type GeocodingErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EMPTY_RESULTS'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'UNKNOWN_ERROR';

export interface GeocodingErrorDetail {
  code: GeocodingErrorCode;
  message: string;
  userFriendlyMessage: string;
  statusCode?: number;
  provider?: string;
  suggestion?: string;
}

export interface GeocodingDetailedResult {
  results: GeocodingResult[];
  error?: GeocodingErrorDetail | null;
  providerUsed?: string;
  cached?: boolean;
}

export interface GeocodingResult {
  id?: string;
  name?: string;
  displayName?: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  country?: string;
  countryCode?: string;
  postcode?: string;
  state?: string;
  boundingBox?: [number, number, number, number];
}

// Backward-compatible alias for existing components
export interface GeoResult {
  id?: string;
  latitude: number;
  longitude: number;
  label: string;
  formattedAddress?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  postcode?: string;
  state?: string;
  ipAddress?: string;
  boundingBox?: [number, number, number, number];
}

export interface GeocodingRequestOptions {
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  countryCodes?: string[];
  lang?: string;
}

export interface GeocodingProvider {
  forwardGeocode(address: string, options?: GeocodingRequestOptions): Promise<GeocodingResult[]>;
  reverseGeocode(latitude: number, longitude: number, options?: GeocodingRequestOptions): Promise<GeocodingResult | null>;
  autocomplete(query: string, options?: GeocodingRequestOptions): Promise<GeocodingResult[]>;
  isConfigured?(): boolean;
  // Legacy aliases for backward compatibility
  geocode?(query: string, options?: GeocodingRequestOptions): Promise<GeoResult[]>;
  searchPlaces?(query: string, options?: GeocodingRequestOptions): Promise<GeoResult[]>;
}

export interface MapProviderConfig {
  styleUrl: string;
  attribution: string;
}

export interface GeoapifyConfig {
  apiKey: string;
  apiUrl: string;
}

export interface GeocodingProviderConfig {
  provider: 'geoapify' | 'osm-nominatim' | 'custom';
  apiUrl: string;
  apiKey?: string;
  attribution: string;
}

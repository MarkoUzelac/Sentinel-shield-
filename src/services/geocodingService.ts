import { geoConfig } from './geo/geoConfig';
import {
  GeocodingProvider,
  GeocodingResult,
  GeoResult,
  GeocodingRequestOptions,
  GeocodingDetailedResult,
  GeocodingErrorDetail,
} from './geo/types';
import { normalizeGeoapifyFeature, GeoapifyResponse } from './geo/geoapify';
import { normalizeNominatimResult, normalizePhotonFeature, NominatimSearchResult, PhotonResponse } from './geo/nominatim';

/**
 * Client-side in-memory cache entry
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Production-ready Geoapify Geocoding Service with OpenStreetMap fallback
 */
export class GeoapifyGeocodingService implements GeocodingProvider {
  private readonly defaultTimeoutMs = 8000;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxCacheEntries = 250;
  private hasWarnedMissingKey = false;

  constructor() {
    // Development environment validation
    if (typeof window !== 'undefined' && import.meta.env.DEV && !this.getApiKey() && !this.hasWarnedMissingKey) {
      console.warn(
        '[Sentinel Shield] VITE_GEOAPIFY_API_KEY is not configured in .env. Search will operate using open fallback mode.'
      );
      this.hasWarnedMissingKey = true;
    }
  }

  /**
   * Safe getter for standardized Geoapify API Key
   */
  public getApiKey(): string {
    return (
      geoConfig.geoapify.apiKey ||
      import.meta.env.VITE_GEOAPIFY_API_KEY ||
      ''
    );
  }

  /**
   * Check if Geoapify key is configured
   */
  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  /**
   * Base API endpoint
   */
  private getBaseUrl(): string {
    const configured = geoConfig.geocoding.apiUrl || 'https://api.geoapify.com/v1/geocode';
    return configured.replace(/\/search\/?$/, '').replace(/\/reverse\/?$/, '').replace(/\/autocomplete\/?$/, '');
  }

  /**
   * LRU Cache getter
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * LRU Cache setter
   */
  private setInCache(key: string, data: unknown): void {
    if (this.cache.size >= this.maxCacheEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTtlMs });
  }

  /**
   * Clear in-memory geocoding cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Parse Geoapify Response into normalized results
   */
  private parseGeoapifyResponse(data: GeoapifyResponse): GeocodingResult[] {
    if (Array.isArray(data.features) && data.features.length > 0) {
      return data.features
        .map(normalizeGeoapifyFeature)
        .filter((r): r is GeocodingResult => r !== null);
    }
    if (Array.isArray(data.results) && data.results.length > 0) {
      return data.results
        .map(normalizeGeoapifyFeature)
        .filter((r): r is GeocodingResult => r !== null);
    }
    return [];
  }

  /**
   * Forward Geocode with Detailed Error Categorization
   * Explicitly distinguishes between NETWORK_ERROR, RATE_LIMIT_EXCEEDED, EMPTY_RESULTS, and TIMEOUT
   */
  async forwardGeocodeDetailed(
    address: string,
    options?: GeocodingRequestOptions
  ): Promise<GeocodingDetailedResult> {
    const trimmed = address.trim();
    if (!trimmed || trimmed.length < 2) {
      return { results: [], error: null };
    }

    // Direct GPS coordinate input check (e.g. "45.8150, 15.9819")
    const coordMatch = trimmed.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        const reverseResult = await this.reverseGeocode(lat, lon, options);
        if (reverseResult) {
          return { results: [reverseResult], error: null, providerUsed: 'Tactical GPS Reverse' };
        }
        return {
          results: [
            {
              name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              displayName: `Tactical Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              formattedAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              latitude: lat,
              longitude: lon,
            },
          ],
          error: null,
          providerUsed: 'Tactical Direct Coordinates',
        };
      }
    }

    const limit = options?.limit || 5;
    const lang = options?.lang || 'en';
    const cacheKey = `fwd:${trimmed.toLowerCase()}:${limit}:${lang}`;

    const cached = this.getFromCache<GeocodingResult[]>(cacheKey);
    if (cached) {
      return {
        results: cached,
        error:
          cached.length === 0
            ? {
                code: 'EMPTY_RESULTS',
                message: `No geographic locations matched query "${trimmed}".`,
                userFriendlyMessage: `Nema pronađenih lokacija za "${trimmed}". Provjerite pravopis ili unesite naziv većeg grada.`,
                suggestion: 'Pokušajte unijeti naziv grada, državu ili GPS koordinate.',
              }
            : null,
        cached: true,
      };
    }

    // Fast check for offline status in browser
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        results: [],
        error: {
          code: 'NETWORK_ERROR',
          message: 'Client device is offline.',
          userFriendlyMessage: 'Mrežna greška: Uređaj nije povezan s internetom. Provjerite mrežnu vezu.',
          suggestion: 'Uključite Wi-Fi ili mobilne podatke.',
        },
      };
    }

    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    let isTimedOut = false;
    const timerId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timerId);
        return { results: [], error: null };
      }
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let totalAttempts = 0;
    let networkErrorCount = 0;
    let rateLimitHit = false;
    let rateLimitProvider = '';
    const apiKey = this.getApiKey();

    // 1. Primary: Official Geoapify Geocoding API if key provided
    if (apiKey) {
      totalAttempts++;
      try {
        const url = new URL(`${this.getBaseUrl()}/search`);
        url.searchParams.set('text', trimmed);
        url.searchParams.set('apiKey', apiKey);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('lang', lang);
        url.searchParams.set('format', 'geojson');

        if (options?.countryCodes && options.countryCodes.length > 0) {
          url.searchParams.set('filter', `countrycode:${options.countryCodes.join(',').toLowerCase()}`);
        }

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as GeoapifyResponse;
          const results = this.parseGeoapifyResponse(data);
          if (results.length > 0) {
            clearTimeout(timerId);
            this.setInCache(cacheKey, results);
            return { results, error: null, providerUsed: 'Geoapify' };
          }
        } else if (res.status === 429) {
          rateLimitHit = true;
          rateLimitProvider = 'Geoapify';
          console.warn('[Sentinel Geocoding] Geoapify rate limit exceeded (HTTP 429). Falling back to OpenStreetMap.');
        } else if (res.status === 401 || res.status === 403) {
          console.warn('[Sentinel Geocoding] Geoapify API key is invalid or unauthorized. Falling back to OpenStreetMap.');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          if (isTimedOut) {
            clearTimeout(timerId);
            return {
              results: [],
              error: {
                code: 'TIMEOUT',
                message: 'Geocoding request timed out.',
                userFriendlyMessage: 'Zahtjev je istekao: Poslužitelj za pretragu lokacija nije odgovorio na vrijeme.',
                suggestion: 'Pokušajte ponovno ili unesite kraći pojam.',
              },
            };
          }
          return { results: [], error: null };
        }
        networkErrorCount++;
        console.warn('[Sentinel Geocoding] Geoapify fetch failed, trying OpenStreetMap fallback:', err);
      }
    }

    // 2. Secondary: OpenStreetMap Nominatim
    totalAttempts++;
    try {
      const encoded = encodeURIComponent(trimmed);
      const directUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=jsonv2&addressdetails=1&limit=${limit}&accept-language=${encodeURIComponent(lang)}`;

      const res = await fetch(directUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (res.ok) {
        const rawData = (await res.json()) as NominatimSearchResult[];
        if (Array.isArray(rawData)) {
          const results = rawData
            .map(normalizeNominatimResult)
            .filter((r): r is GeocodingResult => r !== null);

          if (results.length > 0) {
            clearTimeout(timerId);
            this.setInCache(cacheKey, results);
            return { results, error: null, providerUsed: 'OpenStreetMap Nominatim' };
          }
        }
      } else if (res.status === 429) {
        rateLimitHit = true;
        rateLimitProvider = 'OpenStreetMap';
        console.warn('[Sentinel Geocoding] OpenStreetMap Nominatim rate limit exceeded (HTTP 429).');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (isTimedOut) {
          clearTimeout(timerId);
          return {
            results: [],
            error: {
              code: 'TIMEOUT',
              message: 'Geocoding request timed out.',
              userFriendlyMessage: 'Zahtjev je istekao: Poslužitelj za pretragu lokacija nije odgovorio na vrijeme.',
              suggestion: 'Pokušajte ponovno ili unesite kraći pojam.',
            },
          };
        }
        return { results: [], error: null };
      }
      networkErrorCount++;
    }

    // 3. Tertiary: Photon Komoot Open Geocoding
    totalAttempts++;
    try {
      const encoded = encodeURIComponent(trimmed);
      const photonUrl = `https://photon.komoot.io/api/?q=${encoded}&limit=${limit}&lang=${encodeURIComponent(lang)}`;

      const res = await fetch(photonUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timerId);

      if (res.ok) {
        const data = (await res.json()) as PhotonResponse;
        if (Array.isArray(data.features)) {
          const results = data.features
            .map(normalizePhotonFeature)
            .filter((r): r is GeocodingResult => r !== null);

          if (results.length > 0) {
            this.setInCache(cacheKey, results);
            return { results, error: null, providerUsed: 'Photon Komoot' };
          }
        }
      } else if (res.status === 429) {
        rateLimitHit = true;
        rateLimitProvider = 'Photon Komoot';
      }
    } catch (err: unknown) {
      clearTimeout(timerId);
      if (err instanceof Error && err.name === 'AbortError') {
        if (isTimedOut) {
          return {
            results: [],
            error: {
              code: 'TIMEOUT',
              message: 'Geocoding request timed out.',
              userFriendlyMessage: 'Zahtjev je istekao: Poslužitelj za pretragu lokacija nije odgovorio na vrijeme.',
              suggestion: 'Pokušajte ponovno ili unesite kraći pojam.',
            },
          };
        }
        return { results: [], error: null };
      }
      networkErrorCount++;
    }

    clearTimeout(timerId);

    // Build specific categorized error detail
    let errorDetail: GeocodingErrorDetail;

    if (isTimedOut) {
      errorDetail = {
        code: 'TIMEOUT',
        message: 'Geocoding request timed out.',
        userFriendlyMessage: 'Vrijeme čekanja je isteklo: Zahtjev za lokacijom je predugo trajao.',
        suggestion: 'Pokušajte ponovno ili provjerite stabilnost veze.',
      };
    } else if (rateLimitHit) {
      errorDetail = {
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        provider: rateLimitProvider,
        message: `API rate limit exceeded (HTTP 429) on ${rateLimitProvider}.`,
        userFriendlyMessage: 'Ograničenje broja upita (HTTP 429): Prekoračena je kvota za pretragu lokacija. Pričekajte nekoliko trenutaka.',
        suggestion: 'Pričekajte nekoliko sekundi prije ponovnog slanja upita.',
      };
    } else if ((networkErrorCount > 0 && networkErrorCount >= totalAttempts) || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      errorDetail = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failure: unable to contact geocoding registry.',
        userFriendlyMessage: 'Mrežna greška: Povezivanje s poslužiteljem za lokacije nije uspjelo. Provjerite internetsku vezu.',
        suggestion: 'Provjerite Wi-Fi / mobilne podatke ili status VPN-a.',
      };
    } else {
      // Clean HTTP response received, but no locations match query
      errorDetail = {
        code: 'EMPTY_RESULTS',
        message: `No geographic locations matched query "${trimmed}".`,
        userFriendlyMessage: `Nema pronađenih lokacija za "${trimmed}". Provjerite pravopis ili unesite naziv većeg grada.`,
        suggestion: 'Pokušajte unijeti naziv grada, državu ili GPS koordinate (npr. 45.815, 15.981).',
      };
      this.setInCache(cacheKey, []);
    }

    return {
      results: [],
      error: errorDetail,
    };
  }

  /**
   * Forward Geocode: Search for address, city, country, postal code, or coordinate string
   */
  async forwardGeocode(address: string, options?: GeocodingRequestOptions): Promise<GeocodingResult[]> {
    const detailed = await this.forwardGeocodeDetailed(address, options);
    return detailed.results;
  }

  /**
   * Reverse Geocode: Coordinates -> Formatted Address
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
    options?: GeocodingRequestOptions
  ): Promise<GeocodingResult | null> {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    const lang = options?.lang || 'en';
    const cacheKey = `rev:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${lang}`;

    const cached = this.getFromCache<GeocodingResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timerId);
        return {
          latitude,
          longitude,
          formattedAddress: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        };
      }
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const apiKey = this.getApiKey();

    // Primary: Geoapify Reverse Geocoding
    if (apiKey) {
      try {
        const url = new URL(`${this.getBaseUrl()}/reverse`);
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));
        url.searchParams.set('apiKey', apiKey);
        url.searchParams.set('lang', lang);
        url.searchParams.set('format', 'geojson');

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as GeoapifyResponse;
          const parsed = this.parseGeoapifyResponse(data);
          if (parsed.length > 0) {
            clearTimeout(timerId);
            this.setInCache(cacheKey, parsed[0]);
            return parsed[0];
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          clearTimeout(timerId);
          return {
            latitude,
            longitude,
            formattedAddress: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          };
        }
      }
    }

    // Secondary: OpenStreetMap Nominatim Reverse
    try {
      const directUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&addressdetails=1&accept-language=${encodeURIComponent(lang)}`;
      const res = await fetch(directUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timerId);

      if (res.ok) {
        const rawData = (await res.json()) as NominatimSearchResult;
        const normalized = normalizeNominatimResult(rawData);
        if (normalized) {
          this.setInCache(cacheKey, normalized);
          return normalized;
        }
      }
    } catch (err: unknown) {
      clearTimeout(timerId);
    }

    // Safe fallback representation
    return {
      latitude,
      longitude,
      formattedAddress: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    };
  }

  /**
   * Autocomplete address suggestions
   */
  async autocomplete(query: string, options?: GeocodingRequestOptions): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const limit = options?.limit || 5;
        const lang = options?.lang || 'en';
        const url = new URL(`${this.getBaseUrl()}/autocomplete`);
        url.searchParams.set('text', trimmed);
        url.searchParams.set('apiKey', apiKey);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('lang', lang);
        url.searchParams.set('format', 'geojson');

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: options?.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as GeoapifyResponse;
          const parsed = this.parseGeoapifyResponse(data);
          if (parsed.length > 0) return parsed;
        }
      } catch {
        // Fallback to forwardGeocode
      }
    }

    return this.forwardGeocode(trimmed, options);
  }

  /**
   * Backward-compatible geocode returning GeoResult[]
   */
  async geocode(query: string, options?: GeocodingRequestOptions): Promise<GeoResult[]> {
    const results = await this.forwardGeocode(query, options);
    return results.map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      label: r.formattedAddress,
      formattedAddress: r.formattedAddress,
      city: r.city,
      country: r.country,
      countryCode: r.countryCode,
      postcode: r.postcode,
      state: r.state,
      boundingBox: r.boundingBox,
    }));
  }

  async searchPlaces(query: string, options?: GeocodingRequestOptions): Promise<GeoResult[]> {
    return this.geocode(query, options);
  }
}

// Canonical singleton service
export const geocodingService = new GeoapifyGeocodingService();

// Aliases for seamless backward compatibility
export const NominatimGeocodingService = GeoapifyGeocodingService;

/**
 * Top-level location search functions
 */
export async function searchLocation(
  query: string,
  options?: GeocodingRequestOptions
): Promise<GeocodingResult[]> {
  return geocodingService.forwardGeocode(query, options);
}

export async function searchLocationDetailed(
  query: string,
  options?: GeocodingRequestOptions
): Promise<GeocodingDetailedResult> {
  return geocodingService.forwardGeocodeDetailed(query, options);
}

export const searchLocations = searchLocation;
export const searchLocationsDetailed = searchLocationDetailed;


import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeoapifyGeocodingService, geocodingService, searchLocations } from '../geocodingService';

describe('Geoapify & OpenStreetMap Geocoding Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('normalizes Geoapify features correctly when API key is available', async () => {
    const mockGeoapifyResponse = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            place_id: 'geo_123',
            name: 'Ilica 1',
            formatted: 'Ilica 1, 10000 Zagreb, Croatia',
            city: 'Zagreb',
            country: 'Croatia',
            country_code: 'hr',
            postcode: '10000',
            lat: 45.8131,
            lon: 15.9775,
            bbox: [15.976, 45.812, 15.978, 45.814],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.geoapify.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockGeoapifyResponse,
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [],
      });
    });

    const testService = new GeoapifyGeocodingService();
    // Simulate apiKey present
    vi.spyOn(testService, 'isConfigured').mockReturnValue(true);
    vi.spyOn(testService as any, 'getApiKey').mockReturnValue('test_geoapify_key');

    const results = await testService.forwardGeocode('Ilica 1, Zagreb');
    expect(results.length).toBe(1);
    expect(results[0].latitude).toBe(45.8131);
    expect(results[0].longitude).toBe(15.9775);
    expect(results[0].formattedAddress).toBe('Ilica 1, 10000 Zagreb, Croatia');
    expect(results[0].city).toBe('Zagreb');
    expect(results[0].country).toBe('Croatia');
    expect(results[0].countryCode).toBe('HR');
  });

  it('falls back to OpenStreetMap Nominatim when no Geoapify key is configured', async () => {
    const mockNominatimResponse = [
      {
        place_id: 123456,
        lat: '45.8131',
        lon: '15.9775',
        display_name: 'Ilica 1, 10000 Zagreb, Croatia',
        name: 'Ilica',
        boundingbox: ['45.812', '45.814', '15.976', '15.978'],
        address: {
          road: 'Ilica',
          house_number: '1',
          city: 'Zagreb',
          state: 'City of Zagreb',
          country: 'Croatia',
          country_code: 'hr',
          postcode: '10000',
        },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockNominatimResponse,
    });

    const testService = new GeoapifyGeocodingService();
    vi.spyOn(testService, 'getApiKey').mockReturnValue('');
    const results = await testService.forwardGeocode('Ilica 1, Zagreb');
    expect(results.length).toBe(1);
    expect(results[0].latitude).toBe(45.8131);
    expect(results[0].longitude).toBe(15.9775);
    expect(results[0].city).toBe('Zagreb');
  });

  it('normalizes reverse geocoding results into canonical GeocodingResult', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        place_id: 789012,
        lat: '52.5219',
        lon: '13.4132',
        display_name: 'Alexanderplatz, 10178 Berlin, Germany',
        address: {
          city: 'Berlin',
          state: 'Berlin',
          country: 'Germany',
          country_code: 'de',
          postcode: '10178',
        },
      }),
    });

    const testService = new GeoapifyGeocodingService();
    const result = await testService.reverseGeocode(52.5219, 13.4132);
    expect(result).not.toBeNull();
    expect(result?.city).toBe('Berlin');
    expect(result?.country).toBe('Germany');
    expect(result?.countryCode).toBe('DE');
    expect(result?.formattedAddress).toBe('Alexanderplatz, 10178 Berlin, Germany');
  });

  it('handles HTTP 429 rate limits gracefully and attempts fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const testService = new GeoapifyGeocodingService();
    const results = await testService.forwardGeocode('Test Address');
    expect(results).toEqual([]);
  });

  it('returns coordinate fallback for reverse geocoding if network fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const testService = new GeoapifyGeocodingService();
    const result = await testService.reverseGeocode(45.123456, 15.654321);
    expect(result).not.toBeNull();
    expect(result?.latitude).toBe(45.123456);
    expect(result?.longitude).toBe(15.654321);
    expect(result?.formattedAddress).toBe('45.12346, 15.65432');
  });

  it('handles empty query string safely', async () => {
    const testService = new GeoapifyGeocodingService();
    const results = await testService.forwardGeocode('   ');
    expect(results).toEqual([]);
  });

  it('caches results to prevent duplicate network requests', async () => {
    const mockResponse = [
      {
        place_id: 111,
        lat: '48.8566',
        lon: '2.3522',
        display_name: 'Paris, France',
        name: 'Paris',
        address: { city: 'Paris', country: 'France', country_code: 'fr' },
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    global.fetch = fetchMock;

    const testService = new GeoapifyGeocodingService();
    vi.spyOn(testService, 'getApiKey').mockReturnValue('');
    await testService.forwardGeocode('Paris UNIQUE QUERY');
    await testService.forwardGeocode('Paris UNIQUE QUERY');

    // Should only call fetch once for the primary forwardGeocode
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('forwardGeocodeDetailed classifies HTTP 429 as RATE_LIMIT_EXCEEDED with informative guidance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const testService = new GeoapifyGeocodingService();
    const detailed = await testService.forwardGeocodeDetailed('Rate limited query');
    expect(detailed.results).toEqual([]);
    expect(detailed.error).toBeDefined();
    expect(detailed.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(detailed.error?.statusCode).toBe(429);
    expect(detailed.error?.userFriendlyMessage).toContain('429');
  });

  it('forwardGeocodeDetailed classifies network failure as NETWORK_ERROR', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const testService = new GeoapifyGeocodingService();
    const detailed = await testService.forwardGeocodeDetailed('Network fail query');
    expect(detailed.results).toEqual([]);
    expect(detailed.error).toBeDefined();
    expect(detailed.error?.code).toBe('NETWORK_ERROR');
    expect(detailed.error?.userFriendlyMessage.toLowerCase()).toContain('mrež');
  });

  it('forwardGeocodeDetailed classifies 0 matches as EMPTY_RESULTS', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    const testService = new GeoapifyGeocodingService();
    vi.spyOn(testService, 'getApiKey').mockReturnValue('');
    const detailed = await testService.forwardGeocodeDetailed('Nonexistent Place XYZ 99999');
    expect(detailed.results).toEqual([]);
    expect(detailed.error).toBeDefined();
    expect(detailed.error?.code).toBe('EMPTY_RESULTS');
  });
});

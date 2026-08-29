import { describe, it, expect } from 'vitest';
import { geoConfig, resolveVectorMapStyleUrl } from '../geo/geoConfig';

describe('Geo Configuration & Providers (Geoapify + OpenStreetMap)', () => {
  it('configures OpenStreetMap and CARTO tile URLs', () => {
    expect(geoConfig.osm.darkTileUrl).toContain('basemaps.cartocdn.com/dark_all');
    expect(geoConfig.osm.standardTileUrl).toContain('tile.openstreetmap.org');
  });

  it('includes proper open source attribution for Geoapify and OpenStreetMap', () => {
    expect(geoConfig.geocoding.attribution).toContain('Geoapify');
    expect(geoConfig.geocoding.attribution).toContain('OpenStreetMap');
  });

  it('configures Geoapify geocoding provider and endpoint', () => {
    expect(geoConfig.geocoding.provider).toBe('geoapify');
    expect(geoConfig.geoapify.apiUrl).toContain('api.geoapify.com/v1/geocode');
  });

  it('resolves vector map style URL safely without 401 unauthenticated errors', () => {
    const url = resolveVectorMapStyleUrl();
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    // If no key is set, it must not return an unauthorized Geoapify URL without apiKey
    if (!import.meta.env.VITE_GEOAPIFY_API_KEY && url.includes('geoapify.com')) {
      expect(url).toContain('apiKey=');
    }
  });
});

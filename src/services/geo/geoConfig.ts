import { MapProviderConfig, GeocodingProviderConfig, GeoapifyConfig } from './types';

/**
 * Resolve vector map style URL safely.
 * If a Geoapify style URL is configured without an API key, fallback to OpenFreeMap dark style
 * to prevent HTTP 401 AJAXError.
 */
export function resolveVectorMapStyleUrl(): string {
  const envStyleUrl = import.meta.env.VITE_MAP_STYLE_URL;
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

  if (envStyleUrl) {
    if (envStyleUrl.includes('geoapify.com')) {
      if (apiKey) {
        if (!envStyleUrl.includes('apiKey=')) {
          const delimiter = envStyleUrl.includes('?') ? '&' : '?';
          return `${envStyleUrl}${delimiter}apiKey=${apiKey}`;
        }
        return envStyleUrl;
      }
      // Geoapify URL but no API key configured -> fallback to keyless OpenFreeMap
      return 'https://tiles.openfreemap.org/styles/dark';
    }
    return envStyleUrl;
  }

  if (apiKey) {
    return `https://maps.geoapify.com/v1/styles/dark-matter/style.json?apiKey=${apiKey}`;
  }

  return 'https://tiles.openfreemap.org/styles/dark';
}

// Standardized Geoapify & OpenStreetMap configuration
export const geoConfig = {
  geoapify: {
    apiKey: import.meta.env.VITE_GEOAPIFY_API_KEY || '',
    apiUrl: 'https://api.geoapify.com/v1/geocode',
  } as GeoapifyConfig,
  osm: {
    // OpenStreetMap standard tile layers & Dark tactical CARTO tile layers with OSM data
    standardTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    darkTileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satelliteTileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
  },
  map: {
    styleUrl: resolveVectorMapStyleUrl(),
    attribution: '&copy; <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  } as MapProviderConfig,
  geocoding: {
    provider: 'geoapify',
    apiUrl: import.meta.env.VITE_GEOCODING_API_URL || 'https://api.geoapify.com/v1/geocode',
    apiKey: import.meta.env.VITE_GEOAPIFY_API_KEY || '',
    attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  } as GeocodingProviderConfig,
};


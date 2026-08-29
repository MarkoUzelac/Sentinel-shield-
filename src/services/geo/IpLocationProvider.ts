import { GeoResult } from './types';

export class FreeIpLocationProvider {
  async getCurrentLocation(): Promise<GeoResult | null> {
    try {
      const res = await fetch('https://freeipapi.com/api/json/');
      if (!res.ok) throw new Error('IP API failed');
      const data = await res.json();
      
      if (data && data.latitude && data.longitude) {
        return {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          label: `${data.cityName || 'Unknown'}, ${data.countryCode || 'Unknown'} (IP)`,
          city: data.cityName,
          country: data.countryName,
          ipAddress: data.ipAddress,
        };
      }
      return null;
    } catch (err) {
      console.warn('IP location fetch failed', err);
      return null;
    }
  }
}

export const ipLocationService = new FreeIpLocationProvider();

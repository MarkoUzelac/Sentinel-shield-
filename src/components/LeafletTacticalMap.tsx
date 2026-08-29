import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { GeocodingResult } from '../services/geo/types';
import { geoConfig } from '../services/geo/geoConfig';

export interface TacticalCellTower {
  id: string;
  cellId?: string;
  operator?: string;
  type?: string;
  lat: number;
  lon: number;
  signalStrength?: number;
  status: 'VERIFIED' | 'ROGUE' | 'CRITICAL' | 'SUSPICIOUS';
  range?: number;
}

export interface TacticalThreatPoint {
  id: string;
  lat: number;
  lon: number;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

// Custom Tactical SVG Marker Generator using Leaflet DivIcon
const createTacticalDivIcon = (
  type: 'user' | 'waypoint' | 'tower' | 'threat',
  status?: string
): L.DivIcon => {
  let innerHtml = '';
  let iconSize: [number, number] = [28, 28];
  let iconAnchor: [number, number] = [14, 14];

  if (type === 'user') {
    iconSize = [36, 36];
    iconAnchor = [18, 18];
    innerHtml = `
      <div class="relative flex items-center justify-center w-9 h-9">
        <div class="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></div>
        <div class="absolute inset-1 rounded-full border-2 border-cyan-400 bg-cyan-950/80 backdrop-blur-sm flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.8)]">
          <div class="w-2.5 h-2.5 rounded-full bg-cyan-300"></div>
        </div>
        <div class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 border border-black"></div>
      </div>
    `;
  } else if (type === 'waypoint') {
    iconSize = [32, 32];
    iconAnchor = [16, 30];
    innerHtml = `
      <div class="relative flex flex-col items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.8)] backdrop-blur-sm animate-pulse">
          <div class="w-2 h-2 bg-amber-300 rotate-45"></div>
        </div>
        <div class="w-0.5 h-2 bg-amber-400"></div>
      </div>
    `;
  } else if (type === 'tower') {
    const isRogue = status === 'ROGUE' || status === 'CRITICAL' || status === 'SUSPICIOUS';
    const colorClass = isRogue
      ? 'border-red-500 bg-red-950/90 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
      : 'border-emerald-500 bg-emerald-950/90 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    iconSize = [28, 28];
    iconAnchor = [14, 14];
    innerHtml = `
      <div class="w-7 h-7 rounded-lg border ${colorClass} flex items-center justify-center text-[10px] font-mono font-bold backdrop-blur-sm">
        ${isRogue ? '!' : 'T'}
      </div>
    `;
  } else {
    // Threat point
    iconSize = [24, 24];
    iconAnchor = [12, 12];
    innerHtml = `
      <div class="w-6 h-6 rounded-full border border-rose-500 bg-rose-950/90 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.8)]">
        <div class="w-2 h-2 rounded-full bg-rose-400 animate-ping"></div>
      </div>
    `;
  }

  return L.divIcon({
    html: innerHtml,
    className: 'custom-tactical-marker',
    iconSize,
    iconAnchor,
    popupAnchor: [0, -iconAnchor[1] - 4],
  });
};

export interface LeafletTacticalMapProps {
  userLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    hasFix: boolean;
  };
  zoom?: number;
  towers?: TacticalCellTower[];
  threatPoints?: TacticalThreatPoint[];
  selectedWaypoint?: GeocodingResult | null;
  onSelectWaypoint?: (wp: GeocodingResult) => void;
  onMapClick?: (lat: number, lon: number) => void;
  filter?: 'ALL' | 'SUSPICIOUS' | 'CRITICAL' | 'VERIFIED';
  layerVisibility?: {
    towers?: boolean;
    threats?: boolean;
    rangeCircles?: boolean;
    radarOverlay?: boolean;
  };
  tileTheme?: 'DARK_CARTO' | 'STANDARD_OSM' | 'SATELLITE';
}

export const LeafletTacticalMap: React.FC<LeafletTacticalMapProps> = ({
  userLocation,
  zoom = 15,
  towers = [],
  threatPoints = [],
  selectedWaypoint,
  onMapClick,
  filter = 'ALL',
  layerVisibility = { towers: true, threats: true, rangeCircles: true, radarOverlay: true },
  tileTheme = 'DARK_CARTO',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayersRef = useRef<{
    user: L.LayerGroup;
    waypoint: L.LayerGroup;
    towers: L.LayerGroup;
    threats: L.LayerGroup;
    circles: L.LayerGroup;
  } | null>(null);

  const prevCenterRef = useRef<[number, number] | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedWaypoint) {
      return [selectedWaypoint.latitude, selectedWaypoint.longitude];
    }
    if (userLocation.hasFix) {
      return [userLocation.latitude, userLocation.longitude];
    }
    return [45.815, 15.9819]; // Default fallback tactical center
  }, [selectedWaypoint, userLocation]);

  // Determine Tile Layer URL & Attribution based on selected mode
  const tileConfig = useMemo(() => {
    if (tileTheme === 'STANDARD_OSM') {
      return {
        url: geoConfig.osm.standardTileUrl,
        attribution: geoConfig.osm.attribution,
        maxZoom: 19,
      };
    }
    if (tileTheme === 'SATELLITE') {
      return {
        url: geoConfig.osm.satelliteTileUrl,
        attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 18,
      };
    }
    // Default: Dark Tactical CARTO with OSM contributor data
    return {
      url: geoConfig.osm.darkTileUrl,
      attribution: geoConfig.osm.attribution,
      maxZoom: 20,
    };
  }, [tileTheme]);

  // Initialize pure Leaflet Map instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom,
      zoomControl: false,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Create LayerGroups for organized marker/circle updates
    const userLayer = L.layerGroup().addTo(map);
    const waypointLayer = L.layerGroup().addTo(map);
    const towersLayer = L.layerGroup().addTo(map);
    const threatsLayer = L.layerGroup().addTo(map);
    const circlesLayer = L.layerGroup().addTo(map);

    overlayLayersRef.current = {
      user: userLayer,
      waypoint: waypointLayer,
      towers: towersLayer,
      threats: threatsLayer,
      circles: circlesLayer,
    };

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;
    prevCenterRef.current = mapCenter;

    // Invalidate map size to ensure tiles render immediately
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      overlayLayersRef.current = null;
    };
  }, []);

  // Update Tile Layer if theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(tileConfig.url);
      tileLayerRef.current.options.attribution = tileConfig.attribution;
      tileLayerRef.current.options.maxZoom = tileConfig.maxZoom;
    }
  }, [tileConfig]);

  // Smooth Pan/FlyTo when Center or Zoom changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prev = prevCenterRef.current;
    const isDifferent =
      !prev ||
      Math.abs(prev[0] - mapCenter[0]) > 0.0001 ||
      Math.abs(prev[1] - mapCenter[1]) > 0.0001;

    if (isDifferent) {
      prevCenterRef.current = mapCenter;
      map.flyTo(mapCenter, zoom, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [mapCenter, zoom]);

  // Update Layers & Markers
  useEffect(() => {
    const layers = overlayLayersRef.current;
    if (!layers) return;

    // 1. Clear all dynamic layer groups
    layers.user.clearLayers();
    layers.waypoint.clearLayers();
    layers.towers.clearLayers();
    layers.threats.clearLayers();
    layers.circles.clearLayers();

    // 2. User GPS Marker & Accuracy Circle
    if (userLocation.hasFix) {
      const userIcon = createTacticalDivIcon('user');
      const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userIcon,
      });

      const userPopupHtml = `
        <div class="p-2.5 bg-neutral-950 text-neutral-100 rounded-lg border border-cyan-500/40 text-xs font-mono">
          <div class="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            ACTIVE TACTICAL FIX
          </div>
          <div class="text-[11px] text-neutral-300 space-y-0.5">
            <div>LAT: ${userLocation.latitude.toFixed(6)}</div>
            <div>LON: ${userLocation.longitude.toFixed(6)}</div>
            ${
              userLocation.accuracy
                ? `<div class="text-neutral-400">ACCURACY: ±${Math.round(userLocation.accuracy)}m</div>`
                : ''
            }
          </div>
        </div>
      `;
      userMarker.bindPopup(userPopupHtml);
      layers.user.addLayer(userMarker);

      if (
        layerVisibility.rangeCircles &&
        userLocation.accuracy &&
        userLocation.accuracy < 2000
      ) {
        const accuracyCircle = L.circle(
          [userLocation.latitude, userLocation.longitude],
          {
            radius: userLocation.accuracy,
            color: '#06b6d4',
            fillColor: '#06b6d4',
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '3, 6',
          }
        );
        layers.circles.addLayer(accuracyCircle);
      }
    }

    // 3. Selected Search Waypoint Marker
    if (selectedWaypoint) {
      const waypointIcon = createTacticalDivIcon('waypoint');
      const wpMarker = L.marker(
        [selectedWaypoint.latitude, selectedWaypoint.longitude],
        { icon: waypointIcon }
      );

      const wpPopupHtml = `
        <div class="p-2.5 bg-neutral-950 text-neutral-100 rounded-lg border border-amber-500/40 text-xs font-mono max-w-[240px]">
          <div class="text-amber-400 font-bold uppercase tracking-wider text-[11px] mb-1">
            TARGET WAYPOINT
          </div>
          <div class="text-neutral-200 text-xs font-semibold mb-1 truncate">
            ${selectedWaypoint.name || selectedWaypoint.city || 'Waypoint'}
          </div>
          <div class="text-[10px] text-neutral-400 line-clamp-2 leading-tight mb-2">
            ${selectedWaypoint.formattedAddress}
          </div>
          <div class="text-[10px] text-neutral-500 flex justify-between border-t border-neutral-800 pt-1">
            <span>${selectedWaypoint.latitude.toFixed(5)} N</span>
            <span>${selectedWaypoint.longitude.toFixed(5)} E</span>
          </div>
        </div>
      `;
      wpMarker.bindPopup(wpPopupHtml);
      layers.waypoint.addLayer(wpMarker);
    }

    // 4. Cellular Towers (with Tactical Filter)
    if (layerVisibility.towers) {
      const filteredTowers = towers.filter((t) => {
        if (filter === 'SUSPICIOUS') return t.status === 'SUSPICIOUS' || t.status === 'ROGUE';
        if (filter === 'CRITICAL') return t.status === 'ROGUE' || t.status === 'CRITICAL';
        if (filter === 'VERIFIED') return t.status === 'VERIFIED';
        return true;
      });

      filteredTowers.forEach((tower) => {
        const isRogue = tower.status === 'ROGUE' || tower.status === 'CRITICAL';
        const towerIcon = createTacticalDivIcon('tower', tower.status);
        const towerMarker = L.marker([tower.lat, tower.lon], { icon: towerIcon });

        const towerPopupHtml = `
          <div class="p-2 bg-neutral-950 text-neutral-100 rounded-lg border border-neutral-800 text-xs font-mono">
            <div class="font-bold mb-1 ${isRogue ? 'text-red-400' : 'text-emerald-400'}">
              ${isRogue ? '⚠️ ANOMALOUS BTS TOWER' : '✓ VERIFIED CARRIER TOWER'}
            </div>
            <div class="text-[11px] text-neutral-300 space-y-0.5">
              <div>OPERATOR: ${tower.operator || 'UNKNOWN'}</div>
              <div>RAT: ${tower.type || 'LTE'}</div>
              <div>CID: ${tower.cellId || tower.id}</div>
              <div>POWER: ${tower.signalStrength ? `${tower.signalStrength} dBm` : 'N/A'}</div>
              <div>STATUS: ${tower.status}</div>
            </div>
          </div>
        `;
        towerMarker.bindPopup(towerPopupHtml);
        layers.towers.addLayer(towerMarker);

        if (layerVisibility.rangeCircles && tower.range) {
          const towerCircle = L.circle([tower.lat, tower.lon], {
            radius: tower.range,
            color: isRogue ? '#ef4444' : '#10b981',
            fillColor: isRogue ? '#ef4444' : '#10b981',
            fillOpacity: 0.04,
            weight: 1,
            dashArray: '2, 4',
          });
          layers.circles.addLayer(towerCircle);
        }
      });
    }

    // 5. Threat Points
    if (layerVisibility.threats) {
      threatPoints.forEach((tp) => {
        const threatIcon = createTacticalDivIcon('threat');
        const threatMarker = L.marker([tp.lat, tp.lon], { icon: threatIcon });

        const threatPopupHtml = `
          <div class="p-2 bg-neutral-950 text-neutral-100 rounded-lg border border-rose-500/50 text-xs font-mono">
            <div class="text-rose-400 font-bold mb-1">⚠️ RF/NETWORK THREAT</div>
            <div class="text-[11px] text-neutral-300">
              <div>TYPE: ${tp.type}</div>
              <div>SEVERITY: ${tp.severity}</div>
              <div class="text-neutral-400 mt-1">${tp.description}</div>
            </div>
          </div>
        `;
        threatMarker.bindPopup(threatPopupHtml);
        layers.threats.addLayer(threatMarker);
      });
    }
  }, [userLocation, towers, threatPoints, selectedWaypoint, filter, layerVisibility]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800">
      <div
        ref={containerRef}
        className="w-full h-full z-0 font-sans"
        style={{ background: '#09090b', minHeight: '100%', height: '100%', width: '100%' }}
      />
    </div>
  );
};

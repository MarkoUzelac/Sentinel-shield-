import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { DeviceLocationState, SignalRadarItem, AppSkinConfig, GeocodingResult } from '../types';
import {
  Crosshair,
  MapPin,
  ExternalLink,
  Map as MapIcon,
  Radar,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  ShieldAlert,
  Info,
  X,
  Radio,
  Search,
  Loader2,
  Layers,
  WifiOff,
  Clock,
  SearchX,
  AlertTriangle,
} from 'lucide-react';
import Map, { Marker, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoConfig, geocodingService, searchLocationDetailed, GeocodingErrorDetail } from '../services/geo';
import { ThreatSnapshotEngine } from '../services/threatSnapshotEngine';
import { LeafletTacticalMap } from './LeafletTacticalMap';
import { LocationSearchSkeleton } from './LocationSearchSkeleton';
import { useToast } from '../context/ToastContext';

interface Props {
  location: DeviceLocationState;
  signals: SignalRadarItem[];
  skin: AppSkinConfig;
  onSampleLoad?: () => void;
}

export const TacticalRadarMap: React.FC<Props> = ({ location, signals, skin, onSampleLoad }) => {
  const mapRef = useRef<MapRef | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'LEAFLET_OSM' | 'RADAR' | 'VECTOR_MAP'>('LEAFLET_OSM');
  const [tileTheme, setTileTheme] = useState<'DARK_CARTO' | 'STANDARD_OSM' | 'SATELLITE'>('DARK_CARTO');
  const [selectedSignal, setSelectedSignal] = useState<SignalRadarItem | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Address search and geocoding state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchErrorDetail, setSearchErrorDetail] = useState<GeocodingErrorDetail | null>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<GeocodingResult | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [vectorMapStyle, setVectorMapStyle] = useState<string>(geoConfig.map.styleUrl);

  const { addToast, addGeocodingErrorToast } = useToast();

  const defaultCenter = useMemo(() => {
    return {
      lat: location.latitude ?? 45.815,
      lng: location.longitude ?? 15.9819,
    };
  }, [location.latitude, location.longitude]);

  const [viewState, setViewState] = useState({
    longitude: defaultCenter.lng,
    latitude: defaultCenter.lat,
    zoom: 14,
  });

  // Sync view state when location gets first fix
  useEffect(() => {
    if (location.hasFix && location.latitude && location.longitude) {
      setViewState((prev) => ({
        ...prev,
        latitude: location.latitude!,
        longitude: location.longitude!,
      }));
    }
  }, [location.hasFix, location.latitude, location.longitude]);

  // Reverse geocode user location when GPS fix is available
  useEffect(() => {
    if (!location.hasFix || !location.latitude || !location.longitude) {
      setResolvedAddress(null);
      return;
    }
    let isCancelled = false;
    geocodingService
      .reverseGeocode(location.latitude, location.longitude)
      .then((result) => {
        if (!isCancelled && result && result.formattedAddress) {
          setResolvedAddress(result.formattedAddress);
        }
      })
      .catch(() => {
        // Fallback coordinate label
        if (!isCancelled && location.latitude && location.longitude) {
          setResolvedAddress(`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [location.hasFix, location.latitude, location.longitude]);

  // Debounced search query via Geoapify Geocoding API with open fallback
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setSearchErrorDetail(null);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError(null);
    setSearchErrorDetail(null);

    const timer = setTimeout(async () => {
      try {
        const detailed = await searchLocationDetailed(trimmed, {
          signal: controller.signal,
          limit: 6,
        });
        if (!controller.signal.aborted) {
          setSearchResults(detailed.results);
          if (detailed.error) {
            setSearchErrorDetail(detailed.error);
            setSearchError(detailed.error.userFriendlyMessage);
          } else {
            setSearchErrorDetail(null);
            setSearchError(null);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const fallbackErr: GeocodingErrorDetail = {
            code: 'NETWORK_ERROR',
            message: 'Mrežna veza s lokacijskim servisom prekinuta.',
            userFriendlyMessage: 'Pretraga adrese nije uspjela zbog prekida mrežne veze.',
            suggestion: 'Provjerite internetsku vezu i pokušajte ponovno.',
          };
          setSearchResults([]);
          setSearchErrorDetail(fallbackErr);
          setSearchError(fallbackErr.userFriendlyMessage);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSearchSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) return;
    setIsSearching(true);
    setIsSearchOpen(true);
    setSearchError(null);
    setSearchErrorDetail(null);
    try {
      const detailed = await searchLocationDetailed(trimmed, { limit: 6 });
      setSearchResults(detailed.results);
      if (detailed.error) {
        setSearchErrorDetail(detailed.error);
        setSearchError(detailed.error.userFriendlyMessage);
        // Explicitly trigger a categorized toast notification on explicit submit
        addGeocodingErrorToast(detailed.error);
      } else {
        setSearchErrorDetail(null);
        setSearchError(null);
        if (detailed.results.length > 0) {
          addToast({
            type: 'info',
            title: 'REZULTATI PRETRAGE',
            message: `Pronađeno ${detailed.results.length} lokacija za "${trimmed}"`,
          });
        }
      }
    } catch (err) {
      const fallbackErr: GeocodingErrorDetail = {
        code: 'NETWORK_ERROR',
        message: 'Mrežna greška pri slanju upita.',
        userFriendlyMessage: 'Pretraga adrese nije uspjela. Došlo je do mrežne greške.',
        suggestion: 'Provjerite internetsku vezu i pokušajte ponovno.',
      };
      setSearchResults([]);
      setSearchErrorDetail(fallbackErr);
      setSearchError(fallbackErr.userFriendlyMessage);
      addGeocodingErrorToast(fallbackErr);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: GeocodingResult) => {
    setSelectedWaypoint(result);
    setSearchQuery(result.formattedAddress);
    setIsSearchOpen(false);
    setSearchError(null);
    setSearchErrorDetail(null);
    setViewState({
      latitude: result.latitude,
      longitude: result.longitude,
      zoom: 15,
    });
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [result.longitude, result.latitude],
        zoom: 15,
        duration: 900,
      });
    }
    addToast({
      type: 'success',
      title: 'CILJNA TOČKA ZAKLJUČANA',
      message: result.formattedAddress,
      suggestion: `GPS koordinate: [${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}]`,
    });
  };

  const handleClearWaypoint = () => {
    setSelectedWaypoint(null);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
    setSearchError(null);
    setSearchErrorDetail(null);
  };

  // Handle map click on Leaflet map to pick coordinates
  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    const reverse = await geocodingService.reverseGeocode(lat, lon);
    const newWaypoint: GeocodingResult = reverse || {
      latitude: lat,
      longitude: lon,
      formattedAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      name: 'Custom Coordinate Target',
    };
    setSelectedWaypoint(newWaypoint);
    setSearchQuery(newWaypoint.formattedAddress);
  }, []);

  // Handle Radar Canvas Animation
  useEffect(() => {
    if (viewMode !== 'RADAR') return;
    let animationFrameId: number;
    let sweepAngle = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 320;
      const height = 300;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + 5;
      const maxRadius = Math.min(width, height) * 0.38;

      // Concentric Rings
      const rings = [0.33, 0.66, 1.0];
      rings.forEach((ratio, idx) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * ratio, 0, 2 * Math.PI);
        ctx.strokeStyle = idx === 2 ? `${skin.primaryColor}44` : `${skin.primaryColor}22`;
        ctx.lineWidth = idx === 2 ? 1.5 : 1;
        if (idx === 2) {
          ctx.setLineDash([6, 6]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();

        ctx.fillStyle = `${skin.primaryColor}06`;
        ctx.fill();
      });
      ctx.setLineDash([]);

      // Axis crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.strokeStyle = `${skin.primaryColor}18`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sweeping beam
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(sweepAngle);

      const gradient = ctx.createLinearGradient(0, 0, maxRadius, 0);
      gradient.addColorStop(0, `${skin.primaryColor}44`);
      gradient.addColorStop(1, `${skin.primaryColor}00`);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, 0, 0.45);
      ctx.fillStyle = `${skin.primaryColor}18`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius, 0);
      ctx.strokeStyle = `${skin.primaryColor}99`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // Draw Center / GPS Fix
      if (location.hasFix) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = skin.primaryColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = `${skin.primaryColor}66`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Real Signal blips (only evidence-backed)
      signals.forEach((sig, index) => {
        const angle = (index * (Math.PI / 3.2)) + 0.3;
        let distanceRatio = 0.4;
        if (sig.kind === 'BLE') {
          distanceRatio = Math.min(0.9, Math.max(0.2, (sig.estimatedDistanceMeters || 5) / 15));
        } else if (sig.kind === 'CELLULAR') {
          distanceRatio = 0.75 + (index % 3) * 0.08;
        } else {
          distanceRatio = 0.55;
        }

        const px = centerX + Math.cos(angle) * (maxRadius * distanceRatio);
        const py = centerY + Math.sin(angle) * (maxRadius * distanceRatio);

        const blipColor =
          sig.risk === 'HIGH' || sig.anomalyScore > 50
            ? '#FF3366'
            : sig.kind === 'BLE'
            ? skin.accentSecondary
            : sig.kind === 'CELLULAR'
            ? skin.primaryColor
            : '#00F0FF';

        // Outer pulse circle
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, 2 * Math.PI);
        ctx.fillStyle = `${blipColor}26`;
        ctx.fill();

        // Inner solid blip
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = blipColor;
        ctx.fill();

        // Label
        ctx.fillStyle = skin.textMutedColor;
        ctx.font = '9px monospace';
        ctx.fillText(sig.kind === 'BLE' ? 'BLE' : sig.technology.split(' ')[0], px + 8, py + 3);
      });

      sweepAngle += 0.025;
      if (sweepAngle >= Math.PI * 2) {
        sweepAngle = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [location, signals, skin, viewMode]);

  // Evidence-backed map markers only
  const mapMarkers = useMemo(() => {
    return signals
      .filter((sig) => typeof sig.latitude === 'number' && typeof sig.longitude === 'number')
      .map((sig) => {
        const isAnomaly = sig.risk === 'HIGH' || sig.anomalyScore > 50;
        const color = isAnomaly
          ? '#FF3366'
          : sig.kind === 'BLE'
          ? skin.accentSecondary
          : sig.kind === 'CELLULAR'
          ? skin.primaryColor
          : '#00F0FF';

        return {
          id: sig.id,
          signal: sig,
          position: { lat: sig.latitude!, lng: sig.longitude! },
          title: sig.label,
          color,
          isAnomaly,
          freshness: sig.freshness || 'VERIFIED',
          confidence: sig.locationConfidence || 'KNOWN_LOCATION',
        };
      });
  }, [signals, skin]);

  // Map cellular towers for Leaflet map component
  const leafletTowers = useMemo(() => {
    return signals
      .filter((s) => s.kind === 'CELLULAR' && typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map((s) => ({
        id: s.id,
        cellId: s.cellId ? String(s.cellId) : undefined,
        operator: s.label,
        type: s.technology,
        lat: s.latitude!,
        lon: s.longitude!,
        signalStrength: s.rssiDbm,
        status: s.risk === 'HIGH' ? ('ROGUE' as const) : ('VERIFIED' as const),
        range: 450,
      }));
  }, [signals]);

  const handleRequestLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await ThreatSnapshotEngine.requestGeolocationPermission();
      if (loc.hasFix && loc.latitude && loc.longitude) {
        setViewState({
          longitude: loc.longitude,
          latitude: loc.latitude,
          zoom: 15,
        });
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleResetView = useCallback(() => {
    const targetLat = location.latitude ?? defaultCenter.lat;
    const targetLng = location.longitude ?? defaultCenter.lng;
    setViewState({
      latitude: targetLat,
      longitude: targetLng,
      zoom: 14,
    });
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [targetLng, targetLat],
        zoom: 14,
        duration: 800,
      });
    }
  }, [location.latitude, location.longitude, defaultCenter]);

  const handleZoomIn = () => {
    setViewState((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 1, 18) }));
  };

  const handleZoomOut = () => {
    setViewState((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 1, 3) }));
  };

  const osmMapUrl =
    location.latitude && location.longitude
      ? `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`
      : null;

  return (
    <div
      id="tactical-radar-map"
      className="p-4 rounded-2xl border transition-all relative overflow-hidden"
      style={{
        backgroundColor: skin.cardColor,
        borderColor: `${skin.borderColor}99`,
      }}
    >
      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          {viewMode === 'RADAR' ? (
            <Crosshair className="w-4 h-4 animate-spin" style={{ color: skin.primaryColor, animationDuration: '8s' }} />
          ) : (
            <MapIcon className="w-4 h-4" style={{ color: skin.primaryColor }} />
          )}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
            {viewMode === 'RADAR'
              ? 'TACTICAL RF & IMSI SWEEP'
              : viewMode === 'LEAFLET_OSM'
              ? 'OPENSTREETMAP • LEAFLET TACTICAL RADAR'
              : 'EVIDENCE-BACKED VECTOR MAP'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Layer Style Selector for Leaflet */}
          {viewMode === 'LEAFLET_OSM' && (
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-neutral-800 text-[10px] font-mono">
              <button
                onClick={() => setTileTheme('DARK_CARTO')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  tileTheme === 'DARK_CARTO' ? 'bg-cyan-950 text-cyan-400 border border-cyan-700' : 'text-neutral-400'
                }`}
                title="Tactical Dark Map"
              >
                Dark
              </button>
              <button
                onClick={() => setTileTheme('STANDARD_OSM')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  tileTheme === 'STANDARD_OSM' ? 'bg-cyan-950 text-cyan-400 border border-cyan-700' : 'text-neutral-400'
                }`}
                title="OpenStreetMap Standard"
              >
                OSM
              </button>
              <button
                onClick={() => setTileTheme('SATELLITE')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  tileTheme === 'SATELLITE' ? 'bg-cyan-950 text-cyan-400 border border-cyan-700' : 'text-neutral-400'
                }`}
                title="Satellite Imagery"
              >
                Sat
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border" style={{ borderColor: `${skin.borderColor}44` }}>
            <button
              onClick={() => setViewMode('LEAFLET_OSM')}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
              style={{
                backgroundColor: viewMode === 'LEAFLET_OSM' ? `${skin.primaryColor}33` : 'transparent',
                color: viewMode === 'LEAFLET_OSM' ? skin.primaryColor : skin.textMutedColor,
              }}
              title="Leaflet OpenStreetMap View"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">OSM LEAFLET</span>
            </button>
            <button
              onClick={() => setViewMode('RADAR')}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
              style={{
                backgroundColor: viewMode === 'RADAR' ? `${skin.primaryColor}33` : 'transparent',
                color: viewMode === 'RADAR' ? skin.primaryColor : skin.textMutedColor,
              }}
              title="Radar Sweep View"
            >
              <Radar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RADAR</span>
            </button>
            <button
              onClick={() => setViewMode('VECTOR_MAP')}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
              style={{
                backgroundColor: viewMode === 'VECTOR_MAP' ? `${skin.primaryColor}33` : 'transparent',
                color: viewMode === 'VECTOR_MAP' ? skin.primaryColor : skin.textMutedColor,
              }}
              title="OpenFreeMap Vector View"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">VECTOR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Container */}
      <div className="relative w-full h-[340px] flex items-center justify-center rounded-xl overflow-hidden border" style={{ borderColor: `${skin.borderColor}44` }}>
        {viewMode === 'RADAR' ? (
          <div className="relative w-full h-full">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Empty State Overlay if 0 contacts */}
            {signals.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                <div className="p-3 rounded-full bg-black/40 border backdrop-blur-sm mb-2" style={{ borderColor: `${skin.borderColor}66` }}>
                  <Radio className="w-5 h-5 animate-pulse" style={{ color: skin.primaryColor }} />
                </div>
                <p className="text-xs font-mono font-bold" style={{ color: skin.textPrimaryColor }}>
                  NO ACTIVE RF CONTACTS IN RANGE
                </p>
                <p className="text-[11px] max-w-xs mt-1" style={{ color: skin.textMutedColor }}>
                  Continuous hardware RF sweep active. No anomalous eNodeB/gNodeB base stations or tracking beacons detected.
                </p>
                {onSampleLoad && (
                  <button
                    onClick={onSampleLoad}
                    className="mt-3 pointer-events-auto px-3 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer hover:bg-white/5"
                    style={{ borderColor: skin.borderColor, color: skin.primaryColor }}
                  >
                    Load Test Evidence
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Top Scanning Laser Bar during location search */}
            {isSearching && (
              <div className="absolute top-0 left-0 right-0 h-1 z-30 overflow-hidden bg-black/60 pointer-events-none">
                <div
                  className="h-full w-full animate-pulse"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${skin.primaryColor} 50%, transparent 100%)`,
                  }}
                />
              </div>
            )}

            {viewMode === 'LEAFLET_OSM' ? (
              <LeafletTacticalMap
                userLocation={{
                  latitude: viewState.latitude,
                  longitude: viewState.longitude,
                  accuracy: location.accuracyMeters,
                  hasFix: location.hasFix,
                }}
                zoom={viewState.zoom}
                towers={leafletTowers}
                threatPoints={[]}
                selectedWaypoint={selectedWaypoint}
                onSelectWaypoint={setSelectedWaypoint}
                onMapClick={handleMapClick}
                tileTheme={tileTheme}
              />
            ) : (
              <Map
                ref={mapRef}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                mapStyle={vectorMapStyle}
                style={{ width: '100%', height: '100%' }}
                attributionControl={false}
                onError={(e) => {
                  console.warn('[Sentinel Tactical Map] Vector style load error, falling back to open vector style:', e);
                  if (vectorMapStyle !== 'https://tiles.openfreemap.org/styles/dark') {
                    setVectorMapStyle('https://tiles.openfreemap.org/styles/dark');
                  }
                }}
                transformRequest={(url, resourceType) => {
                  if (url.includes('geoapify.com') && !url.includes('apiKey=')) {
                    const key = geoConfig.geoapify.apiKey || import.meta.env.VITE_GEOAPIFY_API_KEY;
                    if (key) {
                      const delimiter = url.includes('?') ? '&' : '?';
                      return { url: `${url}${delimiter}apiKey=${key}` };
                    }
                  }
                  return { url };
                }}
              >
                {/* User Location Marker (Real GPS Fix) */}
                {location.hasFix && location.latitude && location.longitude && (
                  <Marker longitude={location.longitude} latitude={location.latitude} anchor="center">
                    <div className="relative flex items-center justify-center w-7 h-7 cursor-pointer" title="Your Verified Position">
                      <div className="absolute w-full h-full rounded-full animate-ping opacity-30" style={{ backgroundColor: skin.primaryColor }} />
                      <div className="absolute w-4 h-4 rounded-full border-2 border-black shadow-lg" style={{ backgroundColor: skin.primaryColor }} />
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-black" />
                    </div>
                  </Marker>
                )}

                {/* Evidence-Backed Signal Markers */}
                {mapMarkers.map((marker) => (
                  <Marker
                    key={marker.id}
                    longitude={marker.position.lng}
                    latitude={marker.position.lat}
                    anchor="bottom"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedSignal(marker.signal);
                    }}
                  >
                    <div className="relative flex flex-col items-center cursor-pointer group">
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 shadow-lg transition-transform group-hover:scale-125"
                        style={{
                          backgroundColor: marker.color,
                          borderColor: marker.isAnomaly ? '#FFFFFF' : 'rgba(0,0,0,0.7)',
                        }}
                      />
                      <div className="mt-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-black/80 text-white border whitespace-nowrap" style={{ borderColor: `${marker.color}66` }}>
                        {marker.signal.kind === 'CELLULAR' ? `CID ${marker.signal.cellId || 'CELL'}` : marker.signal.kind}
                      </div>
                    </div>
                  </Marker>
                ))}

                {/* Selected Contact Popup */}
                {selectedSignal && selectedSignal.latitude && selectedSignal.longitude && (
                  <Popup
                    longitude={selectedSignal.longitude}
                    latitude={selectedSignal.latitude}
                    anchor="top"
                    onClose={() => setSelectedSignal(null)}
                    closeOnClick={false}
                    className="tactical-popup"
                  >
                    <div className="p-2 text-xs font-mono text-black space-y-1">
                      <div className="font-bold flex items-center justify-between gap-2 border-b pb-1">
                        <span className="truncate">{selectedSignal.label}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-200">
                          {selectedSignal.kind}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-700">
                        <div>Tech: {selectedSignal.technology}</div>
                        <div>Source: {selectedSignal.locationSource || 'Evidence Pipeline'}</div>
                        <div>Confidence: {selectedSignal.locationConfidence || 'KNOWN_LOCATION'}</div>
                        <div>Signal: {selectedSignal.rssiDbm ? `${selectedSignal.rssiDbm} dBm` : 'N/A'}</div>
                      </div>
                    </div>
                  </Popup>
                )}

                {/* Waypoint Marker for Search Result */}
                {selectedWaypoint && (
                  <Marker longitude={selectedWaypoint.longitude} latitude={selectedWaypoint.latitude} anchor="bottom">
                    <div className="relative flex flex-col items-center cursor-pointer group" title={`Tactical Target: ${selectedWaypoint.formattedAddress}`}>
                      <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg bg-amber-400 animate-bounce" />
                      <div className="mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/90 text-amber-200 border border-amber-500/50 whitespace-nowrap">
                        TARGET WAYPOINT
                      </div>
                    </div>
                  </Marker>
                )}
              </Map>
            )}

            {/* Tactical Map Floating Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 bg-black/60 p-1 rounded-xl border backdrop-blur-md" style={{ borderColor: `${skin.borderColor}66` }}>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Reset View to Current Center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRequestLocation}
                disabled={isLocating}
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: location.hasFix ? skin.primaryColor : '#ffffff' }}
                title={location.hasFix ? 'GPS Active' : 'Request GPS Permission'}
              >
                <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Tactical Address Search Overlay (Geoapify + OSM) */}
            <div className="absolute top-3 left-3 z-10 w-[260px] sm:w-[310px]">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center bg-black/90 border rounded-xl backdrop-blur-md px-2.5 py-1.5 shadow-lg"
                style={{ borderColor: `${skin.borderColor}88` }}
              >
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: skin.primaryColor }} />
                ) : (
                  <Search className="w-3.5 h-3.5 shrink-0" style={{ color: skin.textMutedColor }} />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleSearchSubmit}
                  placeholder="Pretraži adresu ili grad (Geoapify)..."
                  className="w-full bg-transparent border-none text-[11px] font-mono text-white placeholder:text-neutral-500 focus:outline-none ml-2"
                />
                {(searchQuery || selectedWaypoint) && (
                  <button
                    type="button"
                    onClick={handleClearWaypoint}
                    className="p-0.5 rounded-full hover:bg-white/20 text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1 shrink-0"
                    title="Očisti pretragu"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </form>

              {/* Autocomplete Dropdown with Skeleton / Result list */}
              {isSearchOpen && (
                <div
                  className="mt-1.5 bg-black/95 border rounded-xl backdrop-blur-md overflow-hidden shadow-2xl z-20 max-h-60 overflow-y-auto"
                  style={{ borderColor: `${skin.borderColor}99` }}
                >
                  {isSearching ? (
                    <LocationSearchSkeleton
                      skin={skin}
                      count={3}
                      query={searchQuery.trim()}
                    />
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                      <button
                        key={`${result.latitude}-${result.longitude}-${idx}`}
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full text-left px-3 py-2 text-xs border-b last:border-b-0 hover:bg-white/10 transition-colors flex flex-col gap-0.5 cursor-pointer"
                        style={{ borderColor: `${skin.borderColor}33` }}
                      >
                        <div className="font-mono text-[11px] font-bold text-white truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" style={{ color: skin.primaryColor }} />
                          <span className="truncate">{result.formattedAddress}</span>
                        </div>
                        <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-2">
                          {result.city && <span>{result.city}</span>}
                          {result.country && <span>{result.country}</span>}
                          <span className="text-neutral-500">
                            [{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}]
                          </span>
                        </div>
                      </button>
                    ))
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="p-3">
                      {searchErrorDetail?.code === 'NETWORK_ERROR' ? (
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-rose-950/40 border border-rose-800/50">
                          <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[10px] font-bold">
                            <WifiOff className="w-3.5 h-3.5 shrink-0" />
                            <span>MREŽNA GREŠKA (OFFLINE)</span>
                          </div>
                          <p className="text-[10px] font-mono text-neutral-300 leading-snug">
                            {searchErrorDetail.userFriendlyMessage}
                          </p>
                          {searchErrorDetail.suggestion && (
                            <span className="text-[9px] font-mono text-rose-300/80 mt-0.5">
                              💡 {searchErrorDetail.suggestion}
                            </span>
                          )}
                        </div>
                      ) : searchErrorDetail?.code === 'RATE_LIMIT_EXCEEDED' ? (
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50">
                          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] font-bold">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>OGRANIČENJE KVOTE UPITA (HTTP 429)</span>
                          </div>
                          <p className="text-[10px] font-mono text-neutral-300 leading-snug">
                            {searchErrorDetail.userFriendlyMessage}
                          </p>
                          {searchErrorDetail.suggestion && (
                            <span className="text-[9px] font-mono text-amber-300/80 mt-0.5">
                              💡 {searchErrorDetail.suggestion}
                            </span>
                          )}
                        </div>
                      ) : searchErrorDetail?.code === 'EMPTY_RESULTS' ? (
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40">
                          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] font-bold">
                            <SearchX className="w-3.5 h-3.5 shrink-0" />
                            <span>NEMA PRONAĐENIH REZULTATA</span>
                          </div>
                          <p className="text-[10px] font-mono text-neutral-300 leading-snug">
                            Niti jedna lokacija ne odgovara upitu "{searchQuery.trim()}".
                          </p>
                          <span className="text-[9px] font-mono text-cyan-300/70 mt-0.5">
                            💡 {searchErrorDetail.suggestion || 'Pokušajte unijeti naziv grada, poštanski broj ili točniji naziv ulice.'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center">
                          <p className="text-[10px] font-mono text-neutral-300">
                            {searchError || 'Nema pronađenih lokacija za zadani unos.'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Floating Tactical Search HUD Indicator */}
            {isSearching && (
              <div
                className="absolute top-14 left-3 sm:left-3 z-10 hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-md shadow-xl pointer-events-none transition-all"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.90)',
                  borderColor: `${skin.primaryColor}88`,
                }}
              >
                <Radar
                  className="w-3.5 h-3.5 animate-spin"
                  style={{ color: skin.primaryColor, animationDuration: '2.5s' }}
                />
                <div className="flex flex-col text-[10px] font-mono leading-tight">
                  <span className="font-bold tracking-wider" style={{ color: skin.primaryColor }}>
                    LOKACIJSKO SKENIRANJE...
                  </span>
                  <span className="text-[8px] text-neutral-400">
                    Upit u Geoapify & OSM katastar
                  </span>
                </div>
              </div>
            )}

            {/* Geolocation Status Notice (if not granted or unsupported) */}
            {!location.hasFix && (
              <div className="absolute bottom-3 left-3 right-3 z-10 p-2 rounded-xl bg-black/85 border backdrop-blur-md flex items-center justify-between gap-2 text-xs" style={{ borderColor: `${skin.borderColor}66` }}>
                <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: skin.textMutedColor }}>
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>GPS status: {location.permissionState} (Nema aktivnog GPS signala)</span>
                </div>
                <button
                  onClick={handleRequestLocation}
                  disabled={isLocating}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer hover:bg-white/10"
                  style={{ borderColor: skin.primaryColor, color: skin.primaryColor }}
                >
                  {isLocating ? 'Dohvaćanje...' : 'Aktiviraj GPS'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Attribution */}
      <div className="mt-2.5 pt-2 border-t flex flex-col sm:flex-row items-center justify-between text-[10px] gap-2" style={{ borderColor: `${skin.borderColor}44`, color: skin.textMutedColor }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {location.coordinateLabel}
          </span>
          {resolvedAddress && (
            <span className="font-mono px-1.5 py-0.5 rounded border truncate max-w-[200px] sm:max-w-[280px]" style={{ borderColor: skin.borderColor, backgroundColor: skin.surfaceColor, color: skin.textPrimaryColor }} title={resolvedAddress}>
              {resolvedAddress}
            </span>
          )}
          <span className="font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: skin.borderColor, backgroundColor: skin.surfaceColor }}>
            Kontakti: {mapMarkers.length} Mapirano / {signals.length} Aktivno
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[9px]">
            Provider: {viewMode === 'LEAFLET_OSM' ? 'Geoapify + OpenStreetMap (Leaflet)' : 'OpenFreeMap / OSM'}
          </span>
          <a
            href="https://www.geoapify.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:underline font-mono"
            style={{ color: skin.accentSecondary }}
          >
            <span>Geoapify</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {osmMapUrl && (
            <a
              href={osmMapUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:underline font-mono"
              style={{ color: skin.accentSecondary }}
            >
              <span>OSM</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

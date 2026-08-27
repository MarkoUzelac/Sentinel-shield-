import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DeviceLocationState, SignalRadarItem, AppSkinConfig } from '../types';
import { Crosshair, MapPin, ExternalLink, Map as MapIcon, Radar } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface Props {
  location: DeviceLocationState;
  signals: SignalRadarItem[];
  skin: AppSkinConfig;
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const TacticalRadarMap: React.FC<Props> = ({ location, signals, skin }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'RADAR' | 'MAP'>('RADAR');

  const defaultCenter = { 
    lat: location.latitude || 37.7749, 
    lng: location.longitude || -122.4194 
  };

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

      // Draw Signal blips
      signals.slice(0, 15).forEach((sig, index) => {
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

  // Generate tactical map pins using trigonometry if true lat/lng are missing
  const mapMarkers = useMemo(() => {
    return signals.slice(0, 15).map((sig, index) => {
      let lat = sig.latitude;
      let lng = sig.longitude;

      if (!lat || !lng) {
        // Synthesize a location based on trigonometric offset from the current fix
        const distKm = (sig.estimatedDistanceMeters || 50) / 1000;
        const bearing = (sig.bearingDegrees || (index * 36)) * (Math.PI / 180); // Rads
        const R = 6371; // Earth radius in km

        const lat1 = defaultCenter.lat * (Math.PI / 180);
        const lng1 = defaultCenter.lng * (Math.PI / 180);

        const lat2 = Math.asin(
          Math.sin(lat1) * Math.cos(distKm / R) +
          Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(bearing)
        );

        const lng2 =
          lng1 +
          Math.atan2(
            Math.sin(bearing) * Math.sin(distKm / R) * Math.cos(lat1),
            Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2)
          );

        lat = lat2 * (180 / Math.PI);
        lng = lng2 * (180 / Math.PI);
      }

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
        position: { lat, lng },
        title: sig.label,
        color,
        isAnomaly
      };
    });
  }, [signals, defaultCenter.lat, defaultCenter.lng, skin]);

  const mapsUrl = location.latitude && location.longitude
    ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
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
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {viewMode === 'RADAR' ? (
            <Crosshair className="w-4 h-4 animate-spin" style={{ color: skin.primaryColor, animationDuration: '8s' }} />
          ) : (
            <MapIcon className="w-4 h-4" style={{ color: skin.primaryColor }} />
          )}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
            {viewMode === 'RADAR' ? 'TACTICAL RF & IMSI SWEEP' : 'LIVE GEO-TELEMETRY MAP'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('RADAR')}
            className="p-1 rounded transition-colors"
            style={{ 
              backgroundColor: viewMode === 'RADAR' ? `${skin.primaryColor}33` : 'transparent',
              color: viewMode === 'RADAR' ? skin.primaryColor : skin.textMutedColor 
            }}
          >
            <Radar className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('MAP')}
            className="p-1 rounded transition-colors"
            style={{ 
              backgroundColor: viewMode === 'MAP' ? `${skin.primaryColor}33` : 'transparent',
              color: viewMode === 'MAP' ? skin.primaryColor : skin.textMutedColor 
            }}
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-[300px] flex items-center justify-center rounded-xl overflow-hidden border" style={{ borderColor: `${skin.borderColor}44` }}>
        {viewMode === 'RADAR' ? (
          <canvas ref={canvasRef} className="w-full h-full block" />
        ) : MAPS_API_KEY ? (
          <APIProvider apiKey={MAPS_API_KEY}>
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={defaultCenter}
              defaultZoom={15}
              gestureHandling="greedy"
              disableDefaultUI={true}
              style={{ width: '100%', height: '100%' }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              {/* User Location Marker */}
              <AdvancedMarker position={defaultCenter} title="Your Device">
                <div className="relative flex items-center justify-center w-8 h-8">
                  <div className="absolute w-full h-full rounded-full animate-ping opacity-20" style={{ backgroundColor: skin.primaryColor }} />
                  <div className="absolute w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: skin.primaryColor }} />
                </div>
              </AdvancedMarker>

              {/* Signal Intercept Markers */}
              {mapMarkers.map(marker => (
                <AdvancedMarker key={marker.id} position={marker.position} title={marker.title}>
                  <Pin
                    background={marker.color}
                    borderColor={marker.isAnomaly ? '#FFFFFF' : marker.color}
                    glyphColor={marker.isAnomaly ? '#FFFFFF' : '#000000'}
                  />
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        ) : (
          <div className="text-center p-4">
            <MapIcon className="w-8 h-8 mx-auto mb-2 opacity-50" style={{ color: skin.textMutedColor }} />
            <p className="text-xs" style={{ color: skin.textMutedColor }}>
              Google Maps API Key required.<br/>
              Please add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env</code>
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: `${skin.borderColor}44`, color: skin.textMutedColor }}>
        <span className="font-mono flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {location.coordinateLabel}
        </span>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:underline"
            style={{ color: skin.accentSecondary }}
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
};

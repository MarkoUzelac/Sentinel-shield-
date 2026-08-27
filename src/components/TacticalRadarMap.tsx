import React, { useEffect, useRef } from 'react';
import { DeviceLocationState, SignalRadarItem, AppSkinConfig } from '../types';
import { Crosshair, MapPin, ExternalLink } from 'lucide-react';

interface Props {
  location: DeviceLocationState;
  signals: SignalRadarItem[];
  skin: AppSkinConfig;
}

export const TacticalRadarMap: React.FC<Props> = ({ location, signals, skin }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
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
  }, [location, signals, skin]);

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
          <Crosshair className="w-4 h-4 animate-spin" style={{ color: skin.primaryColor, animationDuration: '8s' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
            TACTICAL RF & IMSI SWEEP
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: location.hasFix ? skin.primaryColor : skin.textMutedColor }}>
          <MapPin className="w-3 h-3" />
          <span>{location.coordinateLabel}</span>
        </div>
      </div>

      <div className="relative w-full h-[300px] flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className="mt-2 pt-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: `${skin.borderColor}44`, color: skin.textMutedColor }}>
        <span className="font-mono">
          RUNTIME SIGNALS: <strong style={{ color: skin.textPrimaryColor }}>{signals.length} active</strong>
        </span>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:underline"
            style={{ color: skin.accentSecondary }}
          >
            <span>Google Maps</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
};

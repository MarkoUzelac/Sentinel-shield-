import React from 'react';
import { Radar, Loader2, Sparkles, MapPin } from 'lucide-react';
import { AppSkinConfig } from '../types';

interface LocationSearchSkeletonProps {
  skin: AppSkinConfig;
  count?: number;
  query?: string;
}

export const LocationSearchSkeleton: React.FC<LocationSearchSkeletonProps> = ({
  skin,
  count = 3,
  query,
}) => {
  return (
    <div className="w-full font-mono">
      {/* Header status bar */}
      <div
        className="px-3 py-2 border-b flex items-center justify-between gap-2 bg-black/60 backdrop-blur-md"
        style={{ borderColor: `${skin.borderColor}44` }}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          <Loader2
            className="w-3.5 h-3.5 animate-spin"
            style={{ color: skin.primaryColor }}
          />
          <span style={{ color: skin.primaryColor }}>
            GEO-LOOKUP SCANNING...
          </span>
        </div>
        {query && (
          <span
            className="text-[9px] truncate max-w-[120px] text-neutral-400 opacity-80"
            title={query}
          >
            "{query}"
          </span>
        )}
      </div>

      {/* Skeleton Rows with Shimmering Pulse */}
      <div className="divide-y divide-neutral-800/40">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="p-2.5 flex flex-col gap-1.5 animate-pulse transition-opacity"
            style={{
              animationDelay: `${index * 120}ms`,
              animationDuration: '1.2s',
            }}
          >
            {/* Top row: Icon + Address Title Skeleton */}
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full shrink-0 opacity-40"
                style={{ backgroundColor: skin.primaryColor }}
              />
              <div
                className="h-3 rounded w-3/5"
                style={{
                  backgroundColor: `${skin.textPrimaryColor}18`,
                  width: index === 0 ? '75%' : index === 1 ? '60%' : '80%',
                }}
              />
            </div>

            {/* Middle row: City & Country Tag Skeleton */}
            <div className="flex items-center gap-2 pl-5.5">
              <div
                className="h-2 rounded w-1/3"
                style={{ backgroundColor: `${skin.textMutedColor}15` }}
              />
              <div
                className="h-2 rounded w-1/4"
                style={{ backgroundColor: `${skin.textMutedColor}10` }}
              />
            </div>

            {/* Bottom row: Coordinates tag placeholder */}
            <div className="flex items-center gap-1.5 pl-5.5 mt-0.5">
              <div
                className="h-2 rounded w-20"
                style={{
                  backgroundColor: `${skin.primaryColor}12`,
                  border: `1px solid ${skin.primaryColor}22`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer scanning notice */}
      <div
        className="px-3 py-1.5 bg-black/40 border-t flex items-center justify-between text-[9px]"
        style={{ borderColor: `${skin.borderColor}33`, color: skin.textMutedColor }}
      >
        <span className="flex items-center gap-1">
          <Radar className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '4s' }} />
          Geoapify & OSM Registry Query
        </span>
        <span className="text-[8px] opacity-60">SENTINEL-GEO-ENGINE</span>
      </div>
    </div>
  );
};

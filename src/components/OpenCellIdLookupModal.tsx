import React, { useState } from 'react';
import { AppSkinConfig, CellEvidenceItem, SignalRadarItem } from '../types';
import { CellProviderManager } from '../services/cellProvider';
import { Radio, Search, Database, CheckCircle2, AlertCircle, Loader2, X, Plus, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddSignalToRadar?: (signal: SignalRadarItem) => void;
  skin: AppSkinConfig;
}

export const OpenCellIdLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddSignalToRadar,
  skin,
}) => {
  const [mcc, setMcc] = useState('219');
  const [mnc, setMnc] = useState('1');
  const [lac, setLac] = useState('1205');
  const [cid, setCid] = useState('49102');
  const [radio, setRadio] = useState<'GSM' | 'UMTS' | 'LTE' | 'NR'>('LTE');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CellEvidenceItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    setAdded(false);

    const mccNum = parseInt(mcc, 10);
    const mncNum = parseInt(mnc, 10);
    const lacNum = parseInt(lac, 10);
    const cidNum = parseInt(cid, 10);

    if (isNaN(mccNum) || isNaN(cidNum)) {
      setError('Please provide valid MCC and Cell ID numbers.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await CellProviderManager.lookupOpenCellId(mccNum, mncNum, lacNum, cidNum, radio);
      if (res) {
        setResult(res);
      } else {
        setError('Cell ID not found in OpenCellID database or lookup service is currently unavailable.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with OpenCellID backend proxy.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToRadar = () => {
    if (!result || !onAddSignalToRadar) return;

    const radarItem: SignalRadarItem = {
      id: result.id,
      kind: 'CELLULAR',
      label: `OpenCellID Tower (${radio} CID ${result.cid})`,
      technology: `${radio} Base Station (OpenCellID Registry)`,
      rssiDbm: -80,
      estimatedDistanceMeters: result.rangeMeters || 500,
      cellId: result.cid,
      areaCode: result.lacOrTac,
      signalLevel: 3,
      latitude: result.latitude,
      longitude: result.longitude,
      bearingDegrees: 45,
      locationSource: 'OpenCellID BACKUP Registry',
      sourceType: 'OPENCELLID_BACKUP',
      locationAccuracyMeters: result.accuracy || 500,
      locationConfidence: 'ESTIMATED_ZONE',
      locationEvidenceType: 'NETWORK_PROVIDED_COORDINATES',
      freshness: 'ACTIVE_UNVERIFIED',
      verificationStatus: 'NETWORK_PROVIDED',
      classification: 'NEIGHBOR_CELL',
      isTestEvidence: false,
      isSynthetic: false,
      isLive: false,
      mcc: result.mcc,
      mnc: result.mnc,
      risk: 'INFO',
      explanation: 'Tower position coordinates enriched via OpenCellID crowd-sourced database.',
      observedAtEpochMs: Date.now(),
      runtimeBacked: false,
      firstObservedAtEpochMs: Date.now(),
      observationCount: 1,
      persistenceSeconds: 60,
      anomalyScore: 0,
      locationConsistency: 'CONSISTENT',
    };

    onAddSignalToRadar(radarItem);
    setAdded(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative"
        style={{
          backgroundColor: skin.cardColor,
          borderColor: skin.borderColor,
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: `${skin.primaryColor}18`,
              border: `1px solid ${skin.primaryColor}40`,
            }}
          >
            <Database className="w-5 h-5" style={{ color: skin.primaryColor }} />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <span>OPENCELLID TOWER LOOKUP</span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BACKUP / API
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Query the public OpenCellID registry for terrestrial tower coordinates.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                Radio RAT
              </label>
              <select
                value={radio}
                onChange={(e) => setRadio(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="LTE">LTE (4G)</option>
                <option value="NR">NR (5G)</option>
                <option value="UMTS">UMTS (3G)</option>
                <option value="GSM">GSM (2G)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                MCC (Country)
              </label>
              <input
                type="number"
                value={mcc}
                onChange={(e) => setMcc(e.target.value)}
                placeholder="219"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                MNC (Network)
              </label>
              <input
                type="number"
                value={mnc}
                onChange={(e) => setMnc(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                TAC / LAC (Area)
              </label>
              <input
                type="number"
                value={lac}
                onChange={(e) => setLac(e.target.value)}
                placeholder="1205"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                Cell ID (CID / ECI)
              </label>
              <input
                type="number"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                placeholder="49102"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            style={{
              backgroundColor: skin.primaryColor,
              color: '#000000',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Querying OpenCellID Proxy...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search OpenCellID Registry</span>
              </>
            )}
          </button>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <div className="font-bold">Lookup Unsuccessful</div>
              <p className="text-[11px] text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {/* Successful Result Display */}
        {result && (
          <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white">Tower Registry Match Found</span>
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SOURCE: OpenCellID BACKUP
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-neutral-900/60 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Coordinates:</span>
                <span className="text-white font-bold">{result.latitude?.toFixed(5)}, {result.longitude?.toFixed(5)}</span>
              </div>
              <div className="p-2 rounded bg-neutral-900/60 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Estimated Coverage:</span>
                <span className="text-cyan-300 font-bold">~{result.rangeMeters || 500} meters</span>
              </div>
              <div className="p-2 rounded bg-neutral-900/60 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Identifiers:</span>
                <span className="text-neutral-300">{result.networkType} MCC {result.mcc} / CID {result.cid}</span>
              </div>
              <div className="p-2 rounded bg-neutral-900/60 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Evidence Integrity:</span>
                <span className="text-emerald-400 font-bold">Non-synthetic (API)</span>
              </div>
            </div>

            {onAddSignalToRadar && (
              <button
                type="button"
                onClick={handleAddToRadar}
                disabled={added}
                className={`w-full py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  added
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                }`}
              >
                {added ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Plotted on Tactical Radar</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Plot Tower Observation on Tactical Radar</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Truthful Telemetry Disclaimer */}
        <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[10px] font-mono text-neutral-400">
          <span className="text-cyan-400 font-bold">Truthful Telemetry Standard:</span> OpenCellID records represent public crowd-sourced cell tower registries. They do not constitute live baseband measurements from your hardware modem.
        </div>
      </div>
    </div>
  );
};

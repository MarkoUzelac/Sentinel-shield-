import React from 'react';
import { JURISDICTIONS } from '../data/jurisdictions';
import { AppSkinConfig } from '../types';
import { Gavel, ExternalLink, ShieldCheck, Scale, AlertCircle } from 'lucide-react';

interface Props {
  skin: AppSkinConfig;
}

export const LegalView: React.FC<Props> = ({ skin }) => {
  const sources = [
    { title: 'Ustav RH — čl. 35–37 (Privatnost i tajnost dopisivanja)', url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/1998_01_8_121.html' },
    { title: 'GDPR — Uredba (EU) 2016/679 (Zaštita osobnih podataka)', url: 'https://eur-lex.europa.eu/legal-content/HR/ALL/?uri=celex%3A32016R0679' },
    { title: 'Zakon o kaznenom postupku — čl. 332 (Posebne dokazne radnje)', url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2011_10_121_2386.html' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
          JURISDICTION & CONSTITUTIONAL RIGHTS
        </span>
        <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
          Who Has the Right to Track You?
        </h2>
        <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
          Handbook on lawful intercept limits, intelligence alliance treaties (5-Eyes, 14-Eyes), and EU constitutional privacy standards.
        </p>
      </div>

      {/* Main Constitutional Statement Card */}
      <div
        className="p-5 rounded-3xl border space-y-3"
        style={{
          backgroundColor: skin.cardColor,
          borderColor: skin.primaryColor,
        }}
      >
        <div className="flex items-center gap-2.5">
          <Gavel className="w-5 h-5" style={{ color: skin.primaryColor }} />
          <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
            Privatnost i tajnost komunikacija (Ustavno načelo)
          </h3>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: skin.textSecondaryColor }}>
          Ustav Republike Hrvatske jamči nepovredivost osobnog i obiteljskog života, dostojanstva, ugleda i časti te tajnost dopisivanja i svih drugih oblika općenja. Ograničenja se mogu propisati isključivo zakonom ako je to nužno radi zaštite sigurnosti države ili vođenja kaznenog postupka. Posebne dokazne radnje nadzora komunikacija provode se isključivo pod zakonskim uvjetima i uz obrazloženi pisani nalog nadležnog suca istrage.
        </p>
      </div>

      {/* Official Legal Sources */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
          SLUŽBENI PRAVNI IZVORI
        </h3>
        {sources.map((s, idx) => (
          <a
            key={idx}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01] cursor-pointer block"
            style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Scale className="w-4 h-4 shrink-0" style={{ color: skin.primaryColor }} />
              <span className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>
                {s.title}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 shrink-0" style={{ color: skin.primaryColor }} />
          </a>
        ))}
      </div>

      {/* Global Privacy Jurisdictions Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
          GLOBAL PRIVACY JURISDICTIONS COMPARISON
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {JURISDICTIONS.map((jur) => (
            <div
              key={jur.code}
              className="p-4 rounded-2xl border space-y-2"
              style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{jur.flag}</span>
                  <span className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                    {jur.country}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs font-bold" style={{ color: jur.privacyScore >= 80 ? skin.primaryColor : '#FFB300' }}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{jur.privacyScore}/100</span>
                </div>
              </div>

              <div className="text-[10px] font-mono font-bold" style={{ color: jur.tier === 'Privacy Haven' ? skin.primaryColor : skin.textMutedColor }}>
                Tier: {jur.tier}
              </div>

              <p className="text-[11px] leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                <strong>Wiretap Rules:</strong> {jur.wiretapRestrictions}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                <strong>Data Retention:</strong> {jur.dataRetentionMandate}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer & Copyright */}
      <div className="space-y-4">
        <div className="p-3 rounded-xl border flex items-start gap-3" style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', borderColor: 'rgba(255, 179, 0, 0.3)', color: '#FFB300' }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <strong className="block uppercase tracking-widest font-mono text-xs mb-2">Anti-Spying & Illegal Tracking Warning</strong>
            <p>Unauthorized network tracking, interception, and spying on personal devices violate fundamental privacy rights (GDPR, Constitutional Privacy). Sentinel Shield Pro is engineered to actively hunt, expose, and block illicit intruders, IMSI-catchers, and rogue network probes.</p>
            <p>We believe in absolute network sovereignty. Malicious actors caught attempting to exploit or monitor this network will have their telemetry logged, intercepted, and isolated.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border text-center space-y-2" style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}>
          <div className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
            © {new Date().getFullYear()} Marko Uzelac. All Rights Reserved.
          </div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: skin.textMutedColor }}>
            Premium Network Security & Tracking Audit License
          </p>
          <a href="mailto:support@markouzelacuzy.com" className="inline-block mt-2 text-xs font-bold hover:underline transition-colors" style={{ color: skin.primaryColor }}>
            support@markouzelacuzy.com
          </a>
        </div>
      </div>
    </div>
  );
};

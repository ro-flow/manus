import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Aanvraag {
  id: string;
  gemeente: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  status: string;
  createdAt: string;
}

interface StukResultaat {
  type: string;
  naam: string;
  grondslag: string;
  aanwezig: boolean;
  vereistType: 'altijd' | 'conditional' | 'aanbevolen';
}

interface PerceelResultaat {
  perceelId: string;
  kadastraleAanduiding: string;
  activiteiten: string[];
  stukken: StukResultaat[];
  volledig: boolean;
  aantalVerplichtOntbrekend: number;
  aantalAanbevolenOntbrekend: number;
}

interface VolledigheidsResultaat {
  volledig: boolean;
  aantalPercelen: number;
  aantalPerceelenVolledig: number;
  aantalPerceelenOnvolledig: number;
  aantalVerplichtOntbrekendTotaal: number;
  percelen: PerceelResultaat[];
  samenvatting: string;
}

interface ProcedureResultaat {
  procedure: 'regulier' | 'uitgebreid' | 'vergunningvrij' | 'meldingsplichtig';
  doorlooptijd: string;
  toelichting: string;
}

interface BriefTermijnen {
  ontvangstdatum: string;
  beslistermijnDatum: string;
  aanvuldeadlineDatum: string | null;
}

interface OntvangstbevestigingResultaat {
  brief: string;
  procedure: ProcedureResultaat;
  termijnen: BriefTermijnen;
  variant: 'A' | 'B' | 'C' | 'D' | 'E';
}

type AanvraagType = 'formeel' | 'concept';

interface BehandelrapportBestemmingsplanToets {
  kadastraleAanduiding: string;
  bestemmingsplan: { naam: string; imroCode: string; vastgesteld: string } | null;
  enkelbestemming: string[];
  dubbelbestemming: string[];
  gebiedsaanduidingen: string[];
  afwijkingGesignaleerd: boolean;
  afwijkingToelichting?: string;
  pdokBereikbaar: boolean;
  fout?: string;
}

interface BehandelrapportActiviteit {
  kadastraleAanduiding: string;
  activiteiten: string[];
  ingediendeDocs: string[];
  bouwjaar?: string;
}

interface BehandelrapportBron {
  naam: string;
  url?: string;
  geraadpleegd: string;
}

interface BehandelrapportData {
  intern: boolean;
  gegenereerd: string;
  aanvraag: {
    id: string;
    gemeente: string;
    activiteitType?: string;
    activiteitOmschrijving?: string;
    aanvraagnummer?: string;
    aanvraagdatum?: string;
    status: string;
  };
  procedure: ProcedureResultaat & { termijnen?: BriefTermijnen };
  volledigheid: {
    volledig: boolean;
    aantalVerplichtOntbrekend: number;
    percelen: PerceelResultaat[];
    samenvatting: string;
  };
  activiteitenSamenvatting: BehandelrapportActiviteit[];
  bestemmingsplanToets: BehandelrapportBestemmingsplanToets[] | null;
  isBopa: boolean;
  aandachtspunten: string[];
  bronnen: BehandelrapportBron[];
  voorbehoud: string;
}

const PROCEDURE_LABELS: Record<string, { label: string; color: string }> = {
  regulier: { label: 'Reguliere procedure', color: 'text-blue-300 bg-blue-900/30 border-blue-700/50' },
  uitgebreid: { label: 'Uitgebreide procedure', color: 'text-orange-300 bg-orange-900/30 border-orange-700/50' },
  vergunningvrij: { label: 'Vergunningvrij', color: 'text-green-light bg-green/20 border-green/40' },
  meldingsplichtig: { label: 'Meldingsplichtig', color: 'text-yellow-300 bg-yellow-900/30 border-yellow-700/50' },
};

const VARIANT_LABELS: Record<string, { label: string; color: string }> = {
  A: { label: 'Variant A — volledig, regulier', color: 'text-green-light bg-green/10 border-green/30' },
  B: { label: 'Variant B — volledig, uitgebreid', color: 'text-blue-300 bg-blue-900/20 border-blue-700/40' },
  C: { label: 'Variant C — onvolledig, regulier', color: 'text-orange bg-orange/10 border-orange/30' },
  D: { label: 'Variant D — onvolledig, uitgebreid', color: 'text-orange-300 bg-orange-900/20 border-orange-700/40' },
  E: { label: 'Variant E — conceptaanvraag', color: 'text-purple-300 bg-purple-900/20 border-purple-700/40' },
};

function SectionLoader({ label }: { label: string }) {
  return (
    <div className="card flex items-center gap-4">
      <svg className="w-5 h-5 animate-spin text-orange flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-text-muted text-sm">{label}</span>
    </div>
  );
}

export function AanvraagResultaat() {
  const { id } = useParams<{ id: string }>();

  const [aanvraag, setAanvraag] = useState<Aanvraag | null>(null);
  const [volledigheid, setVolledigheid] = useState<VolledigheidsResultaat | null>(null);
  const [bevestiging, setBevestiging] = useState<OntvangstbevestigingResultaat | null>(null);
  const [aanvraagType, setAanvraagType] = useState<AanvraagType>('formeel');

  const [loadingAanvraag, setLoadingAanvraag] = useState(true);
  const [loadingVolledigheid, setLoadingVolledigheid] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);

  const [errorAanvraag, setErrorAanvraag] = useState('');
  const [errorVolledigheid, setErrorVolledigheid] = useState('');
  const [errorBrief, setErrorBrief] = useState('');

  const [briefKopied, setBriefKopied] = useState(false);

  const [showRapport, setShowRapport] = useState(false);
  const [rapport, setRapport] = useState<BehandelrapportData | null>(null);
  const [loadingRapport, setLoadingRapport] = useState(false);
  const [errorRapport, setErrorRapport] = useState('');
  const [expandedBpPercelen, setExpandedBpPercelen] = useState<Set<number>>(new Set([0]));
  const [expandedActPercelen, setExpandedActPercelen] = useState<Set<number>>(new Set([0]));

  function toggleBpPerceel(i: number) {
    setExpandedBpPercelen(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }
  function toggleActPerceel(i: number) {
    setExpandedActPercelen(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const fetchBrief = useCallback(async (type: AanvraagType) => {
    if (!id) return;
    setLoadingBrief(true);
    setErrorBrief('');
    setBevestiging(null);
    try {
      const res = await fetch(`/api/aanvragen/${id}/ontvangstbevestiging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aanvraagType: type }),
      });
      if (!res.ok) throw new Error();
      setBevestiging(await res.json() as OntvangstbevestigingResultaat);
    } catch {
      setErrorBrief('Conceptbrief genereren mislukt.');
    } finally {
      setLoadingBrief(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    async function laden() {
      try {
        const res = await fetch(`/api/aanvragen/${id}`);
        if (!res.ok) throw new Error('Aanvraag niet gevonden');
        setAanvraag(await res.json() as Aanvraag);
      } catch {
        setErrorAanvraag('Aanvraag kon niet worden geladen.');
        return;
      } finally {
        setLoadingAanvraag(false);
      }

      setLoadingVolledigheid(true);
      try {
        const res = await fetch(`/api/aanvragen/${id}/volledigheidscheck`, { method: 'POST' });
        if (!res.ok) throw new Error();
        setVolledigheid(await res.json() as VolledigheidsResultaat);
      } catch {
        setErrorVolledigheid('Volledigheidscheck mislukt.');
      } finally {
        setLoadingVolledigheid(false);
      }

      await fetchBrief('formeel');
    }

    laden();
  }, [id, fetchBrief]);

  async function handleAanvraagTypeChange(type: AanvraagType) {
    setAanvraagType(type);
    await fetchBrief(type);
  }

  async function openBehandelrapport() {
    setShowRapport(true);
    if (rapport) return;
    setLoadingRapport(true);
    setErrorRapport('');
    try {
      const res = await fetch(`/api/aanvragen/${id}/behandelrapport`);
      if (!res.ok) throw new Error();
      setRapport(await res.json() as BehandelrapportData);
    } catch {
      setErrorRapport('Behandelrapport kon niet worden geladen.');
    } finally {
      setLoadingRapport(false);
    }
  }

  async function kopieerBrief() {
    if (!bevestiging) return;
    await navigator.clipboard.writeText(bevestiging.brief);
    setBriefKopied(true);
    setTimeout(() => setBriefKopied(false), 2000);
  }

  if (loadingAanvraag) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 flex items-center gap-4">
        <svg className="w-6 h-6 animate-spin text-orange" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-text-muted">Aanvraag laden…</span>
      </div>
    );
  }

  if (errorAanvraag) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
          {errorAanvraag}
        </div>
        <Link to="/aanvraag" className="btn-secondary text-sm">Nieuwe aanvraag starten</Link>
      </div>
    );
  }

  const procedureVanBevestiging = bevestiging?.procedure;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/aanvraag" className="text-text-muted hover:text-white text-sm transition-colors">
              ← Nieuwe aanvraag
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold mb-1">{aanvraag?.gemeente}</h1>
          <p className="text-text-muted capitalize">
            {aanvraag?.activiteitType ?? 'Aanvraag'} · ID {id?.slice(0, 8)}…
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          {/* Aanvraagtype toggle */}
          <div className="flex rounded-lg border border-bg-light overflow-hidden text-xs font-medium">
            <button
              onClick={() => handleAanvraagTypeChange('formeel')}
              className={`px-3 py-2 transition-colors ${
                aanvraagType === 'formeel'
                  ? 'bg-orange text-white'
                  : 'text-text-muted hover:text-white hover:bg-bg-light'
              }`}
            >
              Formeel
            </button>
            <button
              onClick={() => handleAanvraagTypeChange('concept')}
              className={`px-3 py-2 transition-colors border-l border-bg-light ${
                aanvraagType === 'concept'
                  ? 'bg-orange text-white'
                  : 'text-text-muted hover:text-white hover:bg-bg-light'
              }`}
            >
              Concept
            </button>
          </div>

          <button
            onClick={openBehandelrapport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-700/50 bg-blue-900/30 text-blue-300 text-xs font-medium hover:bg-blue-900/50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Behandelrapport
          </button>

          {volledigheid && (
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 border text-sm font-semibold ${
              volledigheid.volledig
                ? 'bg-green/20 border-green/40 text-green-light'
                : 'bg-red-900/30 border-red-700/50 text-red-300'
            }`}>
              {volledigheid.volledig ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Volledig
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Onvolledig
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Volledigheidscheck */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange/15 border border-orange/40 flex items-center justify-center text-orange text-xs font-bold">1</span>
          Volledigheidscheck
        </h2>

        {loadingVolledigheid && <SectionLoader label="Ontbrekende stukken controleren…" />}

        {errorVolledigheid && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {errorVolledigheid}
          </div>
        )}

        {volledigheid && (
          <div className="card space-y-4">
            <p className="text-sm text-text-muted">{volledigheid.samenvatting}</p>

            {volledigheid.percelen.map((perceel) => {
              const ontbrekend = perceel.stukken.filter((s) => !s.aanwezig);
              const aanwezig = perceel.stukken.filter((s) => s.aanwezig);
              return (
                <div key={perceel.perceelId}>
                  {ontbrekend.length > 0 ? (
                    <ul className="space-y-2">
                      {ontbrekend.map((stuk) => (
                        <li key={stuk.type} className="flex items-start gap-3">
                          <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                            stuk.vereistType === 'altijd'
                              ? 'bg-red-900/40 border border-red-700/50'
                              : 'bg-yellow-900/30 border border-yellow-700/40'
                          }`}>
                            {stuk.vereistType === 'altijd' ? (
                              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-medium">
                              {stuk.naam}
                              {stuk.vereistType === 'aanbevolen' && (
                                <span className="ml-2 text-xs text-text-muted font-normal">(aanbevolen)</span>
                              )}
                            </p>
                            <p className="text-xs text-text-muted">{stuk.grondslag}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">Alle verwachte stukken zijn aanwezig.</p>
                    </div>
                  )}

                  {aanwezig.length > 0 && ontbrekend.length > 0 && (
                    <p className="text-xs text-text-muted mt-3">
                      Aanwezig: {aanwezig.map((s) => s.naam).join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Procedure-inschatting */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange/15 border border-orange/40 flex items-center justify-center text-orange text-xs font-bold">2</span>
          Procedure-inschatting
        </h2>

        {loadingBrief && !bevestiging && <SectionLoader label="Procedure bepalen…" />}

        {procedureVanBevestiging && (() => {
          const info = PROCEDURE_LABELS[procedureVanBevestiging.procedure] ?? PROCEDURE_LABELS['regulier'];
          const termijnen = bevestiging?.termijnen;
          return (
            <div className="card space-y-4">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border text-sm font-medium ${info.color}`}>
                {info.label}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">Doorlooptijd</p>
                  <p className="text-sm font-medium">{procedureVanBevestiging.doorlooptijd}</p>
                </div>
              </div>

              {termijnen && aanvraagType === 'formeel' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-bg-light">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Ontvangstdatum</p>
                    <p className="text-sm font-medium">{termijnen.ontvangstdatum}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Uiterste beslisdatum</p>
                    <p className="text-sm font-medium">{termijnen.beslistermijnDatum}</p>
                  </div>
                  {termijnen.aanvuldeadlineDatum && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">Aanvuldeadline</p>
                      <p className="text-sm font-medium text-orange">{termijnen.aanvuldeadlineDatum}</p>
                    </div>
                  )}
                </div>
              )}

              {aanvraagType === 'concept' && (
                <div className="pt-4 border-t border-bg-light">
                  <p className="text-xs text-text-muted italic">
                    Geen wettelijke termijnen van toepassing bij conceptaanvraag (vooroverleg/principeverzoek).
                  </p>
                </div>
              )}

              <p className="text-sm text-text-muted leading-relaxed">{procedureVanBevestiging.toelichting}</p>
            </div>
          );
        })()}
      </section>

      {/* Conceptbrief */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange/15 border border-orange/40 flex items-center justify-center text-orange text-xs font-bold">3</span>
          {aanvraagType === 'concept' ? 'Indicatief advies' : 'Conceptbrief'}
        </h2>

        {loadingBrief && <SectionLoader label="AI genereert ontvangstbevestiging…" />}

        {errorBrief && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {errorBrief}
          </div>
        )}

        {bevestiging && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  NAW ingevuld vanuit beveiligde opslag
                </p>
                {bevestiging.variant && (() => {
                  const v = VARIANT_LABELS[bevestiging.variant];
                  return v ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${v.color}`}>
                      {v.label}
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/aanvragen/${id}/brief/download?aanvraagType=${aanvraagType}`}
                  download
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
                  title="Brief downloaden als Word-document"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  .docx
                </a>
                <button
                onClick={kopieerBrief}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
              >
                {briefKopied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Gekopieerd
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Kopieer brief
                  </>
                )}
              </button>
              </div>
            </div>
            <div className="bg-bg rounded-lg p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono text-text-muted border border-bg-light">
              {bevestiging.brief}
            </div>
          </div>
        )}
      </section>

      {/* Behandelrapport modal */}
      {showRapport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl bg-[#0a1628] border border-blue-800/50 rounded-2xl shadow-2xl my-8">

            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#0a1628]/95 backdrop-blur border-b border-blue-800/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 bg-red-950/60 border border-red-700/60 text-red-300 text-xs font-bold px-2.5 py-1 rounded-md tracking-widest uppercase">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  INTERN
                </span>
                <h2 className="text-white font-bold text-sm">Behandelrapport</h2>
                {rapport && (
                  <span className="text-blue-500/60 text-xs hidden sm:block">
                    {new Date(rapport.gegenereerd).toLocaleString('nl-NL')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/aanvragen/${id}/behandelrapport/pdf`}
                  download
                  className="flex items-center gap-1.5 text-blue-400/70 hover:text-blue-200 transition-colors text-xs px-2 py-1 rounded"
                  title="PDF downloaden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">PDF</span>
                </a>
                <button
                  onClick={() => setShowRapport(false)}
                  className="text-blue-400/70 hover:text-white transition-colors p-1.5 rounded"
                  aria-label="Sluiten"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6">

              {loadingRapport && (
                <div className="flex items-center gap-3 py-10 justify-center">
                  <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-blue-300 text-sm">Behandelrapport laden…</span>
                </div>
              )}

              {errorRapport && (
                <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
                  {errorRapport}
                </div>
              )}

              {rapport && (
                <>
                  {/* Conclusiestrip — in één oogopslag */}
                  {(() => {
                    const info = PROCEDURE_LABELS[rapport.procedure.procedure] ?? PROCEDURE_LABELS['regulier'];
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-4">
                          <p className="text-blue-400/60 text-xs mb-1.5 uppercase tracking-wide">Procedure</p>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 border text-xs font-semibold ${info.color}`}>
                            {info.label}
                          </span>
                        </div>
                        <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-4">
                          <p className="text-blue-400/60 text-xs mb-1.5 uppercase tracking-wide">Doorlooptijd</p>
                          <p className="text-white text-sm font-semibold">{rapport.procedure.doorlooptijd}</p>
                        </div>
                        <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-4">
                          <p className="text-blue-400/60 text-xs mb-1.5 uppercase tracking-wide">Volledigheid</p>
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 border text-xs font-semibold ${
                            rapport.volledigheid.volledig
                              ? 'text-green-300 bg-green/10 border-green/30'
                              : 'text-red-300 bg-red-900/30 border-red-700/50'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rapport.volledigheid.volledig ? 'bg-green-400' : 'bg-red-400'}`} />
                            {rapport.volledigheid.volledig ? 'Volledig' : `${rapport.volledigheid.aantalVerplichtOntbrekend} ontbreekt`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* BOPA waarschuwing */}
                  {rapport.isBopa && (
                    <div className="flex items-start gap-3 bg-orange-900/15 border border-orange-700/40 rounded-xl px-4 py-3">
                      <svg className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-orange text-xs font-semibold mb-0.5">BOPA — Buitenplanse Omgevingsplanactiviteit</p>
                        <p className="text-orange/70 text-xs">Activiteit wijkt af van het omgevingsplan. Beoordeel of reguliere of uitgebreide procedure van toepassing is (art. 16.62 / 16.65 Omgevingswet).</p>
                      </div>
                    </div>
                  )}

                  {/* Aandachtspunten */}
                  {rapport.aandachtspunten.length > 0 && (
                    <section>
                      <h3 className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider mb-3">Aandachtspunten</h3>
                      <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl divide-y divide-blue-800/30">
                        {rapport.aandachtspunten.map((punt, i) => (
                          <div key={i} className="flex items-start gap-3 px-4 py-3">
                            <svg className="w-3.5 h-3.5 text-orange flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <p className="text-blue-100/80 text-xs leading-relaxed">{punt}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Bestemmingsplantoets */}
                  {rapport.bestemmingsplanToets && rapport.bestemmingsplanToets.length > 0 && (
                    <section>
                      <h3 className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider mb-3">Bestemmingsplantoets</h3>
                      <div className="space-y-2">
                        {rapport.bestemmingsplanToets.map((t, i) => {
                          const open = expandedBpPercelen.has(i);
                          const statusColor = !t.pdokBereikbaar
                            ? 'text-yellow-400/70 bg-yellow-900/20 border-yellow-700/30'
                            : t.afwijkingGesignaleerd
                              ? 'text-orange-300 bg-orange-900/20 border-orange-700/40'
                              : 'text-green-300/80 bg-green/10 border-green/30';
                          const statusLabel = !t.pdokBereikbaar ? 'PDOK niet bereikbaar' : t.afwijkingGesignaleerd ? 'Afwijking gesignaleerd' : 'Past binnen plan';
                          return (
                            <div key={i} className="bg-blue-950/40 border border-blue-800/40 rounded-xl overflow-hidden">
                              <button
                                onClick={() => toggleBpPerceel(i)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-900/20 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-blue-100 text-xs font-medium">{t.kadastraleAanduiding}</span>
                                  {t.bestemmingsplan && (
                                    <span className="text-blue-400/50 text-xs hidden sm:inline">{t.bestemmingsplan.naam}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs rounded-full border px-2 py-0.5 ${statusColor}`}>{statusLabel}</span>
                                  <svg className={`w-4 h-4 text-blue-400/50 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>
                              {open && (
                                <div className="border-t border-blue-800/30 px-4 py-3 space-y-2">
                                  {t.bestemmingsplan && (
                                    <p className="text-xs text-blue-400/60">vastgesteld {t.bestemmingsplan.vastgesteld} · {t.bestemmingsplan.imroCode}</p>
                                  )}
                                  {t.enkelbestemming.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                      <span className="text-blue-400/60 text-xs">Bestemming:</span>
                                      {t.enkelbestemming.map((b, j) => <span key={j} className="text-xs text-blue-200/70 bg-blue-900/30 border border-blue-700/30 rounded px-1.5 py-0.5">{b}</span>)}
                                    </div>
                                  )}
                                  {t.dubbelbestemming.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                      <span className="text-blue-400/60 text-xs">Dubbelbestemming:</span>
                                      {t.dubbelbestemming.map((b, j) => <span key={j} className="text-xs text-blue-200/70 bg-blue-900/30 border border-blue-700/30 rounded px-1.5 py-0.5">{b}</span>)}
                                    </div>
                                  )}
                                  {t.gebiedsaanduidingen.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                      <span className="text-blue-400/60 text-xs">Gebiedsaanduidingen:</span>
                                      {t.gebiedsaanduidingen.map((g, j) => <span key={j} className="text-xs text-blue-200/70 bg-blue-900/30 border border-blue-700/30 rounded px-1.5 py-0.5">{g}</span>)}
                                    </div>
                                  )}
                                  {t.afwijkingToelichting && (
                                    <p className="text-xs text-orange-200/80 italic pt-1">{t.afwijkingToelichting}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Activiteiten per perceel */}
                  {rapport.activiteitenSamenvatting.length > 0 && (
                    <section>
                      <h3 className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider mb-3">Activiteiten per perceel</h3>
                      <div className="space-y-2">
                        {rapport.activiteitenSamenvatting.map((a, i) => {
                          const open = expandedActPercelen.has(i);
                          return (
                            <div key={i} className="bg-blue-950/40 border border-blue-800/40 rounded-xl overflow-hidden">
                              <button
                                onClick={() => toggleActPerceel(i)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-900/20 transition-colors text-left"
                              >
                                <span className="text-blue-100 text-xs font-medium">{a.kadastraleAanduiding}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-400/50 text-xs">{a.activiteiten.length} activiteit{a.activiteiten.length !== 1 ? 'en' : ''}</span>
                                  <svg className={`w-4 h-4 text-blue-400/50 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>
                              {open && (
                                <div className="border-t border-blue-800/30 px-4 py-3 space-y-2">
                                  {a.activiteiten.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {a.activiteiten.map((act, j) => (
                                        <span key={j} className="text-xs bg-blue-900/40 border border-blue-700/40 text-blue-200 rounded-full px-2 py-0.5">{act}</span>
                                      ))}
                                    </div>
                                  )}
                                  {a.ingediendeDocs.length > 0 && (
                                    <p className="text-xs text-blue-200/60"><span className="text-blue-400/60">Documenten: </span>{a.ingediendeDocs.join(', ')}</p>
                                  )}
                                  {a.bouwjaar && (
                                    <p className="text-xs text-blue-200/60"><span className="text-blue-400/60">Bouwjaar: </span>{a.bouwjaar}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Volledigheid detail */}
                  <section>
                    <h3 className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider mb-3">Volledigheid</h3>
                    <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-4 py-3 space-y-1.5">
                      <p className="text-blue-100/80 text-xs leading-relaxed">{rapport.volledigheid.samenvatting}</p>
                    </div>
                  </section>

                  {/* Procedure toelichting */}
                  <section>
                    <h3 className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider mb-3">Procedure toelichting</h3>
                    <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-4 py-3">
                      <p className="text-blue-100/70 text-xs leading-relaxed">{rapport.procedure.toelichting}</p>
                    </div>
                  </section>

                  {/* Bronnen + voorbehoud */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rapport.bronnen.length > 0 && (
                      <div>
                        <h3 className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider mb-2">Bronnen</h3>
                        <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl divide-y divide-blue-800/30">
                          {rapport.bronnen.map((b, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                              <span className="text-blue-200/70">{b.naam}</span>
                              <span className="text-blue-400/50 ml-2 flex-shrink-0">{b.geraadpleegd}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider mb-2">Voorbehoud</h3>
                      <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-xl px-3 py-3">
                        <p className="text-yellow-200/60 text-xs leading-relaxed">{rapport.voorbehoud}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Privacy-footer */}
      <div className="flex items-start gap-3 bg-green/5 border border-green/20 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <p className="text-xs text-text-muted leading-relaxed">
          Persoonsgegevens zijn nooit naar de AI gestuurd. De AI-analyse is gebaseerd op uitsluitend inhoudelijke context.
          NAW-gegevens zijn door de backend ingevuld na ontvangst van de AI-respons.
        </p>
      </div>
    </div>
  );
}

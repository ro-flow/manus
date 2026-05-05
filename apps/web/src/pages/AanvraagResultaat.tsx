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
            <div className="bg-bg rounded-lg p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono text-text-muted border border-bg-light">
              {bevestiging.brief}
            </div>
          </div>
        )}
      </section>

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

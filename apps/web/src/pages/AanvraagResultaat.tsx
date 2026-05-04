import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Aanvraag {
  id: string;
  gemeente: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  status: string;
  createdAt: string;
}

interface OntbrekendStuk {
  naam: string;
  toelichting: string;
  verplicht: boolean;
}

interface VolledigheidsResultaat {
  volledig: boolean;
  ontbrekend: OntbrekendStuk[];
  aanwezig: string[];
  aiToelichting?: string;
}

interface ProcedureResultaat {
  procedure: 'regulier' | 'uitgebreid' | 'vergunningvrij' | 'meldingsplichtig';
  doorlooptijd: string;
  toelichting: string;
}

interface OntvangstbevestigingResultaat {
  brief: string;
  procedure: ProcedureResultaat;
}

const PROCEDURE_LABELS: Record<string, { label: string; color: string }> = {
  regulier: { label: 'Reguliere procedure', color: 'text-blue-300 bg-blue-900/30 border-blue-700/50' },
  uitgebreid: { label: 'Uitgebreide procedure', color: 'text-orange-300 bg-orange-900/30 border-orange-700/50' },
  vergunningvrij: { label: 'Vergunningvrij', color: 'text-green-light bg-green/20 border-green/40' },
  meldingsplichtig: { label: 'Meldingsplichtig', color: 'text-yellow-300 bg-yellow-900/30 border-yellow-700/50' },
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

  const [loadingAanvraag, setLoadingAanvraag] = useState(true);
  const [loadingVolledigheid, setLoadingVolledigheid] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);

  const [errorAanvraag, setErrorAanvraag] = useState('');
  const [errorVolledigheid, setErrorVolledigheid] = useState('');
  const [errorBrief, setErrorBrief] = useState('');

  const [briefKopied, setBriefKopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function laden() {
      try {
        const res = await fetch(`/api/aanvragen/${id}`);
        if (!res.ok) throw new Error('Aanvraag niet gevonden');
        const data = await res.json() as Aanvraag;
        setAanvraag(data);
      } catch {
        setErrorAanvraag('Aanvraag kon niet worden geladen.');
        return;
      } finally {
        setLoadingAanvraag(false);
      }

      // Volledigheidscheck starten
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

      // Conceptbrief genereren
      setLoadingBrief(true);
      try {
        const res = await fetch(`/api/aanvragen/${id}/ontvangstbevestiging`, { method: 'POST' });
        if (!res.ok) throw new Error();
        setBevestiging(await res.json() as OntvangstbevestigingResultaat);
      } catch {
        setErrorBrief('Conceptbrief genereren mislukt.');
      } finally {
        setLoadingBrief(false);
      }
    }

    laden();
  }, [id]);

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

        {volledigheid && (
          <div className={`flex-shrink-0 flex items-center gap-2 rounded-full px-4 py-2 border text-sm font-semibold ${
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

      {/* Volledigheidscheck */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange/15 border border-orange/40 flex items-center justify-center text-orange text-xs font-bold">1</span>
          Volledigheidscheck
        </h2>

        {loadingVolledigheid && <SectionLoader label="AI controleert ontbrekende stukken…" />}

        {errorVolledigheid && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {errorVolledigheid}
          </div>
        )}

        {volledigheid && (
          <div className="card space-y-4">
            {volledigheid.ontbrekend.length > 0 ? (
              <div>
                <p className="text-sm text-text-muted mb-3">
                  De volgende stukken ontbreken of zijn niet herkend:
                </p>
                <ul className="space-y-2">
                  {volledigheid.ontbrekend.map((stuk) => (
                    <li key={stuk.naam} className="flex items-start gap-3">
                      <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                        stuk.verplicht
                          ? 'bg-red-900/40 border border-red-700/50'
                          : 'bg-yellow-900/30 border border-yellow-700/40'
                      }`}>
                        {stuk.verplicht ? (
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
                          {!stuk.verplicht && <span className="ml-2 text-xs text-text-muted font-normal">(aanbevolen)</span>}
                        </p>
                        <p className="text-xs text-text-muted">{stuk.toelichting}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Alle verwachte stukken zijn aanwezig.</p>
              </div>
            )}

            {volledigheid.aiToelichting && (
              <div className="pt-4 border-t border-bg-light">
                <p className="text-xs text-text-muted mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  AI-toelichting (persoonsgegevens zijn gefilterd)
                </p>
                <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{volledigheid.aiToelichting}</p>
              </div>
            )}
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
          return (
            <div className="card space-y-3">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border text-sm font-medium ${info.color}`}>
                {info.label}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">Doorlooptijd</p>
                  <p className="text-sm font-medium">{procedureVanBevestiging.doorlooptijd}</p>
                </div>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{procedureVanBevestiging.toelichting}</p>
            </div>
          );
        })()}
      </section>

      {/* Conceptbrief */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange/15 border border-orange/40 flex items-center justify-center text-orange text-xs font-bold">3</span>
          Conceptbrief
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
              <p className="text-xs text-text-muted flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                NAW-gegevens zijn ingevuld vanuit beveiligde opslag
              </p>
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

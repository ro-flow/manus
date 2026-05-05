import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const ACTIVITEIT_TYPES = [
  'bouwen', 'slopen', 'kappen', 'uitweg', 'reclame',
  'milieu', 'afwijken bestemmingsplan', 'anders',
];

interface PerceelInput {
  id: string;
  kadastraleAanduiding: string;
  activiteiten: string[];
  ingediendeDocs: { type: string; bestandsnaam: string }[];
  bouwjaar: number | null;
  postcode?: string;
  huisnummer?: string;
  gebruiksdoel?: string[];
  oppervlakte?: number | null;
}

interface ExtractieResultaat {
  gemeente?: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  locatieContext?: string;
  aanvraagnummer?: string;
  aanvraagdatum?: string;
  methode?: 'pdf_ai' | 'dso_xml';
  percelen?: PerceelInput[];
  naw: {
    naam?: string;
    email?: string;
    telefoon?: string;
    adres?: string;
    postcode?: string;
    woonplaats?: string;
  };
}

type Stap = 'upload' | 'analyseren' | 'bevestigen' | 'indienen';

export function Aanvraag() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stap, setStap] = useState<Stap>('upload');
  const [bestand, setBestand] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Geëxtraheerde + editeerbare velden
  const [gemeente, setGemeente] = useState('');
  const [activiteitType, setActiviteitType] = useState('bouwen');
  const [activiteitOmschrijving, setActiviteitOmschrijving] = useState('');
  const [naam, setNaam] = useState('');
  const [email, setEmail] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [adres, setAdres] = useState('');
  const [postcode, setPostcode] = useState('');
  const [woonplaats, setWoonplaats] = useState('');
  const [aanvraagnummer, setAanvraagnummer] = useState('');
  const [aanvraagdatum, setAanvraagdatum] = useState('');
  const [percelen, setPercelen] = useState<PerceelInput[] | undefined>(undefined);

  const [fout, setFout] = useState('');

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setBestand(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setBestand(file);
  }

  function vulVeldenIn(data: ExtractieResultaat) {
    if (data.gemeente) setGemeente(data.gemeente);
    if (data.activiteitType) {
      const genormaliseerd = ACTIVITEIT_TYPES.find(
        (t) => t.toLowerCase() === data.activiteitType!.toLowerCase()
      );
      setActiviteitType(genormaliseerd ?? 'anders');
    }
    if (data.activiteitOmschrijving) setActiviteitOmschrijving(data.activiteitOmschrijving);
    if (data.percelen?.length) setPercelen(data.percelen);
    if (data.aanvraagnummer) setAanvraagnummer(data.aanvraagnummer);
    if (data.aanvraagdatum) setAanvraagdatum(data.aanvraagdatum);
    if (data.naw.naam) setNaam(data.naw.naam);
    if (data.naw.email) setEmail(data.naw.email);
    if (data.naw.telefoon) setTelefoon(data.naw.telefoon);
    if (data.naw.adres) setAdres(data.naw.adres);
    if (data.naw.postcode) setPostcode(data.naw.postcode);
    if (data.naw.woonplaats) setWoonplaats(data.naw.woonplaats);
  }

  async function handleAnalyseer() {
    if (!bestand) return;
    setFout('');
    setStap('analyseren');

    try {
      const form = new FormData();
      form.append('bestand', bestand);
      const res = await fetch('/api/aanvragen/extraheer', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
        if (res.status === 503) throw new Error(body.message ?? 'AI-service tijdelijk niet beschikbaar. Probeer het over 30 minuten opnieuw.');
        throw new Error(body.message ?? body.error ?? 'Analyse mislukt');
      }
      const data = await res.json() as ExtractieResultaat;
      vulVeldenIn(data);
      setStap('bevestigen');
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Er is iets misgegaan bij de analyse.');
      setStap('upload');
    }
  }

  async function handleBevestig(e: React.FormEvent) {
    e.preventDefault();
    if (!activiteitType.trim()) { setFout('Type activiteit is verplicht.'); return; }
    setFout('');
    setStap('indienen');

    try {
      const res = await fetch('/api/aanvragen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemeente,
          activiteitType,
          activiteitOmschrijving,
          aanvraagnummer: aanvraagnummer || undefined,
          aanvraagdatum: aanvraagdatum || undefined,
          percelen: percelen ?? undefined,
          aanvrager: naam ? {
            naam,
            email: email || undefined,
            telefoon: telefoon || undefined,
            adres: adres || undefined,
            postcode: postcode || undefined,
            woonplaats: woonplaats || undefined,
          } : undefined,
        }),
      });

      if (!res.ok) throw new Error('Aanmaken aanvraag mislukt');
      const { id } = await res.json() as { id: string };

      if (bestand) {
        const form = new FormData();
        form.append('pdf', bestand);
        await fetch(`/api/aanvragen/${id}/pdf`, { method: 'POST', body: form });
      }

      navigate(`/aanvraag/${id}`);
    } catch {
      setFout('Indienen mislukt. Controleer de verbinding.');
      setStap('bevestigen');
    }
  }

  // ── Stap 1: upload ────────────────────────────────────────────────────────
  if (stap === 'upload' || stap === 'analyseren') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold mb-2">Nieuwe aanvraag</h1>
          <p className="text-text-muted">
            Upload de aanvraag-PDF of DSO-export. AI extraheert automatisch alle gegevens.
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => stap === 'upload' && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            stap === 'analyseren'
              ? 'border-orange/40 bg-orange/5 cursor-default'
              : isDragging
              ? 'border-orange bg-orange/10 cursor-copy'
              : bestand
              ? 'border-orange/60 bg-orange/5 cursor-pointer'
              : 'border-bg-light hover:border-orange/40 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,.xml,.zip,text/xml,application/zip"
            className="hidden"
            onChange={handleFileChange}
            disabled={stap === 'analyseren'}
          />

          {stap === 'analyseren' ? (
            <div className="flex flex-col items-center gap-4">
              <svg className="w-10 h-10 text-orange animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="font-semibold text-orange">Analyseren…</p>
                <p className="text-sm text-text-muted mt-1">AI leest de aanvraag. NAW wordt apart opgeslagen.</p>
              </div>
            </div>
          ) : bestand ? (
            <div className="flex flex-col items-center gap-3">
              {bestand.name.toLowerCase().endsWith('.pdf') ? (
                <svg className="w-10 h-10 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h2m4 0h-2m-2 0v4" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
              <div>
                <p className="font-semibold text-orange">{bestand.name}</p>
                <p className="text-xs text-text-muted">{(bestand.size / 1024).toFixed(0)} KB · klik om te wisselen</p>
              </div>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="font-semibold text-base mb-1">Sleep uw aanvraag hierheen</p>
              <p className="text-sm text-text-muted">PDF-aanvraag, DSO-exportbestand (.zip) of XML — max 50 MB</p>
            </>
          )}
        </div>

        {fout && (
          <div className="mt-4 bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {fout}
          </div>
        )}

        <button
          onClick={handleAnalyseer}
          disabled={!bestand || stap === 'analyseren'}
          className="btn-primary w-full justify-center py-4 text-base mt-6 disabled:opacity-40"
        >
          {stap === 'analyseren' ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Aanvraag analyseren…
            </>
          ) : (
            <>
              Analyseer aanvraag
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        <div className="mt-6 flex items-start gap-2 text-xs text-text-muted">
          <svg className="w-3.5 h-3.5 text-green-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Persoonsgegevens worden gescheiden opgeslagen en nooit naar AI gestuurd — alleen gebruikt in de brief.
        </div>
      </div>
    );
  }

  // ── Stap 2: bevestigen / indienen ─────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-8">
        <button
          onClick={() => setStap('upload')}
          className="text-text-muted hover:text-white text-sm transition-colors mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Ander bestand uploaden
        </button>
        <h1 className="text-3xl font-extrabold mb-2">Gegevens bevestigen</h1>
        <p className="text-text-muted">
          AI heeft de gegevens uit <span className="text-white font-medium">{bestand?.name}</span> geëxtraheerd.
          Controleer en corrigeer indien nodig.
        </p>
      </div>

      {/* Extractie-badge */}
      <div className="flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-lg px-4 py-2.5 mb-6">
        <svg className="w-4 h-4 text-green-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <p className="text-xs text-text-muted">
          Gegevens automatisch geëxtraheerd · NAW via patroonherkenning, inhoud via AI · Velden zijn aanpasbaar
        </p>
      </div>

      <form onSubmit={handleBevestig} className="space-y-6">

        {/* Aanvraaggegevens */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Aanvraaggegevens</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">Type activiteit</label>
            <select
              value={activiteitType}
              onChange={(e) => setActiviteitType(e.target.value)}
              className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
            >
              {ACTIVITEIT_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Omschrijving activiteit</label>
            <textarea
              value={activiteitOmschrijving}
              onChange={(e) => setActiviteitOmschrijving(e.target.value)}
              rows={3}
              className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors resize-none"
            />
          </div>
        </div>

        {/* Referentie */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Referentie</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Aanvraagnummer</label>
              <input
                type="text"
                value={aanvraagnummer}
                onChange={(e) => setAanvraagnummer(e.target.value)}
                placeholder="bijv. Z2024-0123"
                className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Aanvraagdatum</label>
              <input
                type="text"
                value={aanvraagdatum}
                onChange={(e) => setAanvraagdatum(e.target.value)}
                placeholder="bijv. 15 januari 2024"
                className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Percelen */}
        {percelen && percelen.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Percelen
              <span className="ml-2 text-xs font-normal normal-case text-text-muted">({percelen.length} gevonden)</span>
            </h2>
            <div className="space-y-2">
              {percelen.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-bg rounded-lg px-4 py-2.5 border border-bg-light"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span className="text-sm font-mono">{p.kadastraleAanduiding}</span>
                  </div>
                  {p.activiteiten.length > 0 && (
                    <span className="text-xs text-text-muted capitalize">
                      {p.activiteiten.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NAW-gegevens */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">NAW-gegevens aanvrager</h2>
            <span className="flex items-center gap-1 text-xs text-green-light">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Gescheiden opgeslagen
            </span>
          </div>
          <p className="text-xs text-text-muted -mt-2">
            NAW-gegevens worden nooit naar AI gestuurd en opgeslagen in een beveiligde tabel.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1.5">Naam aanvrager</label>
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Volledige naam of bedrijfsnaam"
              className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Telefoonnummer</label>
              <input
                type="tel"
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
                placeholder="06-12345678"
                className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Adres</label>
            <input
              type="text"
              value={adres}
              onChange={(e) => setAdres(e.target.value)}
              placeholder="Straatnaam 1"
              className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Postcode</label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="1234 AB"
                className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Woonplaats</label>
              <input
                type="text"
                value={woonplaats}
                onChange={(e) => setWoonplaats(e.target.value)}
                placeholder="Amsterdam"
                className="w-full bg-bg border border-bg-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange transition-colors"
              />
            </div>
          </div>
        </div>

        {fout && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {fout}
          </div>
        )}

        <button
          type="submit"
          disabled={stap === 'indienen'}
          className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50"
        >
          {stap === 'indienen' ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Aanvraag indienen…
            </>
          ) : (
            <>
              Bevestig en start scan
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

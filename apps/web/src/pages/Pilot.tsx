import { useState } from 'react';

const AANVRAGEN_OPTIES = [
  '< 100 per jaar',
  '100 – 500 per jaar',
  '500 – 2.000 per jaar',
  '2.000 – 10.000 per jaar',
  '> 10.000 per jaar',
];

export function Pilot() {
  const [gemeente, setGemeente] = useState('');
  const [naam, setNaam] = useState('');
  const [functie, setFunctie] = useState('');
  const [email, setEmail] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [aanvragenPerJaar, setAanvragenPerJaar] = useState('');
  const [toelichting, setToelichting] = useState('');

  const [loading, setLoading] = useState(false);
  const [verzonden, setVerzonden] = useState(false);
  const [fout, setFout] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gemeente.trim() || !naam.trim() || !email.trim()) {
      setFout('Gemeente, naam en e-mail zijn verplicht.');
      return;
    }
    setFout('');
    setLoading(true);
    try {
      const res = await fetch('/api/pilot-aanmeldingen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemeente, naam, functie: functie || undefined,
          email, telefoon: telefoon || undefined,
          aanvragenPerJaar: aanvragenPerJaar || undefined,
          toelichting: toelichting || undefined }),
      });
      if (!res.ok) throw new Error();
      setVerzonden(true);
    } catch {
      setFout('Aanmelding mislukt. Probeer het opnieuw of stuur een e-mail.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-bg border border-bg-light rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange transition-colors';

  if (verzonden) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green/20 border border-green/40 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold mb-3">Aanmelding ontvangen</h1>
        <p className="text-text-muted text-lg mb-2">
          Bedankt voor uw interesse, <span className="text-white font-medium">{naam}</span>.
        </p>
        <p className="text-text-muted">
          We nemen zo snel mogelijk contact op via <span className="text-white">{email}</span> om de pilot te bespreken.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-orange/15 border border-orange/30 text-orange
                        rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-6">
          <span className="w-1.5 h-1.5 bg-orange rounded-full animate-pulse" />
          Pilot 2026
        </div>
        <h1 className="text-3xl font-extrabold mb-3">Aanmelden als pilotgemeente</h1>
        <p className="text-text-muted leading-relaxed mb-3">
          Sluit uw gemeente aan als pilotpartner. We nemen binnen twee werkdagen contact op
          voor een vrijblijvend kennismakingsgesprek.
        </p>
        <p className="text-text-muted text-sm">
          RO-flow verwerkt zowel PDF-aanvragen als DSO-exportbestanden uit het Omgevingsloket.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-5">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Gemeente</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Naam gemeente <span className="text-orange">*</span>
            </label>
            <input type="text" value={gemeente} onChange={(e) => setGemeente(e.target.value)}
              placeholder="bijv. Gemeente Hoorn" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Aantal vergunningaanvragen per jaar</label>
            <select value={aanvragenPerJaar} onChange={(e) => setAanvragenPerJaar(e.target.value)}
              className={inputCls}>
              <option value="">— Selecteer —</option>
              {AANVRAGEN_OPTIES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="card space-y-5">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Contactpersoon</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Naam <span className="text-orange">*</span>
            </label>
            <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)}
              placeholder="Voor- en achternaam" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Functie</label>
            <input type="text" value={functie} onChange={(e) => setFunctie(e.target.value)}
              placeholder="bijv. Teamleider Vergunningen" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                E-mail <span className="text-orange">*</span>
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@gemeente.nl" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Telefoon</label>
              <input type="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)}
                placeholder="06-12345678" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Toelichting</h2>
          <textarea value={toelichting} onChange={(e) => setToelichting(e.target.value)}
            rows={4} placeholder="Vertel kort over uw situatie, uitdagingen of wensen..."
            className={`${inputCls} resize-none`} />
        </div>

        {fout && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {fout}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50">
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Aanmelding versturen…
            </>
          ) : (
            <>
              Aanmelden als pilotgemeente
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        <p className="text-xs text-text-muted text-center">
          Uw gegevens worden uitsluitend gebruikt voor de pilotprocedure en nooit gedeeld met derden.
        </p>
      </form>
    </div>
  );
}

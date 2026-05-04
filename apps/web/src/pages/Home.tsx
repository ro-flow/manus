import { Link } from 'react-router-dom';

const HERO_PERSON  = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/hero-person-hd-DhTKFFRpWhHnuhXfUitM4b.webp';
const CITY_AERIAL  = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-city-aerial-ihbE8ieaaEzrSXDnse5Fcp.webp';
const MEETING_ROOM = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/meeting-room-toetsing_644fb73f.png';

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#f04e23"
          strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />
      </svg>
      <div className="w-10 h-10 rounded-full bg-orange/15 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-green/20 border border-green/40 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-sm text-text-muted">{children}</span>
    </div>
  );
}

const FEATURES = [
  {
    titel: 'AI-extractie uit PDF en DSO',
    tekst: 'Upload een PDF of DSO-exportbestand (.zip/.xml). PDF-inhoud gaat via AI; DSO-bestanden worden direct geparsd — gemeente, activiteitstype en omschrijving worden automatisch ingevuld.',
    icon: <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    titel: 'Privacy-first architectuur',
    tekst: 'Naam, adres en contactgegevens worden via patroonherkenning in de backend geëxtraheerd — nooit via AI. Persoonsgegevens verlaten nooit Azure.',
    icon: <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    titel: 'Volledigheidscheck in seconden',
    tekst: 'Ontbrekende bijlagen worden direct gesignaleerd op basis van activiteitstype en gemeentelijk beleid. Geen handmatig nalopen van checklists.',
    icon: <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    titel: 'Conceptbrief direct klaar',
    tekst: 'AI genereert een ontvangstbevestiging met de juiste doorlooptijd en procedure. De backend vult naam en adres in — nooit via de AI-aanroep.',
    icon: <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  },
];

const OPBRENGSTEN = [
  { icon: '⏱️', titel: 'Sneller inzicht',            tekst: 'Van 1–3 uur naar 30 minuten per aanvraag' },
  { icon: '🔁', titel: 'Minder herstelwerk',         tekst: 'Direct signaleren van onvolledige aanvragen' },
  { icon: '⚖️', titel: 'Sterkere onderbouwing',      tekst: 'Elke aanvraag start met regelgevingsverwijzingen' },
  { icon: '🧭', titel: 'Consistente werkwijze',      tekst: 'Navolgbaar, ongeacht ervaring of werkdruk' },
  { icon: '📄', titel: 'Betere communicatie',        tekst: 'Aanvragers ontvangen sneller duidelijke berichten' },
  { icon: '🏛️', titel: 'Gemeentelijke aansluiting', tekst: "Aansluitend bij VNG-thema's en uitvoeringskracht" },
];

const STAPPEN = [
  { nr: '01', titel: 'Upload de aanvraag',       tekst: 'Sleep de PDF-aanvraag, DSO-exportbestand (.zip) of XML-bestand naar het formulier. Het bestand blijft in Azure Blob Storage — nooit in de database.' },
  { nr: '02', titel: 'AI extraheert automatisch', tekst: 'Gemeente, activiteitstype en omschrijving worden direct ingevuld. NAW-gegevens via patroonherkenning, apart opgeslagen.' },
  { nr: '03', titel: 'Behandelaar bevestigt',    tekst: 'De behandelaar controleert de geëxtraheerde gegevens en corrigeert waar nodig. Eén klik om de scan te starten.' },
  { nr: '04', titel: 'Scan + conceptbrief klaar', tekst: 'Volledigheidscheck, procedure-inschatting en ontvangstbevestiging zijn binnen seconden beschikbaar.' },
];

export function Home() {
  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <img src={HERO_PERSON} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-transparent to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 py-32 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-orange/15 border border-orange/30 text-orange
                            rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-8">
              <span className="w-1.5 h-1.5 bg-orange rounded-full animate-pulse" />
              Slim Intake Platform · Pilot actief
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight text-white mb-5">
              RO-flow –{' '}
              <span className="text-orange">Vergunning<br />Intake Platform</span>
            </h1>

            <p className="text-xl text-text-muted font-medium mb-4">
              Uploadeer een PDF-aanvraag of DSO-exportbestand. RO-flow extraheert automatisch
              alle gegevens en genereert binnen minuten een onderbouwde ontvangstbevestiging.
            </p>

            <p className="text-base text-text-muted leading-relaxed mb-10 max-w-xl">
              Gemeenten staan onder druk. Aanvragen worden complexer, werkdruk neemt toe
              en capaciteit staat onder spanning. Een groot deel van de tijd gaat niet naar
              de inhoudelijke beoordeling, maar naar de eerste fase: het structureren,
              controleren en herstellen van aanvragen. RO-flow ondersteunt precies dat moment.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/pilot" className="btn-primary px-8 py-3.5 text-sm">
                Aanmelden als pilotgemeente
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a href="#hoe-het-werkt" className="btn-outline px-8 py-3.5 text-sm">
                Bekijk hoe het werkt →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <div className="bg-bg-card border-y border-bg-light">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { getal: '< 30s',  label: 'Van PDF naar volledigheidscheck' },
            { getal: '100%',   label: 'AVG-compliant' },
            { getal: '0',      label: 'NAW-gegevens naar AI' },
            { getal: 'Azure',  label: 'Hosting & opslag' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold text-orange mb-1">{s.getal}</p>
              <p className="text-xs text-text-muted leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-orange uppercase mb-3">Features</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
              Alles wat een behandelaar nodig heeft
            </h2>
            <p className="text-text-muted max-w-xl mx-auto">
              Gebouwd voor Nederlandse gemeenten met privacy als harde randvoorwaarde — niet als bijzaak.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.titel} className="feature-card">
                <FeatureIcon>{f.icon}</FeatureIcon>
                <div>
                  <h3 className="text-base font-bold text-white mb-2">{f.titel}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{f.tekst}</p>
                </div>
                <a href="#hoe-het-werkt" className="btn-link-green text-sm mt-auto">
                  Meer informatie
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAT LEVERT HET OP? ───────────────────────────────────────────────── */}
      <section id="waarom" className="py-24 px-6 bg-bg-card border-y border-bg-light">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-orange uppercase mb-3">Resultaten</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
              Wat levert het op?
            </h2>
            <p className="text-text-muted max-w-xl mx-auto">
              Meetbare impact op de intakefase van vergunningverlening.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {OPBRENGSTEN.map((o) => (
              <div key={o.titel}
                className="bg-bg border border-bg-light rounded-2xl p-6 flex gap-4 items-start
                           hover:border-orange/30 transition-colors duration-300">
                <span className="text-3xl flex-shrink-0 mt-0.5">{o.icon}</span>
                <div>
                  <h3 className="font-bold text-white mb-1">{o.titel}</h3>
                  <p className="text-sm text-text-muted">{o.tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOE HET WERKT ────────────────────────────────────────────────────── */}
      <section id="hoe-het-werkt" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-orange uppercase mb-3">Hoe het werkt</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-10">
              Van PDF naar behandelklaar in vier stappen
            </h2>
            <div className="space-y-7">
              {STAPPEN.map((s) => (
                <div key={s.nr} className="flex gap-5">
                  <div className="flex-shrink-0 w-11 h-11 rounded-full border border-orange/50
                                  bg-orange/10 flex items-center justify-center">
                    <span className="text-xs font-extrabold text-orange">{s.nr}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{s.titel}</h4>
                    <p className="text-sm text-text-muted leading-relaxed">{s.tekst}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/aanvraag" className="btn-primary mt-10 inline-flex text-sm">
              Intake starten
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-orange/5 rounded-3xl blur-2xl" />
            <img src={MEETING_ROOM} alt="Behandelaars aan het werk"
              className="relative w-full rounded-2xl shadow-2xl border border-bg-light" />
          </div>
        </div>
      </section>

      {/* ── QUOTE + LUCHTFOTO ────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        <img src={CITY_AERIAL} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-bg/78" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <svg className="w-10 h-10 text-orange/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 32 32">
            <path d="M10 8C6.686 8 4 10.686 4 14s2.686 6 6 6c.35 0 .687-.04 1.013-.1C10.363 21.47 9.1 23.6 7 25h4c3.314 0 6-2.686 6-6V8h-7zm15 0c-3.314 0-6 2.686-6 6s2.686 6 6 6c.35 0 .687-.04 1.013-.1C25.363 21.47 24.1 23.6 22 25h4c3.314 0 6-2.686 6-6V8h-7z" />
          </svg>
          <blockquote className="text-2xl lg:text-3xl font-bold text-white leading-relaxed">
            "De grootste winst zit niet alleen in snelheid, maar in het voorkomen van
            onnodig werk en herstel in een later stadium."
          </blockquote>
        </div>
      </section>

      {/* ── AVG / AZURE ──────────────────────────────────────────────────────── */}
      <section id="avg" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-orange uppercase mb-3">Beveiliging & AVG</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-6">
              Volledig binnen Microsoft Azure
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              RO-flow is volledig ingericht binnen de Microsoft-omgeving.
              Persoonsgegevens blijven volledig binnen deze beveiligde omgeving.
              Er worden geen NAW-gegevens buiten Microsoft Azure verwerkt.
            </p>
            <div className="space-y-3">
              <Check>Persoonsgegevens opgeslagen in Azure</Check>
              <Check>Geen NAW-gegevens naar externe AI-diensten</Check>
              <Check>AVG-compliant · verwerkersovereenkomst beschikbaar</Check>
              <Check>Auditlog voor elke AI-aanroep</Check>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-green/5 rounded-3xl blur-2xl" />
            <img src={MEETING_ROOM} alt="Vergadering over toetsing"
              className="relative w-full rounded-2xl shadow-2xl border border-bg-light" />
          </div>
        </div>
      </section>

      {/* ── ONDERSTEUNEND NIET VERVANGEND ────────────────────────────────────── */}
      <section id="verantwoord" className="py-24 px-6 bg-bg-card border-y border-bg-light">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest text-orange uppercase mb-3">Positie van AI</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
              Ondersteunend, niet vervangend
            </h2>
            <p className="text-text-muted max-w-xl mx-auto">
              RO-flow neemt geen besluiten. Het platform versnelt en structureert —
              de behandelaar blijft altijd in regie.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { nr: '01', titel: 'Inzichten zijn indicatief',          tekst: 'De output van RO-flow is een hulpmiddel voor de behandelaar, geen bindend advies of juridische beoordeling.' },
              { nr: '02', titel: 'De behandelaar houdt regie',         tekst: 'Elke stap in het platform wordt bevestigd door een behandelaar. Automatisering vindt nooit zonder toezicht plaats.' },
              { nr: '03', titel: 'De vergunningverlener blijft verantwoordelijk', tekst: 'RO-flow ondersteunt de intakefase. De inhoudelijke beoordeling en het besluit blijven bij de bevoegde instantie.' },
            ].map((item) => (
              <div key={item.nr} className="bg-bg border border-bg-light rounded-2xl p-6">
                <span className="text-xs font-extrabold text-orange tracking-widest mb-3 block">{item.nr}</span>
                <h3 className="font-bold text-white mb-2">{item.titel}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PILOT ────────────────────────────────────────────────────────────── */}
      <section id="pilot" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-orange uppercase mb-3">Pilot 2026</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
              Sluit uw gemeente aan als pilotpartner
            </h2>
            <p className="text-text-muted max-w-xl mx-auto">
              We werken samen met een select aantal gemeenten om het platform te verfijnen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Wat bieden wij */}
            <div className="bg-bg-card border border-bg-light rounded-2xl p-8">
              <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-orange/20 border border-orange/40
                                 flex items-center justify-center text-orange text-xs font-extrabold">↓</span>
                Wat bieden wij
              </h3>
              <div className="space-y-3">
                <Check>Volledige toegang tot het RO-flow platform</Check>
                <Check>Persoonlijke begeleiding en onboarding</Check>
                <Check>Directe invloed op de productroadmap</Check>
                <Check>AVG-verwerkersovereenkomst inbegrepen</Check>
              </div>
            </div>

            {/* Wat vragen wij */}
            <div className="bg-bg-card border border-bg-light rounded-2xl p-8">
              <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-orange/20 border border-orange/40
                                 flex items-center justify-center text-orange text-xs font-extrabold">↑</span>
                Wat vragen wij
              </h3>
              <div className="space-y-3">
                <Check>Toepassing in de intakefase van vergunningverlening</Check>
                <Check>Terugkoppeling en gebruikersfeedback</Check>
                <Check>Bereidheid tot constructieve samenwerking</Check>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link to="/pilot" className="btn-primary text-base px-12 py-4 inline-flex">
              Aanmelden als pilotgemeente
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-bg-light bg-bg-card py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div>
              <img src="https://ro-flow.nl/ro-flow-logo.png" alt="RO-flow" className="h-7 w-auto mb-2" />
              <p className="text-xs text-text-muted">Slim Intake Platform voor Gemeenten · PDF &amp; DSO · AVG-compliant · Gebouwd op Azure</p>
            </div>
            <nav className="flex flex-wrap gap-6 text-xs text-text-muted justify-center">
              <a href="#avg"             className="hover:text-white transition-colors">AVG & Privacy</a>
              <a href="#pilot"           className="hover:text-white transition-colors">Pilot</a>
              <a href="#faq"             className="hover:text-white transition-colors">FAQ</a>
              <Link to="/aanvraag"       className="hover:text-white transition-colors">Scan starten</Link>
            </nav>
          </div>
          <div className="border-t border-bg-light pt-6 text-center text-xs text-text-muted">
            © {new Date().getFullYear()} RO-flow · Gebouwd op Microsoft Azure · AVG-compliant
          </div>
        </div>
      </footer>

    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileSearch, 
  Scale, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  UserCheck,
  ArrowRight,
  Check,
  X,
  ChevronDown,
  Shield,
  Zap,
  Users,
  Building2,
  RefreshCw,
  Brain,
  Layers,
  Landmark,
  Gavel,
  FileText,
  Target,
  Volume2,
  Library,
  BarChart3,
  TreePine,
  Factory,
  AlertTriangle,
  MapPin,
  Home as HomeIcon,
  ClipboardCheck,
  Map,
  Leaf,
  Wind,
  Castle,
  Ruler,
  Flame,
  Ear,
  Wheat,
  Construction,
  Grid3X3,
  BookOpenCheck,
  CloudFog,
  Database,
  MessageSquare,
  ThumbsUp,
  Menu
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Footer } from "@/components/Footer";
import { FadeInSection } from "@/components/FadeInSection";

// CDN image URLs
const CITY_AERIAL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-city-aerial-ihbE8ieaaEzrSXDnse5Fcp.webp";
const CITY_AI = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-city-ai-overlay-JtMkeQPhzQvXCRiJAy9nhE.webp";
const NEIGHBORHOOD = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-neighborhood-aerial-RWcSWumGe6juTqWPLJ2K8e.webp";
const TEAMWORK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-teamwork-cgH4TJ58WPNpqXvq9KfpxU.webp";
const DIGITAL_PROCESS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/digital-process-transparent_2b628390.png";
const MUNICIPALITY = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-municipality-8rcnYoj9FVz3z3fa6rAk6u.webp";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiExpanded, setApiExpanded] = useState(false);

  const getDashboardUrl = () => {
    if (!user) return "/admin";
    if (user.role === 'super_admin' || user.role === 'admin') return "/admin";
    if (user.role === 'gemeente_beheerder') return "/beheerder";
    return "/gebruiker";
  };

  const featureCategories = [
    {
      category: "Analyse & Volledigheid",
      items: [
        { icon: FileSearch, title: "Aanvraagsamenvatting", description: "Type activiteit, exacte afmetingen, locatie op het perceel – in één oogopslag" },
        { icon: CheckCircle2, title: "Volledigheidscheck", description: "Ontbrekende documenten met concrete aanbevelingen" },
      ]
    },
    {
      category: "Juridische Toetsing",
      items: [
        { icon: Scale, title: "Omgevingsplantoets", description: "Toets aan bestemming, bouwregels, parapluregels en dubbelbestemmingen met directe links naar de bronnen" },
        { icon: Gavel, title: "Vergunningplichtanalyse", description: "Heldere beslisboom met wettelijke grondslag en artikelverwijzingen" },
        { icon: FileText, title: "BAL/BKL Toetsing", description: "Directe koppeling met het Besluit activiteiten leefomgeving en Besluit kwaliteit leefomgeving" },
        { icon: Users, title: "Procedure & Adviseurs", description: "Regulier of uitgebreid en waarom. Welke adviseurs om advies gevraagd moeten worden (Provincie, Welstandscommissie, Veiligheidsregio)" },
      ]
    },
    {
      category: "Sectorale Toetsen",
      items: [
        { icon: TreePine, title: "Natuur & Ecologie", description: "Natura 2000, NNN-gebieden en soortenbescherming" },
        { icon: AlertTriangle, title: "AERIUS-signalering", description: "Signaleren dat een AERIUS-berekening nodig kan zijn, op basis van de locatie (nabijheid Natura 2000-gebieden) en het type activiteit" },
        { icon: Landmark, title: "Erfgoed & Cultuurhistorie", description: "Monumenten, beschermde stads- en dorpsgezichten, archeologische verwachtingswaarden" },
        { icon: Volume2, title: "Milieu & Leefomgeving", description: "Bidirectionele toetsing van geluid, geur, bodem, externe veiligheid en luchtkwaliteit. Wat komt op het plan af én wat doet het plan met de omgeving?" },
        { icon: Factory, title: "Graafwerk & Bodem", description: "Graafdiepte-verificatie, archeologische toetsing, funderingsrisico, grondverzet-signalering" },
      ]
    },
    {
      category: "Advies & Rapportage",
      items: [
        { icon: Library, title: "Jurisprudentie", description: "Relevante uitspraken van de Raad van State en rechtbanken, automatisch gesignaleerd bij complexe aanvragen, ter duiding" },
        { icon: Target, title: "Haalbaarheidsschatting", description: "Procesmatige risico-inschatting op basis van objectieve criteria, met expliciete factoren en voorwaarden — geen advies over wenselijkheid of uitkomst" },
        { icon: BarChart3, title: "BOPA", description: "Bij een BOPA wordt getoetst aan al het nationaal-, provinciaal-, regionaal- en gemeentelijk beleid. Integrale belangenafweging" },
        { icon: FileText, title: "Compleet Behandelrapport", description: "Alle onderdelen in één gestructureerd PDF rapport." },
      ]
    }
  ];

  const benefits = [
    { title: "Aanzienlijke tijdsbesparing", description: "De eerste beoordeling kost in de praktijk vaak tientallen uren verspreid over meerdere medewerkers. Ro-flow brengt deze fase terug tot minuten, met één gestructureerd rapport als basis.", icon: Clock },
    { title: "Minder bezwaar en herstelbesluiten", description: "Elk rapport bevat exacte artikelverwijzingen naar de Omgevingswet, het omgevingsplan en overige regelgeving. Minder kans op gemiste toetsingskaders betekent minder bezwaar- en beroepsprocedures.", icon: Shield },
    { title: "Direct inzetbaar", description: "Gebouwd als Progressive Web App. Geen IT-traject, geen installatie — binnen één dag een werkend systeem.", icon: Zap },
    { title: "Minder overdrachtsverlies", description: "Alle relevante toetsingskaders, verplichte adviseurs en procedurele vereisten staan in één rapport. Bij overdracht van dossiers gaat geen informatie verloren.", icon: Scale },
  ];

  const forWho = [
    { title: "Vergunningverleners", icon: Users, items: ["Automatische toetsing aan planregels, BAG, Natura 2000, erfgoed en milieuzones via 16+ gekoppelde overheidsbronnen", "Alle relevante regels, gebiedsaanwijzingen en beleid in één overzicht", "Onderbouwing met exacte wetsartikelen, jurisprudentie en beleidsverwijzingen", "Gestructureerd rapport als basis voor besluit"] },
    { title: "Beleidsmedewerkers", icon: BookOpen, items: ["Inzicht in hoe beleid per laag (Rijk, provincie, regio, gemeente) wordt toegepast op concrete aanvragen", "Signalering van tegenstrijdigheden tussen beleidslagen en planregels", "Wederkerige toetsing: wat komt op het plan af én wat doet het plan met de omgeving?", "Automatisch bijgewerkte kennisbank met actueel beleid uit alle relevante bronnen"] },
  ];

  const whatWeDoNot = [
    "Voert geen berekeningen uit (geluid, ecologie, stikstof)",
    "Vervangt geen specialistisch onderzoek",
    "Neemt geen besluit"
  ];

  const whatWeDo = [
    "Haalt relevante regels en beleid automatisch op",
    "Structureert informatie per toetsingskader",
    "Signaleert wanneer aanvullend onderzoek vereist is",
    "Doet suggesties voor interne en externe adviseurs zoals \u201Cveiligheidsregio\u201D of \u201Cbeleidsadviseur recreatie\u201D"
  ];

  const faqs = [
    { question: "Is het AVG-proof?", answer: "Wij nemen de AVG serieus. Aanvraagdocumenten worden verwerkt via beveiligde API-verbindingen en worden niet permanent opgeslagen buiten de gemeentelijke omgeving. De gemeente blijft eigenaar van alle data, DSO-bestanden worden niet gebruikt voor modeltraining. Strikte data-isolatie: elke gemeente heeft uitsluitend toegang tot eigen dossiers. Een verwerkersovereenkomst is beschikbaar conform gemeentelijke standaarden. Zie ons <a href='/privacy' class='text-coral hover:underline'>privacybeleid</a> voor de volledige details." },
    { question: "Hoe snel zijn we live?", answer: "Binnen 1 dag. Geen IT-traject, geen installatie, direct aan de slag." },
    { question: "Hoe werkt de kennisbank?", answer: "Elke nacht doorzoekt een geautomatiseerde crawler alle relevante bronnen: Overheid.nl, Ruimtelijkeplannen.nl, Wetten.overheid.nl en gemeentelijke websites. Nieuwe regelgeving wordt automatisch verwerkt. De kennisbank is gelaagd (Rijks → Provinciaal → Regionaal → Gemeentelijk) en locatie-afhankelijk. Oude versies van beleidsdocumenten worden automatisch op 'vervallen' gezet wanneer nieuwe versies beschikbaar komen. Desgewenst kunnen aanvullende documenten handmatig worden toegevoegd." },
  ];

  const steps = [
    { step: 1, title: "Upload DSO-zipbestand", description: "Sleep het bestand naar het scherm" },
    { step: 2, title: "Klik op Behandelen", description: "Start de AI-analyse" },
    { step: 3, title: "AI analyseert", description: "Locatie, tekeningen, planregels, beleid" },
    { step: 4, title: "Ontvang rapport", description: "Compleet behandelrapport" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="/ro-flow-logo.png" alt="Ro-flow" className="h-14 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#waarom" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Waarom</a>
            <a href="#features" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Features</a>
            <a href="#api-koppelingen" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">API's</a>
            <a href="#how-it-works" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Hoe het werkt</a>
            <a href="#pilot-signup" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Pilot</a>
            <Link href="/omgevingsscan" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Omgevingsscan</Link>
            <Link href="/verantwoorde-ai" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Verantwoorde AI</Link>
            <Link href="/faq" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/omgevingsscan/dashboard" className="hidden sm:block">
              <Button variant="ghost" className="text-sm font-bold text-coral hover:text-coral-dark">
                Scan Dashboard
              </Button>
            </Link>
            <Link href={getDashboardUrl()} className="hidden sm:block">
              <Button variant="ghost" className="text-sm font-bold text-foreground">
                {isAuthenticated ? "Dashboard" : "Inloggen"}
              </Button>
            </Link>
            <Link href="/pilot" className="hidden sm:block">
              <Button className="bg-coral hover:bg-coral-dark text-white rounded-lg px-5 text-sm font-bold border-2 border-coral">
                Aanmelden als pilotgemeente
              </Button>
            </Link>
            <button
              className="md:hidden p-2 text-foreground hover:text-coral transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu openen"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-border/30 shadow-lg">
            <div className="container py-4 flex flex-col gap-3">
              <a href="#waarom" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Waarom</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Features</a>
              <a href="#api-koppelingen" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">API's</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Hoe het werkt</a>
              <a href="#pilot-signup" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Pilot</a>
              <Link href="/omgevingsscan" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Omgevingsscan</Link>
              <Link href="/verantwoorde-ai" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Verantwoorde AI</Link>
              <Link href="/faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">FAQ</Link>
              <div className="border-t border-border/30 pt-3 mt-1 flex flex-col gap-2">
                <Link href="/omgevingsscan/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-sm font-bold text-coral border-coral">
                    Scan Dashboard
                  </Button>
                </Link>
                <Link href={getDashboardUrl()} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-sm font-bold">
                    {isAuthenticated ? "Dashboard" : "Inloggen"}
                  </Button>
                </Link>
                <Link href="/pilot" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-coral hover:bg-coral-dark text-white rounded-lg text-sm font-bold border-2 border-coral">
                    Aanmelden als pilotgemeente
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Image fully visible, text below */}
      <section>
        {/* Image - full width, no overlay */}
        <div className="w-full">
          <img 
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/hero-person-hd-DhTKFFRpWhHnuhXfUitM4b.webp" 
            alt="Vergunningverlener die succesvol werkt met Ro-flow"
            className="w-full h-[320px] md:h-[420px] lg:h-[500px] object-cover object-top"
          />
        </div>
        
        {/* Text below image */}
        <div className="bg-[#0D1A3B] py-12 md:py-16">
          <div className="container">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-[3.5rem] font-semibold text-white leading-[1.15] tracking-tight mb-6">
                AI-behandelassistent voor omgevingsvergunningen
              </h1>
              <p className="text-lg text-white/90 mb-4 leading-relaxed max-w-xl font-medium">
                Ro-flow genereert een volledig, juridisch navolgbaar behandelrapport voor omgevingsvergunningen — inclusief procedureduiding, adviseursoverzicht en artikelverwijzingen.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/pilot-aanvraag">
                  <Button size="lg" className="bg-coral hover:bg-coral-dark text-white rounded-lg px-8 h-13 text-base font-bold border-2 border-coral shadow-lg">
                    Aanmelden als pilotgemeente
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards - Below hero */}
      <section className="relative z-20 py-16 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Volledigheidscheck", desc: "Detecteert ontbrekende documenten en gegevens, met concrete aanbevelingen voor aanvulling.", icon: CheckCircle2 },
              { title: "Juridische toetsing", desc: "Volledige toetsing aan omgevingsplan en relevante regelgeving. Volg de juiste procedure.", icon: Scale },
              { title: "Compleet behandelrapport", desc: "Alle relevante onderdelen samengebracht in één gestructureerd rapport, direct beschikbaar.", icon: FileText },
            ].map((card, i) => (
              <Card key={i} className="bg-[#0D1A3B] text-white border border-white/10 shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center mx-auto mb-4">
                    <card.icon className="w-8 h-8 text-coral" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {card.title}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">{card.desc}</p>
                  <a href="#features" className="inline-block mt-4">
                    <Button size="sm" className="bg-white text-primary hover:bg-white/90 rounded-lg font-bold text-sm">
                      Meer informatie
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
          </FadeInSection>
        </div>
      </section>



      {/* Waarom Ro-flow - City aerial background with white card */}
      <section id="waarom" className="relative py-20">
        <div className="absolute inset-0">
          <img src={CITY_AERIAL} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0D1A3B]/40" />
        </div>
        <div className="container relative z-10">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardContent className="p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl text-foreground tracking-tight mb-6">
                  Waarom Ro-flow?
                </h2>
                
                <p className="text-sm text-foreground/75 leading-relaxed mb-8">
                  Nederlandse gemeenten staan voor een structureel capaciteitstekort in het fysieke domein. De complexiteit van de Omgevingswet neemt toe, doorlooptijden staan onder druk en de eisen aan juridische onderbouwing worden steeds hoger. Ro-flow is ontwikkeld om gemeenten in de eerste beoordelingsfase te ondersteunen. Op deze wijze wordt er een kwaliteitsslag gemaakt en wordt er een significante tijdswinst behaald. Het systeem structureert aanvraagdocumenten, bepaalt op basis van het omgevingsplan welke procedure aan de orde is en ontsluit gericht de relevante regelgeving en beleidskaders die binnen die procedure juridisch van toepassing zijn. Deze analyse wordt vastgelegd in één gestructureerd, navolgbaar behandelrapport dat fungeert als startpunt voor de inhoudelijke beoordeling.
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-full bg-coral" />
                      Procedure bepaalt toetsingskader
                    </h3>
                    <p className="text-sm text-foreground/75 leading-relaxed">
                      Het systeem start bij de kern: een toets aan de regels van het omgevingsplan, waaronder bestemmingen, bouwregels, dubbelbestemmingen en parapluregels. Op basis hiervan wordt vastgesteld of een activiteit vergunningsvrij, vergunningplichtig of een BOPA is. Deze procedureduiding bepaalt het verdere toetsingskader.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-full bg-coral" />
                      Beleid alleen wanneer juridisch relevant
                    </h3>
                    <p className="text-sm text-foreground/75 leading-relaxed">
                      Ro-flow raadpleegt gericht de gelaagde kennisbank met rijks-, provinciaal-, regionaal en gemeentelijk beleid. Daarbij wordt expliciet onderscheid gemaakt tussen wettelijk verplichte toetsingskaders en beleidsmatige afwegingen — beleid wordt alleen betrokken wanneer dit juridisch relevant is binnen de procedure. <a href="/gelaagde-kennisbank" className="text-coral hover:underline font-semibold">Lees meer over de kennisbank →</a>
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-full bg-coral" />
                      Volledig navolgbaar rapport
                    </h3>
                    <p className="text-sm text-foreground/75 leading-relaxed">
                      De uitkomst wordt vastgelegd in één gestructureerd behandelrapport — van procedureduiding en adviseursoverzicht tot haalbaarheidsschatting en juridische onderbouwing. Elk rapport is voorzien van expliciete bron- en artikelverwijzingen en direct controleerbaar. <a href="#features" className="text-coral hover:underline font-medium">Bekijk welke onderdelen het rapport bevat.</a>
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Voor wie - Dark navy background */}
      <section id="voor-wie" className="py-20 bg-[#0D1A3B]">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl text-white tracking-tight mb-6 text-center">
              Voor wie?
            </h2>
            <p className="text-base text-white/80 leading-relaxed mb-10 text-center max-w-3xl mx-auto">
              Ro-flow is bedoeld voor beleidsmedewerkers en vergunningverleners binnen gemeenten, provincies en waterschappen die werken met de Omgevingswet.
            </p>

            <div className="mb-10 rounded-xl overflow-hidden shadow-lg max-w-3xl mx-auto">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/meeting-room-toetsing_644fb73f.png" alt="Ro-flow presentatie in vergaderruimte" className="w-full h-64 md:h-80 object-cover object-center" />
            </div>

            <div className="space-y-8 max-w-3xl mx-auto">
              {forWho.map((group, index) => (
                <div key={index}>
                  <h3 className="text-lg font-semibold text-white mb-3">{group.title}</h3>
                  <ul className="space-y-2">
                    {group.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-white/70 text-sm">
                        <Check className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* De voordelen - White card on neighborhood aerial background */}
      <section id="voordelen" className="relative py-20">
        <div className="absolute inset-0">
          <img src={NEIGHBORHOOD} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0D1A3B]/50" />
        </div>
        <div className="container relative z-10">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardContent className="p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl text-foreground tracking-tight mb-8">
                  De voordelen
                </h2>

                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="w-5 h-5 text-coral" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground mb-1">{benefit.title}</h3>
                        <p className="text-foreground/70 text-sm">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-primary/5 rounded-xl p-6">
                  <h4 className="text-sm font-bold text-foreground mb-3">Resultaat:</h4>
                  <ul className="space-y-2">
                    {["Meer ruimte voor zorgvuldige advisering en interne afstemming", "Beter onderbouwde besluiten met minder bezwaar- en beroepsprocedures", "Aanvragers weten eerder waar ze aan toe zijn", "Meer capaciteit voor betekenisvolle burgerparticipatie"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-foreground text-sm">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* What does Ro-flow do - Features detail with rich background */}
      <section id="features" className="py-20 bg-white">
        
        <div className="container relative z-10">
          <FadeInSection>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl text-[#0D1A3B] tracking-tight mb-4">
              Wat doet Ro-flow?
            </h2>
            <p className="text-base text-[#0D1A3B]/70 mb-6">
              De behandelaar uploadt de aanvraagdocumenten en het systeem verzamelt, structureert en koppelt alle relevante informatie. Geen urenlang zoeken in regelgeving, maar direct aan de slag met de inhoudelijke beoordeling.
            </p>
            <div className="mb-10 flex justify-center">
              <img src={DIGITAL_PROCESS} alt="Digitaal verwerkingsproces" className="w-full max-w-2xl h-auto object-contain" />
            </div>

          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {featureCategories.map((cat, catIndex) => (
              <div key={catIndex}>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-coral-light uppercase tracking-wide">
                  <div className="w-1 h-4 rounded-full bg-coral" />
                  {cat.category}
                </h3>
                <div className="space-y-1 ml-3">
                  {cat.items.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 py-1">
                      <feature.icon className="w-4 h-4 text-coral/70 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[#0D1A3B]/80">
                        <span className="font-semibold text-[#0D1A3B]">{feature.title}</span>
                        <span className="text-[#0D1A3B]/50"> — {feature.description}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </FadeInSection>
        </div>
      </section>



      {/* API Koppelingen Overview */}
      <section id="api-koppelingen" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/api-section-bg-VEXYynvNFhKmDdAFTYsnjN.webp" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#F5F3EF]/70" />
        </div>
        <div className="container relative z-10">
          <FadeInSection>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl text-foreground tracking-tight mb-4">
              16 directe koppelingen met landelijke registraties
            </h2>
            <p className="text-base text-foreground/70 mb-6">
              Ro-flow haalt data real-time op uit overheidsregistraties en databronnen: van BAG en kadaster tot Natura 2000, AERIUS, ruimtelijkeplannen.nl en rechtspraak.nl. Zo is elke analyse gebaseerd op de meest actuele stand.
            </p>
            <button
              onClick={() => setApiExpanded(!apiExpanded)}
              className="inline-flex items-center gap-2 text-coral hover:text-coral-dark font-bold text-sm transition-colors"
            >
              {apiExpanded ? 'Verberg technische details' : 'Bekijk alle 16 API-koppelingen'}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${apiExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className={`max-w-6xl mx-auto grid md:grid-cols-2 gap-4 transition-all duration-500 overflow-hidden ${apiExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {[
              { icon: MapPin, title: "PDOK Locatieserver", description: "Vertaalt adressen naar coördinaten (geocodering) en vice versa. Bepaalt RD-coördinaten die nodig zijn voor alle andere geo-checks en ruimtelijke analyses.", bg: "bg-blue-100", color: "text-blue-600" },
              { icon: HomeIcon, title: "BAG (Basisregistratie Adressen en Gebouwen)", description: "Haalt officiële gebouwgegevens op via de Kadaster API: bouwjaar, pandstatus, gebruiksdoel (wonen/kantoor/winkel), oppervlakte en verblijfsobjectinformatie. Essentieel voor het bepalen van asbestrisico en functiewijzigingen.", bg: "bg-amber-100", color: "text-amber-600" },
              { icon: ClipboardCheck, title: "DSO (Digitaal Stelsel Omgevingswet)", description: "De officiële vergunningcheck-API van de overheid. Bepaalt of een activiteit vergunningplichtig, meldingsplichtig of vergunningvrij is. Levert ook indieningsvereisten, bevoegd gezag, behandeldienst en toepasbare regels.", bg: "bg-indigo-100", color: "text-indigo-600" },
              { icon: Map, title: "Ruimtelijkeplannen.nl", description: "Haalt bestemmingsplannen, omgevingsplanregels en gebiedsaanwijzingen op per locatie. Toont welke bestemmingen (enkel- en dubbelbestemmingen) gelden en welke planregels van toepassing zijn.", bg: "bg-sky-100", color: "text-sky-600" },
              { icon: Leaf, title: "PDOK Natura 2000", description: "Detecteert Natura 2000-gebieden in de omgeving, berekent de afstand tot het dichtstbijzijnde gebied en schat het stikstofrisico in op basis van locatie en type activiteit.", bg: "bg-emerald-100", color: "text-emerald-600" },
              { icon: Wind, title: "AERIUS Connect API", description: "Stikstof voortoets: bepaalt of een AERIUS-berekening nodig is op basis van activiteiten en afstand tot Natura 2000. Kan ook daadwerkelijk berekeningen starten en jobstatus opvragen.", bg: "bg-teal-100", color: "text-teal-600" },
              { icon: TreePine, title: "PDOK Beschermde Gebieden (CDDA)", description: "Checkt of een locatie in of nabij NNN-gebieden (Natuurnetwerk Nederland) of nationale parken ligt. Relevant voor aanvullende natuurbeschermingseisen.", bg: "bg-green-100", color: "text-green-600" },
              { icon: Castle, title: "PDOK Cultuurhistorie (RCE)", description: "Detecteert rijksmonumenten en beschermde stads- of dorpsgezichten in de omgeving van de locatie. Bepaalt of een monumentenvergunning of welstandsadvies nodig is.", bg: "bg-purple-100", color: "text-purple-600" },
              { icon: Grid3X3, title: "BGT (Basisregistratie Grootschalige Topografie)", description: "Gedetailleerde topografische informatie: panden, wegen, waterdelen, begroeid en onbegroeid terrein. Gebruikt voor bebouwingsdichtheid en omgevingsanalyse.", bg: "bg-slate-100", color: "text-slate-600" },
              { icon: Flame, title: "REV (Register Externe Veiligheid)", description: "Detecteert Bevi-inrichtingen (fabrieken, opslagplaatsen) en buisleidingen in de omgeving. Bepaalt veiligheidscontouren en risico's voor externe veiligheid. Wederkerige toetsing.", bg: "bg-red-100", color: "text-red-600" },
              { icon: Ear, title: "PDOK Milieu-endpoints", description: "Meerdere APIs voor: stiltegebieden, geluidzones rond luchthavens, geluid van hoofdwegen en spoorwegen (omgevingslawaai), en het bodemloket (bodemverontreiniging). Wederkerige toetsing.", bg: "bg-orange-100", color: "text-orange-600" },
              { icon: Wheat, title: "BRP Gewaspercelen", description: "Checkt of een locatie op of nabij landbouwpercelen ligt. Relevant bij bouwen op of in de nabijheid van landbouwgrond en de beoordeling van agrarische bestemmingen. Wederkerige toetsing.", bg: "bg-lime-100", color: "text-lime-600" },
              { icon: Construction, title: "PDOK Funderingsproblematiek", description: "Detecteert of een locatie in een risicogebied voor funderingsproblemen ligt. Relevant bij nieuwbouw en verbouw voor constructieve veiligheid.", bg: "bg-yellow-100", color: "text-yellow-600" },
              { icon: Ruler, title: "PDOK Kadastrale kaart", description: "Perceelgrenzen, kadastrale aanduiding en perceeloppervlakte. Essentieel voor het bepalen van het bouwvlak en de relatie met aangrenzende percelen.", bg: "bg-rose-100", color: "text-rose-600" },
              { icon: CloudFog, title: "Geurcontouren Veehouderijen", description: "Analyseert geurbelasting van veehouderijen en industrie via provinciale WFS-data. Toetst aan GES-scores en geurnormen. Wederkerige toetsing.", bg: "bg-amber-100", color: "text-amber-600" },
              { icon: BookOpenCheck, title: "OpenRechtspraak", description: "Doorzoekt jurisprudentie via data.rechtspraak.nl en haalt relevante uitspraken op voor juridische onderbouwing van het behandelrapport.", bg: "bg-violet-100", color: "text-violet-600" },
            ].map((api, index) => (
              <Card key={index} className="bg-white border border-border shadow-sm hover:shadow-md hover:border-coral/30 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full ${api.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <api.icon className={`w-5 h-5 ${api.color}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-1">{api.title}</h4>
                      <p className="text-foreground/60 text-sm leading-relaxed">{api.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {apiExpanded && (
            <div className="max-w-3xl mx-auto mt-10 text-center">
              <div className="p-5 bg-[#0D1A3B]/5 rounded-xl border border-[#0D1A3B]/10">
                <Database className="w-6 h-6 text-coral mx-auto mb-2" />
                <p className="text-foreground font-bold text-sm">
                  Alle data wordt real-time opgehaald — geen verouderde kopieën, altijd de meest actuele stand.
                </p>
              </div>
            </div>
          )}
          </FadeInSection>
        </div>
      </section>

      {/* How it works - Dark navy background */}
      <section id="how-it-works" className="py-20 bg-[#0D1A3B]">
        <div className="container">
          <FadeInSection>
          <h2 className="text-3xl md:text-4xl text-white text-center tracking-tight mb-4">
            Zo werkt het
          </h2>

          <div className="mb-10 rounded-xl overflow-hidden shadow-lg max-w-2xl mx-auto">
            <img src={MUNICIPALITY} alt="Nederlands gemeentelijk gebied" className="w-full h-48 object-cover" />
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-6 mb-8 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-coral text-white flex items-center justify-center font-bold text-lg">
                      {step.step}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-0.5 h-full bg-white/20 mt-2" />
                    )}
                  </div>
                  <div className="pb-8 pt-2">
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                    <p className="text-white/60">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* What Ro-flow does NOT do - White background */}
      <section className="py-20 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl text-foreground text-center tracking-tight mb-12">
              Wat Ro-flow niet doet
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-white border border-red-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    Ro-flow doet niet
                  </h3>
                  <ul className="space-y-3">
                    {whatWeDoNot.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground/70 text-sm">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white border border-primary/20 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    Wat Ro-flow wél doet
                  </h3>
                  <ul className="space-y-3">
                    {whatWeDo.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground/70 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 p-6 bg-coral/5 rounded-xl text-center border border-coral/10">
              <p className="text-foreground font-bold">
                AI adviseert – de behandelaar beslist en blijft verantwoordelijk.
              </p>
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Self-learning & Updates - City aerial background with white cards */}
      <section className="relative py-20">
        <div className="absolute inset-0">
          <img src={CITY_AERIAL} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0D1A3B]/55" />
        </div>
        <div className="container relative z-10">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl text-white text-center tracking-tight mb-4">
              Altijd actueel, collectief onderhouden
            </h2>
            <p className="text-base text-center text-white/70 mb-6">
              Ro-flow werkt met een gelaagde kennisbank die automatisch wordt bijgewerkt op basis van landelijke, provinciale, regionale en gemeentelijke bronnen. Gemeenten hoeven zelf geen acties te ondernemen om de kennisbank actueel te houden. Het wordt wel aangeraden om de kennisbank aan te vullen met beleid welke niet in deze bronnen staat, denk aan beleid voor het splitsen van woningen, beleid op het gebied van huisvesting van (arbeids)migranten, parkeerbeleid, recreatiebeleid, etc.
            </p>


            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
                    <RefreshCw className="w-6 h-6 text-coral" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Dagelijkse Updates</h3>
                  <p className="text-foreground/70 text-sm mb-4">
                    Elke nacht doorzoekt een geautomatiseerde crawler alle relevante bronnen: Overheid.nl, Ruimtelijkeplannen.nl, Wetten.overheid.nl en gemeentelijke websites. Nieuwe regelgeving wordt automatisch verwerkt.
                  </p>
                  <ul className="space-y-2">
                    {["Omgevingswet wijzigingen", "Provinciale verordeningen", "Gemeentelijk beleid", "Waterschap-, VR- en recreatieschapregels"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                        <Check className="w-4 h-4 text-coral flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-coral" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Zelflerend Systeem</h3>
                  <p className="text-foreground/70 text-sm mb-4">
                    Het systeem leert van feedback en wordt slimmer naarmate meer gemeenten het gebruiken. Oude versies van beleidsdocumenten worden automatisch op "vervallen" gezet wanneer nieuwe versies beschikbaar komen.
                  </p>
                  <ul className="space-y-2">
                    {["Feedback van behandelaars", "Gedeelde kennislagen", "Versiebeheer beleidsdocumenten", "Schaalvoordeel tussen gemeenten"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                        <Check className="w-4 h-4 text-coral flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Layered Knowledge Base */}
            <Card className="mt-8 bg-white/95 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-coral" />
                  Gelaagde Kennisbank
                </h4>
                <p className="text-sm text-foreground/70 mb-4">
                  De kennisbank is opgebouwd uit lagen die automatisch worden gedeeld tussen gemeenten in dezelfde regio:
                </p>
                <div className="grid sm:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: "Rijks", sub: "Wetten en rijksbeleid zoals de Nota Ruimte" },
                    { label: "Provinciaal", sub: "Per provincie" },
                    { label: "Regionaal", sub: "Waterschap, VR, OD, Recreatieschap" },
                    { label: "Gemeente", sub: "Lokaal beleid" },
                  ].map((layer, i) => (
                    <div key={i} className="p-3 bg-coral/5 rounded-lg text-center border border-coral/10">
                      <div className="font-bold text-coral">{layer.label}</div>
                      <div className="text-xs text-foreground/60">{layer.sub}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-foreground/60 mt-4">
                  Als gemeente Hoorn live gaat, profiteren alle West-Friese gemeenten automatisch van de gedeelde regionale kennis.
                </p>
              </CardContent>
            </Card>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Aanmelden als pilotgemeente */}
      <section id="pilot-signup" className="py-20 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl text-foreground text-center tracking-tight mb-6">
              Aanmelden als pilotgemeente
            </h2>
            <div className="mb-10 rounded-xl overflow-hidden shadow-lg">
              <img src={TEAMWORK} alt="Samenwerking met gemeenten" className="w-full h-64 object-cover" />
            </div>
<p className="text-base text-foreground/80 leading-relaxed mb-4 text-left max-w-2xl mx-auto">
               Als pilotgemeente neemt u deel aan een tijdelijke testfase waarin Ro-flow in de gemeentelijke praktijk wordt ingezet en geëvalueerd. Het doel van de pilot is om samen te toetsen of en hoe Ro-flow bijdraagt aan een zorgvuldiger, efficiënter en juridisch robuuster vergunningverleningsproces onder de Omgevingswet. Deelname aan de pilot is geheel gratis.
             </p>
             <p className="text-sm text-foreground/60 leading-relaxed mb-10 text-center max-w-2xl mx-auto italic">
               De meeste pilotgemeenten starten met 5–10 dossiers en 1 of 2 behandelaars.
             </p>

            <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 mb-12">
              {/* Wat vraagt deelname */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Wat vraagt deelname?</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Beperkte inzet</p>
                    <p className="text-sm text-foreground/70">Geen IT-traject, geen koppeling met zaaksystemen. De applicatie wordt gebruikt naast de bestaande werkwijze.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Selectie van dossiers</p>
                    <p className="text-sm text-foreground/70">U bepaalt zelf voor welke typen aanvragen Ro-flow wordt ingezet. De pilot kan starten met een beperkt aantal dossiers of gebruikers.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Feedback en evaluatie</p>
                    <p className="text-sm text-foreground/70">Wij vragen periodiek feedback op bruikbaarheid, juridische onderbouwing en aansluiting bij de gemeentelijke werkwijze.</p>
                  </div>
                </div>
              </div>

              {/* Wat blijft ongewijzigd */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Wat blijft ongewijzigd?</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Menselijke regie</p>
                    <p className="text-sm text-foreground/70">Ro-flow neemt geen besluiten. De behandelaar blijft volledig verantwoordelijk voor de beoordeling en het besluit.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Juridische verantwoordelijkheid</p>
                    <p className="text-sm text-foreground/70">De gemeente blijft eigenaar van alle dossiers. Elk advies is herleidbaar tot de gebruikte bronregel. Geen geautomatiseerde besluitvorming (art. 22 AVG).</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Dataveiligheid en AVG</p>
                    <p className="text-sm text-foreground/70">Beveiligde API-verbindingen, geen modeltraining op aanvraagdocumenten, verwerkersovereenkomst beschikbaar.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Wat levert het op */}
            <div className="mb-10">
              <h3 className="text-lg font-semibold text-foreground mb-4">Wat levert deelname op?</h3>
              <ul className="grid sm:grid-cols-2 gap-3">
                {[
                  "Inzicht in de toegevoegde waarde van AI-ondersteuning in de vergunningverlening",
                  "Ervaring met een systeem dat is ontworpen vanuit publieke waarden",
                  "Directe invloed op de doorontwikkeling van Ro-flow",
                  "Bijdrage aan een gedeelde oplossing voor capaciteitsdruk in het fysieke domein"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                    <Check className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Duur */}
            <p className="text-sm text-foreground/60 text-center mb-10">
              De pilot loopt standaard 6 maanden. Deelname is vrijblijvend en kan tussentijds worden beëindigd. Er zijn geen verplichtingen tot afname na afloop.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pilot">
                <Button size="lg" className="bg-coral hover:bg-coral-dark text-white rounded-lg px-8 h-14 text-base font-bold shadow-lg">
                  Aanmelden als pilotgemeente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="mailto:info@ro-flow.nl?subject=Vraag%20over%20pilotdeelname%20Ro-flow">
                <Button size="lg" variant="outline" className="rounded-lg px-8 h-14 text-base font-bold border-2 border-foreground/20 text-foreground hover:bg-foreground/5">
                  Stel een vraag
                </Button>
              </a>
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>



      {/* Verantwoorde AI & AVG - Korte verwijzing */}
      <section className="py-16 bg-[#0D1A3B]">
        <div className="container">
          <FadeInSection>
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-coral/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-7 h-7 text-coral" />
            </div>
            <h2 className="text-3xl md:text-4xl text-white tracking-tight mb-4">
              Verantwoorde AI en AVG
            </h2>
            <p className="text-white/70 mb-4">
              Transparant in werking, uitlegbaar in uitkomst en zorgvuldig in gebruik. Gebouwd volgens de principes van verantwoorde AI en volledig AVG-conform.
            </p>
            <p className="text-white/50 text-sm mb-8">
              Geen modeltraining op aanvraagdocumenten. Geen geautomatiseerde besluitvorming. Verwerkersovereenkomst beschikbaar.
            </p>
            <Link href="/verantwoorde-ai">
              <Button size="lg" variant="outline" className="rounded-lg px-8 h-14 text-base font-bold border-2 border-white/40 text-white hover:bg-white/10">
                Lees meer over privacy en beveiliging
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* FAQ - Light background */}
      <section id="faq" className="py-20 bg-secondary/40">
        <div className="container">
          <FadeInSection>
          <h2 className="text-3xl md:text-4xl text-foreground text-center tracking-tight mb-12">
            Veelgestelde vragen
          </h2>

          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-white border border-border overflow-hidden">
                <CardContent className="p-0">
                  <button
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-coral/5 transition-colors"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="font-bold text-foreground">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-coral transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-200 ${openFaq === index ? 'max-h-96' : 'max-h-0'}`}>
                    <div 
                      className="px-6 pb-6 text-foreground/70"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </FadeInSection>
        </div>
      </section>



      {/* Footer */}
      <Footer />
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Check,
  ChevronDown,
  X,
  Menu,
  MapPin,
  Layers,
  Brain,
  FileText,
  Shield,
  Zap,
  Clock,
  Users,
  Building2,
  TreePine,
  Droplets,
  Volume2,
  AlertTriangle,
  Castle,
  Wheat,
  Construction,
  Mountain,
  Heart,
  Upload,
  Search,
  Filter,
  BarChart3,
  Target,
  CheckCircle2,
  Eye,
  Radar,
  BookOpen
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Footer } from "@/components/Footer";
import { FadeInSection } from "@/components/FadeInSection";

// CDN image URLs
const HERO_MAP = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/omgevingsscan-hero-map-4kx4vDKvcBzMLPCCbe5iMg.webp";
const INDICATORS_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/omgevingsscan-indicators-DE5XkXpkAoJXnHp5N6XQP5.webp";
const PIPELINE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/omgevingsscan-pipeline-VKmNmqiektYg7gVvoC8EaU.webp";
const MAP_DETAIL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/omgevingsscan-map-detail-FBeuvoZVAisQvHBwtqJfwj.webp";
const CITY_AERIAL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-city-aerial-ihbE8ieaaEzrSXDnse5Fcp.webp";
const NEIGHBORHOOD = "https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/roflow-neighborhood-aerial-RWcSWumGe6juTqWPLJ2K8e.webp";

export default function OmgevingsscanHome() {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const getDashboardUrl = () => {
    if (!user) return "/admin";
    if (user.role === 'super_admin' || user.role === 'admin') return "/admin";
    if (user.role === 'gemeente_beheerder') return "/beheerder";
    return "/gebruiker";
  };

  const indicatorCategories = [
    {
      name: "Natuur",
      icon: TreePine,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      count: 12,
      examples: ["Natura 2000", "NNN / EHS", "Nationale parken", "Weidevogelgebieden", "Bomen- en groenbeleid", "Soortenbescherming"]
    },
    {
      name: "Water",
      icon: Droplets,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      count: 11,
      examples: ["Waterkeringen", "Overstromingsrisico", "Grondwaterbescherming", "Waterkwaliteit", "Drinkwaterwinning", "Keur waterschap"]
    },
    {
      name: "Geluid & Milieu",
      icon: Volume2,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      count: 10,
      examples: ["Geluidzones industrie", "Geluidzones weg/rail", "Bodemverontreiniging", "Luchtkwaliteit", "Stiltegebieden", "Geurcontouren"]
    },
    {
      name: "Externe veiligheid",
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      count: 8,
      examples: ["Bevi-inrichtingen", "Buisleidingen", "Risicocontouren", "LPG-tankstations", "Basisnet vervoer", "Vuurwerkopslagplaatsen"]
    },
    {
      name: "Cultuurhistorie",
      icon: Castle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      count: 10,
      examples: ["Rijksmonumenten", "Gemeentelijke monumenten", "Beschermde stadsgezichten", "Archeologische verwachting", "Cultuurlandschappen", "UNESCO-erfgoed"]
    },
    {
      name: "Landbouw",
      icon: Wheat,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
      borderColor: "border-amber-600/30",
      count: 8,
      examples: ["Gewaspercelen", "Geurcontouren veehouderij", "Glastuinbouw", "Agrarisch natuurbeheer", "Mestverwerking", "Landbouwstructuur"]
    },
    {
      name: "Infrastructuur",
      icon: Construction,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/30",
      count: 10,
      examples: ["Hoogspanningsleidingen", "Gasleidingen", "Spoorwegen", "Rijkswegen", "Vliegvelden", "Telecommasten"]
    },
    {
      name: "Landschap",
      icon: Mountain,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
      borderColor: "border-teal-500/30",
      count: 6,
      examples: ["Beschermde landschappen", "Nationale landschappen", "Openheid", "Zichtlijnen", "Landschapstypen", "Aardkundige waarden"]
    },
    {
      name: "Gezondheid & Overig",
      icon: Heart,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/30",
      count: 15,
      examples: ["Radarstations", "Militaire zones", "Luchtvaart", "Zonering windturbines", "Zonneparken", "Gezonde leefomgeving"]
    }
  ];

  const pipelineSteps = [
    { step: 1, title: "Upload DSO-bestand", description: "Sleep het zipbestand van het Omgevingsloket naar het scherm", icon: Upload },
    { step: 2, title: "Locatie extraheren", description: "Automatisch het adres en de coördinaten uit de aanvraag halen", icon: MapPin },
    { step: 3, title: "Kaartlagen laden", description: "Alle relevante PDOK- en WMS-lagen worden op de kaart geprojecteerd", icon: Layers },
    { step: 4, title: "Indicatoren controleren", description: "90+ indicatoren worden getoetst tegen de locatie", icon: CheckCircle2 },
    { step: 5, title: "Relevantie filteren", description: "Alleen de indicatoren die relevant zijn voor deze aanvraag worden geselecteerd", icon: Filter },
    { step: 6, title: "AI-analyse", description: "LLM genereert een toelichting per relevante indicator", icon: Brain },
    { step: 7, title: "Narratief genereren", description: "Een samenhangende analyse van de ruimtelijke context", icon: FileText },
    { step: 8, title: "PDF-rapport", description: "Compleet rapport met kaart, indicatoren en toelichting", icon: BarChart3 },
  ];

  const benefits = [
    { icon: Eye, title: "Niets over het hoofd zien", description: "90+ indicatoren worden automatisch gecontroleerd. Geen handmatig zoeken meer in tientallen kaartlagen." },
    { icon: Zap, title: "Binnen seconden", description: "De volledige ruimtelijke context van een locatie is direct beschikbaar na het uploaden van een DSO-bestand." },
    { icon: Shield, title: "Betrouwbare bronnen", description: "Alle data komt rechtstreeks van PDOK, BAG, Ruimtelijkeplannen.nl en andere officiële overheidsbronnen." },
    { icon: Target, title: "Relevantie-filter", description: "Niet alle 90 indicatoren zijn relevant. De AI filtert automatisch op basis van locatie, activiteit en context." },
  ];

  const faqs = [
    { question: "Wat is het verschil met Ro-flow?", answer: "Ro-flow richt zich op het volledige behandelrapport voor omgevingsvergunningen, inclusief juridische toetsing, kennisbank en adviseursoverzicht. De Omgevingsscan focust specifiek op de ruimtelijke context: een interactieve kaart met alle relevante omgevingsindicatoren. Beide tools vullen elkaar aan." },
    { question: "Welke databronnen worden gebruikt?", answer: "De Omgevingsscan haalt data op van PDOK (luchtfoto's, topografie, bestuurlijke grenzen), BAG (gebouwen, adressen), Ruimtelijkeplannen.nl (bestemmingsplannen, omgevingsplannen), AERIUS (stikstof), en diverse WMS/WFS-diensten voor natuur, water, milieu en veiligheid." },
    { question: "Hoe actueel is de data?", answer: "De kaartlagen worden real-time opgehaald van de officiële bronnen. Dit betekent dat u altijd de meest actuele data ziet. Er is geen vertraging door handmatige updates." },
    { question: "Is het AVG-proof?", answer: "Ja. Aanvraagdocumenten worden verwerkt via beveiligde API-verbindingen en worden niet permanent opgeslagen. De gemeente blijft eigenaar van alle data. Strikte data-isolatie: elke gemeente heeft uitsluitend toegang tot eigen dossiers." },
    { question: "Hoe snel zijn we live?", answer: "Binnen 1 dag. Geen IT-traject, geen installatie. U krijgt direct toegang tot het dashboard en kunt meteen beginnen met het uploaden van DSO-bestanden." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="/ro-flow-logo.png" alt="Omgevingsscan" className="h-14 w-auto" />
            <span className="text-sm font-bold text-coral bg-coral/10 px-2 py-0.5 rounded">SCAN</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#waarom" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Waarom</a>
            <a href="#kaart" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">De kaart</a>
            <a href="#indicatoren" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Indicatoren</a>
            <a href="#hoe-het-werkt" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Hoe het werkt</a>
            <a href="#pilot-signup" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Pilot</a>
            <Link href="/faq" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
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
              <a href="#kaart" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">De kaart</a>
              <a href="#indicatoren" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Indicatoren</a>
              <a href="#hoe-het-werkt" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Hoe het werkt</a>
              <a href="#pilot-signup" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">Pilot</a>
              <Link href="/faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors py-2">FAQ</Link>
              <div className="border-t border-border/30 pt-3 mt-1 flex flex-col gap-2">
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

      {/* Hero Section */}
      <section className="relative">
        <div className="w-full">
          <img 
            src={HERO_MAP}
            alt="Interactieve omgevingskaart met indicatoren"
            className="w-full h-[320px] md:h-[420px] lg:h-[500px] object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D1A3B]/60 via-[#0D1A3B]/30 to-transparent h-[320px] md:h-[420px] lg:h-[500px]" />
        </div>
        
        <div className="bg-[#0D1A3B] py-12 md:py-16">
          <div className="container">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-[3.5rem] font-semibold text-white leading-[1.15] tracking-tight mb-6">
                De volledige ruimtelijke context in één oogopslag
              </h1>
              <p className="text-lg text-white/90 mb-4 leading-relaxed max-w-xl font-medium">
                De Omgevingsscan analyseert automatisch 90+ omgevingsindicatoren en toont de volledige ruimtelijke context op een interactieve kaart — direct na het uploaden van een DSO-bestand.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <Link href="/pilot">
                  <Button size="lg" className="bg-coral hover:bg-coral-dark text-white rounded-lg px-8 h-13 text-base font-bold border-2 border-coral shadow-lg">
                    Aanmelden als pilotgemeente
                  </Button>
                </Link>
                <Link href="/omgevingsscan/dashboard">
                  <Button size="lg" className="bg-white hover:bg-white/90 text-[#0D1A3B] rounded-lg px-8 h-13 text-base font-bold shadow-lg">
                    <MapPin className="w-5 h-5 mr-2" />
                    Open Scan Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="py-12 bg-white border-b border-border/30">
        <div className="container">
          <FadeInSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: "90+", label: "Omgevingsindicatoren" },
              { value: "9", label: "Categorieën" },
              { value: "30+", label: "Kaartlagen" },
              { value: "<10s", label: "Analysetijd" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-coral mb-1">{stat.value}</div>
                <div className="text-sm text-foreground/60 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Waarom section */}
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
                  Waarom de Omgevingsscan?
                </h2>
                
                <p className="text-sm text-foreground/75 leading-relaxed mb-8">
                  Bij de beoordeling van een omgevingsvergunning moet de vergunningverlener rekening houden met tientallen omgevingsfactoren: van Natura 2000-gebieden en waterkeringen tot geluidzones, bodemverontreiniging en externe veiligheid. Deze informatie is verspreid over tientallen kaartviewers, databases en beleidsdocumenten. De Omgevingsscan brengt al deze informatie samen op één interactieve kaart en signaleert automatisch welke indicatoren relevant zijn voor de specifieke locatie en aanvraag.
                </p>

                <div className="grid sm:grid-cols-2 gap-6">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="w-5 h-5 text-coral" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm mb-1">{benefit.title}</h3>
                        <p className="text-sm text-foreground/60 leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* De Kaart section */}
      <section id="kaart" className="py-20 bg-[#0D1A3B]">
        <div className="container">
          <FadeInSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl text-white tracking-tight mb-4">
                De interactieve kaart
              </h2>
              <p className="text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
                Een volledig GIS-dashboard met luchtfoto's, bestemmingsplannen, omgevingsplannen en tientallen thematische kaartlagen — allemaal op één plek.
              </p>
            </div>

            <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 mb-10">
              <img 
                src={MAP_DETAIL} 
                alt="Interactieve kaart met omgevingslagen" 
                className="w-full h-auto"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Layers, title: "30+ kaartlagen", description: "Van PDOK luchtfoto's en BGT tot Natura 2000, waterkeringen en geluidzones. Alles in- en uitschakelbaar." },
                { icon: MapPin, title: "Automatische locatie", description: "Het adres wordt automatisch uit het DSO-bestand gehaald. De kaart centreert direct op de juiste locatie." },
                { icon: Brain, title: "AI-toelichting", description: "Per relevante indicator genereert de AI een korte, begrijpelijke toelichting over de impact op de aanvraag." },
              ].map((feature, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-coral/20 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-coral" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Indicatoren section */}
      <section id="indicatoren" className="py-20 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl text-foreground tracking-tight mb-4">
                90+ omgevingsindicatoren
              </h2>
              <p className="text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                Verdeeld over 9 categorieën. Elke indicator wordt automatisch getoetst tegen de locatie van de aanvraag. Alleen relevante indicatoren worden getoond.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicatorCategories.map((cat, i) => (
                <Card key={i} className={`border ${cat.borderColor} hover:shadow-lg transition-shadow`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                        <cat.icon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>
                        <span className="text-xs text-foreground/50">{cat.count} indicatoren</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.examples.map((ex, j) => (
                        <span key={j} className="text-xs bg-muted text-foreground/60 px-2 py-0.5 rounded-full">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/omgevingsscan/indicatoren" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B4D3E] text-white rounded-xl hover:bg-[#2d7a63] transition-colors font-semibold text-sm shadow-lg hover:shadow-xl">
                <BookOpen className="h-4 w-4" />
                Bekijk alle indicatoren met wettelijke grondslag
              </Link>
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Hoe het werkt - Pipeline */}
      <section id="hoe-het-werkt" className="relative py-20">
        <div className="absolute inset-0">
          <img src={NEIGHBORHOOD} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0D1A3B]/50" />
        </div>
        <div className="container relative z-10">
          <FadeInSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl text-white tracking-tight mb-4">
                Hoe het werkt
              </h2>
              <p className="text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
                Van DSO-upload tot compleet rapport in 8 stappen. Volledig geautomatiseerd.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pipelineSteps.map((step, i) => (
                <Card key={i} className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-coral text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {step.step}
                      </div>
                      <step.icon className="w-5 h-5 text-foreground/40" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-foreground/60 leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 rounded-xl overflow-hidden shadow-2xl max-w-4xl mx-auto">
              <img 
                src={PIPELINE_IMG} 
                alt="Analyse pipeline van de Omgevingsscan" 
                className="w-full h-auto"
              />
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Databronnen */}
      <section className="py-20 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl text-foreground tracking-tight mb-4">
                Officiële databronnen
              </h2>
              <p className="text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                Alle data wordt real-time opgehaald van officiële overheidsbronnen. Geen handmatige invoer, altijd actueel.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "PDOK", description: "Luchtfoto's, topografie, bestuurlijke grenzen, BGT, BRT", color: "border-blue-500/30" },
                { name: "BAG", description: "Basisregistratie Adressen en Gebouwen — panden, verblijfsobjecten", color: "border-green-500/30" },
                { name: "Ruimtelijkeplannen.nl", description: "Bestemmingsplannen, omgevingsplannen, structuurvisies", color: "border-purple-500/30" },
                { name: "AERIUS", description: "Stikstofberekeningen en depositiewaarden", color: "border-yellow-500/30" },
                { name: "DSO / Omgevingsloket", description: "Aanvraaggegevens, activiteiten, locatie-informatie", color: "border-orange-500/30" },
                { name: "Diverse WMS/WFS", description: "Natura 2000, waterkeringen, geluidzones, externe veiligheid", color: "border-red-500/30" },
              ].map((source, i) => (
                <Card key={i} className={`border ${source.color}`}>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground text-sm mb-1">{source.name}</h3>
                    <p className="text-xs text-foreground/60 leading-relaxed">{source.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Pilot section */}
      <section id="pilot-signup" className="py-20 bg-[#0D1A3B]">
        <div className="container">
          <FadeInSection>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl text-white tracking-tight mb-6">
              Word pilotgemeente
            </h2>
            <p className="text-base text-white/80 leading-relaxed mb-4 text-left">
              Als pilotgemeente neemt u deel aan een tijdelijke testfase waarin de Omgevingsscan in de gemeentelijke praktijk wordt ingezet en geëvalueerd. Het doel van de pilot is om samen te toetsen of en hoe de Omgevingsscan bijdraagt aan een zorgvuldiger en efficiënter vergunningverleningsproces onder de Omgevingswet. Deelname aan de pilot is geheel gratis.
            </p>
            <p className="text-sm text-white/50 italic mb-8 text-left">
              De meeste pilotgemeenten starten met 5–10 dossiers om het systeem te evalueren.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/pilot">
                <Button size="lg" className="bg-coral hover:bg-coral-dark text-white rounded-lg px-8 h-13 text-base font-bold border-2 border-coral shadow-lg">
                  Aanmelden als pilotgemeente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 rounded-lg px-8 h-13 text-base font-bold">
                  Plan een demonstratie
                </Button>
              </Link>
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* FAQ section */}
      <section className="py-20 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl text-foreground tracking-tight mb-8 text-center">
              Veelgestelde vragen
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <Card key={i} className="border border-border/50">
                  <button
                    className="w-full p-5 flex items-center justify-between text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-foreground text-sm pr-4">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-foreground/40 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-sm text-foreground/60 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}

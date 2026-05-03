import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, 
  Brain, 
  Scale, 
  Check, 
  ArrowLeft,
  Lock,
  Eye,
  Users,
  FileText,
  Database,
  Cpu,
  AlertTriangle
} from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/Footer";
import { FadeInSection } from "@/components/FadeInSection";

export default function VerantwoordeAI() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src="/ro-flow-logo.png" alt="Ro-flow" className="h-14 w-auto" />
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Home</Link>
            <Link href="/#features" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">Features</Link>
            <Link href="/faq" className="text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-coral transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="text-sm font-bold text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar home
              </Button>
            </Link>
            <Link href="/pilot">
              <Button className="bg-coral hover:bg-coral-dark text-white rounded-lg px-5 text-sm font-bold border-2 border-coral">
                Aanmelden als pilotgemeente
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#0D1A3B] py-14">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-coral/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-coral" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
              Verantwoorde AI en AVG
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Ro-flow is gebouwd volgens de principes van verantwoorde AI zoals omschreven in de overheidsbrede handreiking generatieve AI. Transparant in werking, uitlegbaar in uitkomst en zorgvuldig in gebruik.
            </p>
          </div>
        </div>
      </section>

      {/* Uitgangspunten */}
      <section className="py-10 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-5">
              Onze uitgangspunten
            </h2>
            
            <div className="space-y-4 mb-8">
              <p className="text-base text-foreground/80 leading-relaxed">
                De uitgangspunten sluiten nauw aan bij de ambities uit de <strong>Digitale Agenda 2028</strong>, waarin publieke waarden, transparantie en menselijke regie centraal staan bij de inzet van digitalisering en AI.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                De <strong>VNG-strategie</strong> voor gemeentelijke digitalisering benadrukt dat AI-toepassingen binnen de overheid moeten voldoen aan hoge eisen van transparantie, uitlegbaarheid en menselijke controle. Ro-flow is vanuit deze principes ontworpen: elk advies is herleidbaar tot de bronregel, de behandelaar houdt volledige regie en het systeem maakt geen autonome besluiten.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-8">
              {[
                { icon: Eye, title: "Transparant", description: "Elk rapport is voorzien van expliciete bron- en artikelverwijzingen. De behandelaar kan direct verifiëren op welke wettelijke grondslag het advies is gebaseerd." },
                { icon: Brain, title: "Uitlegbaar", description: "De werkwijze van het systeem is navolgbaar: van planologische toets via procedureduiding tot het uiteindelijke behandelrapport. Geen black box." },
                { icon: Users, title: "Menselijke regie", description: "Ro-flow neemt geen besluiten. De behandelaar behoudt altijd de volledige verantwoordelijkheid voor de beoordeling en het besluit." },
              ].map((item, i) => (
                <Card key={i} className="bg-secondary/30 border-0">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-coral" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* AVG & Gegevensbescherming */}
      <section className="py-10 bg-secondary/20">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
                <Scale className="w-6 h-6 text-coral" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                AVG en gegevensbescherming
              </h2>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { title: "Eigenaarschap", text: "De gemeente blijft eigenaar van alle data en dossiers. Er vindt geen overdracht van gegevens plaats." },
                { title: "Geen modeltraining", text: "Aanvraagdocumenten worden niet gebruikt voor het trainen of verbeteren van AI-modellen." },
                { title: "Verwerkersovereenkomst", text: "Een verwerkersovereenkomst is beschikbaar conform gemeentelijke standaarden en de AVG." },
                { title: "Data-isolatie", text: "Strikte data-isolatie: elke gemeente heeft uitsluitend toegang tot eigen dossiers en gegevens." },
                { title: "Beveiligde verwerking", text: "Verwerking vindt plaats via beveiligde API-verbindingen. Geen permanente opslag buiten de gemeentelijke omgeving." },
                { title: "Geen geautomatiseerde besluitvorming", text: "Ro-flow voert geen geautomatiseerde besluitvorming uit in de zin van artikel 22 AVG. Elk rapport is bedoeld als ondersteuning, niet als bindend advies." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-foreground/70">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Menselijke controle */}
      <section className="py-10 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
                <Brain className="w-6 h-6 text-coral" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Menselijke controle
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {[
                { icon: Users, title: "De behandelaar beslist altijd", text: "Ro-flow genereert een behandelrapport ter ondersteuning. De vergunningverlener behoudt volledige regie over de beoordeling en het uiteindelijke besluit." },
                { icon: FileText, title: "Ondersteuning, geen eindoordeel", text: "Elk rapport is bedoeld als hulpmiddel bij de eerste beoordeling. Het vervangt niet het vakmanschap en de oordeelsvorming van de behandelaar." },
                { icon: Eye, title: "Herleidbaar en controleerbaar", text: "Elk advies is voorzien van expliciete bron- en artikelverwijzingen. De behandelaar kan direct verifiëren op welke grondslag het advies is gebaseerd." },
                { icon: Lock, title: "Feedbackmogelijkheid", text: "Op elk onderdeel van het rapport kan de behandelaar feedback geven. Deze feedback wordt gebruikt om het systeem gericht te verbeteren." },
              ].map((item, i) => (
                <Card key={i} className="bg-secondary/30 border-0">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5 text-coral" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Transparantie van het model */}
      <section className="py-10 bg-secondary/20">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-coral" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Transparantie van het model
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-base text-foreground/80 leading-relaxed">
                Een veelgestelde vraag bij AI-toepassingen in de overheid is: <strong>welk model wordt gebruikt, hoe werkt het, en is de uitkomst uitlegbaar?</strong> Ro-flow is ontworpen om op elk van deze vragen een helder antwoord te geven.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { title: "Geen training op aanvraagdocumenten", text: "Het AI-model wordt niet getraind of gefinetuned op ingediende aanvraagdocumenten. Documenten worden uitsluitend verwerkt binnen de analysecyclus en daarna niet bewaard voor modelverbetering." },
                { title: "Uitlegbare stappen", text: "Het behandelrapport is opgebouwd uit afzonderlijke, navolgbare stappen: van locatieanalyse via planologische toets tot procedureduiding. Elke stap is herleidbaar tot een concrete bron of regel." },
                { title: "Bronverwijzingen bij elke conclusie", text: "Elke conclusie in het rapport is voorzien van expliciete verwijzingen naar wetsartikelen, planregels of beleidsdocumenten. De behandelaar kan direct verifiëren waarop een uitkomst is gebaseerd." },
                { title: "Geen black box", text: "Het systeem maakt geen onverklaarbare sprongen. De werkwijze is transparant: welke data is opgehaald, welke regels zijn getoetst, en welke bronnen zijn gebruikt — alles is inzichtelijk." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-foreground/70">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Foutmarge en aansprakelijkheid */}
      <section className="py-10 bg-white">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-coral" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Foutmarge en aansprakelijkheid
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-base text-foreground/80 leading-relaxed">
                Geen enkel systeem is foutloos. Ro-flow is ontworpen met het besef dat fouten kunnen voorkomen, en dat de verantwoordelijkheid voor het besluit altijd bij de behandelaar ligt.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {[
                { icon: FileText, title: "Expliciete scope-afbakening", text: "Elk behandelrapport bevat een sectie 'Niet getoetst / buiten scope' waarin expliciet wordt vermeld welke onderdelen niet zijn meegenomen in de analyse. De behandelaar weet daarmee wat wél en wat niet is getoetst." },
                { icon: Users, title: "Behandelaar blijft verantwoordelijk", text: "Ro-flow is een ondersteunend hulpmiddel. De behandelaar is en blijft formeel verantwoordelijk voor de beoordeling en het besluit. Het rapport vervangt niet het vakmanschap van de vergunningverlener." },
                { icon: Eye, title: "Controleerbaarheid", text: "Door de expliciete bronverwijzingen kan de behandelaar elke conclusie verifiëren. Bij twijfel kan de behandelaar afwijken van het rapport — het systeem blokkeert dit niet en moedigt eigen oordeelsvorming aan." },
                { icon: Lock, title: "Feedbackloop", text: "Wanneer een behandelaar een fout constateert, kan dit direct worden teruggekoppeld via het feedbacksysteem. Deze terugkoppeling wordt gebruikt om het systeem gericht te verbeteren." },
              ].map((item, i) => (
                <Card key={i} className="bg-secondary/30 border-0">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5 text-coral" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="p-5 bg-coral/5 rounded-xl border border-coral/15">
              <p className="text-sm text-foreground/70 leading-relaxed">
                <strong className="text-foreground">Disclaimer:</strong> Ro-flow is een hulpmiddel ter ondersteuning van de eerste beoordeling van omgevingsvergunningen. Het systeem genereert geen besluiten, adviezen of bindende uitspraken. De behandelaar is te allen tijde verantwoordelijk voor de inhoudelijke beoordeling en het uiteindelijke besluit.
              </p>
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* Technische beveiliging */}
      <section className="py-10 bg-secondary/20">
        <div className="container">
          <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-coral" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Technische beveiliging
              </h2>
            </div>

            <div className="space-y-4">
              {[
                "Alle communicatie verloopt via versleutelde verbindingen (TLS/HTTPS)",
                "Authenticatie via OAuth 2.0 met rolgebaseerde toegangscontrole",
                "Gelaagde kennisbank met strikte scheiding tussen gemeentelijke, regionale en landelijke data",
                "Geen permanente opslag van aanvraagdocumenten buiten de verwerkingscyclus",
                "Regelmatige beveiligingsaudits en penetratietests",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-sm text-foreground/70">{item}</p>
                </div>
              ))}
            </div>
          </div>
          </FadeInSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 bg-[#0D1A3B]">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Vragen over privacy of beveiliging?
            </h2>
            <p className="text-white/70 mb-8">
              Neem contact met ons op voor meer informatie over onze beveiligingsmaatregelen, de verwerkersovereenkomst of een Data Protection Impact Assessment (DPIA).
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:info@ro-flow.nl?subject=Vraag%20over%20privacy%20en%20beveiliging%20Ro-flow">
                <Button size="lg" className="bg-coral hover:bg-coral-dark text-white rounded-lg px-8 h-14 text-base font-bold shadow-lg">
                  Neem contact op
                </Button>
              </a>
              <Link href="/">
                <Button size="lg" variant="outline" className="rounded-lg px-8 h-14 text-base font-bold border-2 border-white/40 text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Terug naar home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

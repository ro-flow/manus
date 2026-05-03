import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft,
  Layers,
  FileSearch,
  Scale,
  Building2,
  Landmark,
  Waves,
  Home as HomeIcon,
  BookOpen,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/Footer";
import { FadeInSection } from "@/components/FadeInSection";

export default function GelaagdeKennisbank() {
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
                Terug
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <FadeInSection>
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="container max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center">
                <Layers className="w-6 h-6 text-coral" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Waarom een gelaagde kennisbank?
              </h1>
            </div>
            <p className="text-lg text-foreground/70 leading-relaxed max-w-3xl">
              Bij omgevingsvergunningen geldt regelgeving niet automatisch of universeel. Welke regels van toepassing zijn, hangt af van de procedure, de locatie en de betrokken bestuurslagen. Beleid geldt niet altijd, uitzonderingen zijn contextafhankelijk en meerdere overheden kunnen tegelijk een rol spelen.
            </p>
            <p className="text-lg font-semibold text-coral mt-4">
              Ro-flow werkt daarom met een gelaagde kennisbank.
            </p>
          </div>
        </section>
      </FadeInSection>

      {/* De procedure bepaalt het toetsingskader */}
      <FadeInSection>
        <section className="py-16 bg-white">
          <div className="container max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                <FileSearch className="w-5 h-5 text-coral" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                De procedure bepaalt het toetsingskader
              </h2>
            </div>
            <p className="text-base text-foreground/70 mb-8 leading-relaxed">
              Ro-flow start niet met toetsen, maar met duiden:
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Welke activiteiten worden aangevraagd?",
                "Is sprake van vergunningsvrij, melding, reguliere of uitgebreide procedure?",
                "Welke adviseurs zijn daarbij verplicht of logisch (bijvoorbeeld provincie, waterschap, veiligheidsregio of welstandscommissie)?"
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-coral">{i + 1}</span>
                  </div>
                  <p className="text-base text-foreground/80 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            <Card className="border-l-4 border-l-coral bg-slate-50">
              <CardContent className="p-6">
                <p className="text-base text-foreground/80 leading-relaxed">
                  Pas nadát de procedure is vastgesteld, bepaalt Ro-flow welke regels, beleidsstukken en jurisprudentie relevant zijn.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </FadeInSection>

      {/* Regelgeving per bestuurslaag */}
      <FadeInSection>
        <section className="py-16 bg-slate-50">
          <div className="container max-w-4xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-coral" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Regelgeving per bestuurslaag
              </h2>
            </div>

            <div className="grid gap-4">
              {[
                { icon: Landmark, title: "Rijk", description: "Bbl, Bal en overige landelijke regels" },
                { icon: Building2, title: "Provincie", description: "Omgevingsverordening en instructieregels" },
                { icon: Waves, title: "Waterschap", description: "Waterkeringen, beschermingszones, afvoer" },
                { icon: HomeIcon, title: "Gemeente", description: "Omgevingsplan, beleidsregels, welstandsnota" },
                { icon: BookOpen, title: "Jurisprudentie", description: "Relevante uitspraken, contextueel toegepast" },
              ].map((layer, i) => (
                <Card key={i} className="border-none shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center flex-shrink-0">
                      <layer.icon className="w-5 h-5 text-coral" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{layer.title}</h3>
                      <p className="text-sm text-foreground/70">{layer.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-base text-foreground/70 mt-6 leading-relaxed italic">
              Niet elke laag is altijd van toepassing. Ro-flow activeert alleen de regels die in deze specifieke situatie gelden.
            </p>
          </div>
        </section>
      </FadeInSection>

      {/* Beleid alleen wanneer het van toepassing is */}
      <FadeInSection>
        <section className="py-16 bg-white">
          <div className="container max-w-4xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-coral" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Beleid alleen wanneer het van toepassing is
              </h2>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "Alleen bij een afwijking",
                "Alleen bij een BOPA",
                "Alleen bij een bepaalde procedure",
                "Of alleen binnen specifieke gebieden"
              ].map((condition, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-coral flex-shrink-0" />
                  <p className="text-base text-foreground/80">{condition}</p>
                </div>
              ))}
            </div>

            <Card className="border-l-4 border-l-coral bg-slate-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                  <p className="text-base text-foreground/80 leading-relaxed">
                    Ro-flow voorkomt dat beleid automatisch of onterecht wordt toegepast. Het systeem laat expliciet zien waarom een beleidsregel wel of niet is meegenomen in de beoordeling.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
        <section className="py-16 bg-slate-50">
          <div className="container max-w-4xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Meer weten?</h2>
            <p className="text-base text-foreground/70 mb-8">
              Bekijk hoe Ro-flow omgaat met verantwoorde AI, of meld u aan als pilotgemeente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/verantwoorde-ai">
                <Button variant="outline" className="border-coral text-coral hover:bg-coral/5">
                  Verantwoorde AI
                </Button>
              </Link>
              <Link href="/pilot">
                <Button className="bg-coral hover:bg-coral/90 text-white">
                  Aanmelden als pilotgemeente
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </FadeInSection>

      <Footer />
    </div>
  );
}

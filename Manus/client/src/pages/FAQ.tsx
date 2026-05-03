import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  // Algemeen
  {
    category: "Algemeen",
    question: "Hoe snel zijn we live?",
    answer: "Binnen 1 dag. Geen IT-traject, geen installatie, direct aan de slag."
  },
  {
    category: "Algemeen",
    question: "Wat is Ro-flow?",
    answer: "Ro-flow is een AI-behandelassistent die gemeenten helpt bij het beoordelen van omgevingsvergunningen. Het systeem analyseert automatisch DSO-aanvragen, toetst aan relevante regelgeving en genereert binnen enkele seconden een compleet behandelrapport."
  },
  {
    category: "Algemeen",
    question: "Voor wie is Ro-flow bedoeld?",
    answer: "Ro-flow is ontwikkeld voor behandelaars van omgevingsvergunningen bij gemeenten. Het ondersteunt zowel ervaren vergunningverleners als nieuwe medewerkers bij het consistent en juridisch correct beoordelen van aanvragen."
  },
  {
    category: "Algemeen",
    question: "Vervangt Ro-flow de behandelaar?",
    answer: "Nee, Ro-flow is een assistent, geen vervanging. Het systeem doet het voorwerk en genereert een concept-behandelrapport. De behandelaar blijft verantwoordelijk voor de eindcontrole en het definitieve besluit."
  },
  
  // PWA & Installatie
  {
    category: "PWA & Installatie",
    question: "Wat is een PWA?",
    answer: "PWA staat voor Progressive Web App. Dit betekent dat Ro-flow werkt als een app op je telefoon of tablet, maar geïnstalleerd wordt via de browser. Je hoeft niet naar een app store."
  },
  {
    category: "PWA & Installatie",
    question: "Hoe installeer ik Ro-flow op mijn telefoon?",
    answer: "Open ro-flow.nl in je browser (Chrome of Safari). Je krijgt automatisch een melding om de app te installeren. Klik op 'Installeren' of 'Toevoegen aan beginscherm'. De app verschijnt dan als icoon op je telefoon."
  },
  {
    category: "PWA & Installatie",
    question: "Werkt Ro-flow offline?",
    answer: "Ro-flow heeft een internetverbinding nodig voor de AI-analyse en het ophalen van actuele regelgeving. De app zelf laadt wel snel doordat veel onderdelen lokaal worden opgeslagen."
  },
  {
    category: "PWA & Installatie",
    question: "Op welke apparaten werkt Ro-flow?",
    answer: "Ro-flow werkt op alle moderne apparaten: Windows, Mac, iPhone, iPad, Android telefoons en tablets. Je hebt alleen een recente browser nodig (Chrome, Safari, Edge of Firefox)."
  },
  
  // Gebruikersportaal
  {
    category: "Gebruikersportaal",
    question: "Hoe log ik in op het gebruikersportaal?",
    answer: "Klik op 'Inloggen' rechtsboven. Je logt in met je Manus-account. Als je nog geen account hebt, wordt deze automatisch aangemaakt bij je eerste login."
  },
  {
    category: "Gebruikersportaal",
    question: "Wat kan ik doen in het gebruikersportaal?",
    answer: "In het gebruikersportaal kun je: DSO-aanvragen uploaden voor analyse, gegenereerde rapporten bekijken en downloaden, je rapportgeschiedenis inzien, en je accountinstellingen beheren."
  },
  {
    category: "Gebruikersportaal",
    question: "Hoe upload ik een DSO-aanvraag?",
    answer: "Ga naar 'Nieuwe Analyse' in het dashboard. Sleep het ZIP-bestand van de DSO-aanvraag naar het uploadgebied of klik om een bestand te selecteren. De analyse start automatisch."
  },
  {
    category: "Gebruikersportaal",
    question: "Welke bestandsformaten worden ondersteund?",
    answer: "Ro-flow accepteert ZIP-bestanden zoals je deze ontvangt vanuit het DSO (Digitaal Stelsel Omgevingswet). Het systeem herkent automatisch de aanvraagformulieren, tekeningen en bijlagen."
  },
  {
    category: "Gebruikersportaal",
    question: "Hoe lang duurt een analyse?",
    answer: "Een standaard analyse is binnen enkele seconden klaar. Bij complexe aanvragen met veel tekeningen kan dit iets langer duren. Je ziet een voortgangsbalk tijdens het wachten."
  },
  {
    category: "Gebruikersportaal",
    question: "Waar vind ik mijn eerdere rapporten?",
    answer: "Klik op 'Mijn Rapporten' in het dashboard. Hier zie je al je gegenereerde rapporten, gesorteerd op datum. Je kunt rapporten bekijken, downloaden als PDF of opnieuw versturen per email."
  },
  
  // Rapporten & Analyse
  {
    category: "Rapporten & Analyse",
    question: "Wat staat er in een behandelrapport?",
    answer: "Een behandelrapport bevat: locatieanalyse met kadastrale gegevens, proceduretype (binnenplans/BOPA), toetsing aan bestemmingsplan en omgevingsplan, volledigheidscheck, relevante beleidsstukken, en een concept-advies."
  },
  {
    category: "Rapporten & Analyse",
    question: "Hoe betrouwbaar is de AI-analyse?",
    answer: "Ro-flow gebruikt actuele data van PDOK, het Omgevingsloket en gemeentelijke kennisbanken. De AI is getraind op duizenden aanvragen. Toch blijft menselijke controle essentieel - het rapport is een startpunt, geen eindoordeel."
  },
  {
    category: "Rapporten & Analyse",
    question: "Welke regelgeving wordt getoetst?",
    answer: "Ro-flow toetst aan: het omgevingsplan/bestemmingsplan, de Omgevingswet en Bkl, provinciale verordeningen, waterschapsregels, en gemeentelijk beleid zoals welstandsnota's en parkeerbeleid."
  },
  {
    category: "Rapporten & Analyse",
    question: "Worden Natura 2000 en monumenten automatisch gedetecteerd?",
    answer: "Ja, Ro-flow controleert automatisch of de locatie in of nabij een Natura 2000-gebied, rijksmonument of beschermd stadsgezicht ligt. Dit wordt meegenomen in het rapport met bijbehorende aandachtspunten."
  },
  {
    category: "Rapporten & Analyse",
    question: "Hoe werkt de kennisbank?",
    answer: "Het systeem werkt op basis van een kennisbank die dagelijks wordt gecontroleerd op de meest recente versie van de regelgeving en beleid. De kennisbank is gelaagd en locatie-afhankelijk, zodat altijd de juiste regels worden toegepast."
  },
  
  // Account & Abonnement
  {
    category: "Account & Abonnement",
    question: "Wat kost Ro-flow?",
    answer: "De kosten worden afgestemd op uw specifieke situatie en wensen. Neem contact met ons op voor een vrijblijvende offerte. We bieden flexibele licentiemodellen voor gemeenten van elke grootte."
  },
  {
    category: "Account & Abonnement",
    question: "Hoe werkt de pilot?",
    answer: "Je kunt Ro-flow 6 maanden volledig gratis uitproberen als pilotgemeente. Geen betaalgegevens nodig, geen verplichtingen. Vul het aanvraagformulier in en je kunt direct aan de slag."
  },
  {
    category: "Account & Abonnement",
    question: "Hoeveel gebruikers kunnen er per gemeente werken?",
    answer: "Een gemeente-abonnement geeft toegang aan onbeperkt aantal behandelaars. De beheerder kan gebruikers uitnodigen via het beheerportaal."
  },
  {
    category: "Account & Abonnement",
    question: "Hoe zeg ik mijn abonnement op?",
    answer: "Ga naar 'Abonnement' in je dashboard en klik op 'Opzeggen'. Je houdt toegang tot het einde van de betaalde periode. Je rapporten blijven beschikbaar."
  },
  
  // Privacy & Beveiliging
  {
    category: "Privacy & Beveiliging",
    question: "Is het AVG-proof?",
    answer: "Ja 100%. De gemeente blijft eigenaar van data en er is geen trainingsgebruik van jouw dossiers. We voldoen volledig aan de AVG."
  },
  {
    category: "Privacy & Beveiliging",
    question: "Hoe worden mijn gegevens beschermd?",
    answer: "Alle data wordt versleuteld opgeslagen en verzonden (TLS/SSL). We voldoen aan de AVG. Aanvraaggegevens worden alleen gebruikt voor de analyse en niet gedeeld met derden."
  },
  {
    category: "Privacy & Beveiliging",
    question: "Worden aanvragen opgeslagen?",
    answer: "Ja, aanvragen en rapporten worden opgeslagen zodat je ze later kunt terugvinden. Je kunt individuele rapporten verwijderen. Bij opzegging worden alle gegevens na 30 dagen verwijderd."
  },
  {
    category: "Privacy & Beveiliging",
    question: "Wie kan mijn rapporten zien?",
    answer: "Alleen gebruikers van jouw gemeente kunnen rapporten zien. Dit maakt dossieroverdracht mogelijk als een collega afwezig is. De beheerder bepaalt wie toegang heeft."
  },
  {
    category: "Privacy & Beveiliging",
    question: "Hoe zit het met een verwerkersovereenkomst?",
    answer: "Als verwerker van persoonsgegevens namens gemeenten bieden wij een standaard verwerkersovereenkomst aan die voldoet aan alle AVG-vereisten. Deze overeenkomst regelt onder andere: de categorieën persoonsgegevens die worden verwerkt, de beveiligingsmaatregelen die wij treffen, de procedure bij datalekken, en de rechten van betrokkenen. U kunt de standaard verwerkersovereenkomst downloaden en aanpassen aan uw specifieke eisen. <a href='/verwerkersovereenkomst-template.md' target='_blank' class='text-primary hover:underline'>Download hier de Verwerkersovereenkomst Template</a>."
  },
  
  // Technische vragen
  {
    category: "Technische vragen",
    question: "De app laadt niet, wat nu?",
    answer: "Probeer de pagina te verversen (F5 of swipe naar beneden). Controleer je internetverbinding. Werkt het nog niet? Wis de cache van je browser of herinstalleer de PWA."
  },
  {
    category: "Technische vragen",
    question: "Mijn upload mislukt, wat kan ik doen?",
    answer: "Controleer of het bestand een geldig ZIP-bestand is en niet groter dan 100MB. Probeer het opnieuw met een stabiele internetverbinding. Blijft het mislukken? Neem contact op via info@ro-flow.nl."
  },
  {
    category: "Technische vragen",
    question: "Kan ik Ro-flow koppelen aan ons zaaksysteem?",
    answer: "We werken aan integraties met veelgebruikte zaaksystemen. Neem contact op voor de mogelijkheden voor jouw gemeente."
  }
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Alle");

  const categories = ["Alle", ...Array.from(new Set(faqItems.map(item => item.category)))];
  
  const filteredItems = activeCategory === "Alle" 
    ? faqItems 
    : faqItems.filter(item => item.category === activeCategory);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <img 
              src="/ro-flow-logo.png" 
              alt="Ro-flow" 
              className="h-10 w-auto cursor-pointer"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="/#hoe-het-werkt" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Hoe het werkt
            </Link>
            <Link href="/#prijzen" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Prijzen
            </Link>
            <Link href="/faq" className="text-sm font-medium text-primary transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                Inloggen
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">
                Veelgestelde vragen
              </h1>
              <p className="text-lg text-muted-foreground">
                Vind snel antwoord op je vragen over Ro-flow, de PWA en het gebruikersportaal.
              </p>
            </div>
          </div>
        </section>

        {/* Category filter */}
        <section className="py-8 border-b border-border/50">
          <div className="container">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === category
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ items */}
        <section className="py-12">
          <div className="container">
            <div className="max-w-3xl mx-auto space-y-2">
              {filteredItems.map((item, index) => {
                const globalIndex = faqItems.indexOf(item);
                const isOpen = openItems.includes(globalIndex);
                
                return (
                  <div 
                    key={globalIndex}
                    className="border border-border/50 rounded-lg overflow-hidden bg-white"
                  >
                    <button
                      onClick={() => toggleItem(globalIndex)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 pr-4">
                        <span className="text-xs font-medium text-accent uppercase tracking-wide block">
                          {item.category}
                        </span>
                        <span className="font-medium text-primary text-sm">
                          {item.question}
                        </span>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 pt-0">
                        <p 
                          className="text-muted-foreground text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: item.answer }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-primary mb-4">
                Vraag niet gevonden?
              </h2>
              <p className="text-muted-foreground mb-6">
                Neem gerust contact met ons op. We helpen je graag verder.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:info@ro-flow.nl"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
                >
                  Mail ons
                </a>
                <a 
                  href="tel:0229511911"
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-primary text-primary rounded-full font-medium hover:bg-primary/5 transition-colors"
                >
                  Bel 0229-511911
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

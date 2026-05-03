import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Voorwaarden() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold text-primary cursor-pointer">Ro-flow</span>
          </Link>
          <Link href="/">
            <span className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Terug naar home
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Algemene Voorwaarden</h1>
        <p className="text-muted-foreground mb-8">Laatst bijgewerkt: 22 januari 2026</p>

        <div className="prose prose-slate max-w-none">
          <h2>1. Definities</h2>
          <p>
            In deze algemene voorwaarden wordt verstaan onder:
          </p>
          <ul>
            <li><strong>Ro-flow</strong>: de AI-behandelassistent voor omgevingsvergunningen, aangeboden door Policy AI Assist.</li>
            <li><strong>Gebruiker</strong>: de natuurlijke of rechtspersoon die gebruik maakt van de Dienst.</li>
            <li><strong>Gemeente</strong>: de gemeentelijke organisatie die een abonnement heeft afgesloten.</li>
            <li><strong>Dienst</strong>: de Ro-flow software-as-a-service applicatie.</li>
            <li><strong>Seat</strong>: een gebruikerslicentie binnen een gemeente-abonnement.</li>
          </ul>

          <h2>2. Toepasselijkheid</h2>
          <p>
            Deze algemene voorwaarden zijn van toepassing op alle overeenkomsten tussen Ro-flow en de Gebruiker 
            betreffende het gebruik van de Dienst. Door gebruik te maken van de Dienst accepteert de Gebruiker 
            deze voorwaarden.
          </p>

          <h2>3. Pilot en Abonnement</h2>
          <p>
            Ro-flow biedt een gratis pilotperiode aan voor gemeenten. Gedurende deze periode heeft de Gebruiker 
            toegang tot alle functies van de Dienst. De duur en voorwaarden van de pilot worden in overleg bepaald.
          </p>
          <p>
            Na afloop van de pilotperiode kunnen partijen in overleg treden over een passend abonnement. 
            De kosten worden afgestemd op de specifieke situatie en wensen van de gemeente.
          </p>

          <h2>4. Betaling</h2>
          <p>
            Na de pilotperiode geschiedt betaling conform de overeengekomen voorwaarden. Facturen worden 
            digitaal verstuurd naar het opgegeven e-mailadres. Betaling dient binnen 30 dagen na factuurdatum 
            te geschieden, tenzij anders overeengekomen.
          </p>

          <h2>5. Gebruik van de Dienst</h2>
          <p>
            De Gebruiker mag de Dienst uitsluitend gebruiken voor het analyseren van omgevingsvergunning-aanvragen 
            binnen de eigen gemeentelijke organisatie. Het is niet toegestaan om:
          </p>
          <ul>
            <li>De Dienst te gebruiken voor andere doeleinden dan waarvoor deze is bedoeld</li>
            <li>Inloggegevens te delen met derden buiten de eigen organisatie</li>
            <li>De Dienst te reverse-engineeren of te kopiëren</li>
            <li>De Dienst te gebruiken op een manier die de werking kan verstoren</li>
          </ul>

          <h2>6. AI-Analyses en Aansprakelijkheid</h2>
          <p>
            De AI-analyses van Ro-flow zijn bedoeld als ondersteuning bij de beoordeling van vergunningaanvragen. 
            De analyses vormen geen juridisch advies en vervangen niet het oordeel van een gekwalificeerde 
            behandelaar.
          </p>
          <p>
            Ro-flow is niet aansprakelijk voor beslissingen die worden genomen op basis van de AI-analyses. 
            De Gebruiker blijft te allen tijde zelf verantwoordelijk voor de uiteindelijke beoordeling en 
            besluitvorming.
          </p>

          <h2>7. Privacy en Gegevensverwerking</h2>
          <p>
            Ro-flow verwerkt persoonsgegevens in overeenstemming met de Algemene Verordening Gegevensbescherming 
            (AVG). Voor meer informatie verwijzen wij naar ons <Link href="/privacy" className="text-primary hover:underline">Privacybeleid</Link>.
          </p>
          <p>
            Geüploade DSO-bestanden worden verwerkt voor analyse en worden na 90 dagen automatisch verwijderd, 
            tenzij de Gebruiker eerder om verwijdering verzoekt.
          </p>

          <h2>8. Beschikbaarheid</h2>
          <p>
            Ro-flow streeft naar een beschikbaarheid van 99,5% op jaarbasis. Gepland onderhoud wordt minimaal 
            48 uur van tevoren aangekondigd. Ro-flow is niet aansprakelijk voor schade als gevolg van 
            onbeschikbaarheid van de Dienst.
          </p>

          <h2>9. Opzegging</h2>
          <p>
            Een maandelijks abonnement kan op elk moment worden opgezegd met ingang van de volgende maand. 
            Een jaarlijks abonnement kan worden opgezegd met ingang van het volgende contractjaar.
          </p>
          <p>
            Opzegging dient schriftelijk te geschieden via e-mail naar info@ro-flow.nl of via de 
            instellingen in de applicatie.
          </p>

          <h2>10. Wijzigingen</h2>
          <p>
            Ro-flow behoudt zich het recht voor deze algemene voorwaarden te wijzigen. Wijzigingen worden 
            minimaal 30 dagen van tevoren aangekondigd via e-mail. Bij substantiële wijzigingen heeft de 
            Gebruiker het recht het abonnement kosteloos te beëindigen.
          </p>

          <h2>11. Toepasselijk Recht</h2>
          <p>
            Op deze algemene voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd 
            aan de bevoegde rechter te Amsterdam.
          </p>

          <h2>12. Contact</h2>
          <p>
            Voor vragen over deze algemene voorwaarden kunt u contact opnemen met:
          </p>
          <p>
            Policy AI Assist<br />
            E-mail: <a href="mailto:info@ro-flow.nl" className="text-primary hover:underline">info@ro-flow.nl</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Policy AI Assist. Alle rechten voorbehouden.</p>
          <div className="mt-2 space-x-4">
            <Link href="/voorwaarden" className="hover:text-foreground">Voorwaarden</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

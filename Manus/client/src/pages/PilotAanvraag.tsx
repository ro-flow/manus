import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, Users, Zap, Shield, Gift, Check, ClipboardList, MessageSquare, UserCheck, Lock, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function PilotAanvraag() {
  const [formData, setFormData] = useState({
    gemeenteNaam: "",
    contactpersoon: "",
    email: "",
    telefoon: "",
    functie: "",
    aantalSeats: "3",
    bericht: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitPilot = trpc.pilot.aanvragen.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Pilot aanvraag verzonden!");
    },
    onError: (error: { message: string }) => {
      toast.error("Er ging iets mis: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.gemeenteNaam || !formData.contactpersoon || !formData.email) {
      toast.error("Vul alle verplichte velden in");
      return;
    }

    submitPilot.mutate({
      ...formData,
      aantalSeats: parseInt(formData.aantalSeats),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex items-center justify-between h-16">
            <Link href="/">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Terug naar home</span>
              </button>
            </Link>
            <img src="/ro-flow-logo.png" alt="Ro-flow" className="h-12 w-auto" />
            <div className="w-32" />
          </div>
        </header>

        <main className="container py-16">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Welkom bij de Ro-flow Pilot!
            </h1>
            <p className="text-muted-foreground mb-4">
              Uw aanvraag is ontvangen. U ontvangt binnen enkele minuten een welkomstmail met verdere instructies.
            </p>
            <div className="bg-accent/10 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold mb-2">Wat gebeurt er nu?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> U ontvangt een welkomstmail met instructies</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> Uw {formData.aantalSeats} seats zijn 6 maanden actief</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> U kunt direct beginnen met het uploaden van DSO-aanvragen</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> Onze support staat klaar voor vragen</li>
              </ul>
            </div>
            <Link href="/">
              <Button className="bg-coral hover:bg-coral-dark text-white">
                Terug naar home
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Terug</span>
            </button>
          </Link>
          <img src="/ro-flow-logo.png" alt="Ro-flow" className="h-12 w-auto" />
          <div className="w-16" />
        </div>
      </header>

      <main className="container py-12">
        {/* Intro Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-6">
            Wat houdt deelname als pilotgemeente in?
          </h1>
          <p className="text-base text-foreground/80 leading-relaxed">
            Als pilotgemeente neemt u deel aan een tijdelijke testfase waarin Ro-flow in de gemeentelijke praktijk wordt ingezet en geëvalueerd. Het doel van de pilot is om samen te toetsen of en hoe Ro-flow bijdraagt aan een zorgvuldiger, efficiënter en juridisch robuuster vergunningverleningsproces onder de Omgevingswet. Deelname aan de pilot is geheel gratis.
          </p>
        </div>

        {/* Wat vraagt deelname */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-8">
            Wat vraagt deelname van uw organisatie?
          </h2>

          <div className="space-y-8">
            {/* Beperkte inzet */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-coral" />
                </div>
                Beperkte inzet
              </h3>
              <ul className="space-y-2 ml-10">
                <li className="text-base text-foreground/70">Deelname vereist geen uitgebreid implementatietraject of IT-project.</li>
                <li className="text-base text-foreground/70">Er is geen koppeling met bestaande zaaksystemen nodig.</li>
                <li className="text-base text-foreground/70">De applicatie wordt gebruikt naast de bestaande werkwijze.</li>
              </ul>
            </div>

            {/* Selectie van dossiers */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-coral" />
                </div>
                Selectie van dossiers
              </h3>
              <ul className="space-y-2 ml-10">
                <li className="text-base text-foreground/70">U bepaalt zelf voor welke typen aanvragen Ro-flow wordt ingezet.</li>
                <li className="text-base text-foreground/70">De pilot kan starten met een beperkt aantal dossiers of gebruikers.</li>
                <li className="text-base text-foreground/70">Er is geen verplichting om alle aanvragen via Ro-flow te behandelen.</li>
              </ul>
            </div>

            {/* Feedback en evaluatie */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-coral" />
                </div>
                Feedback en evaluatie
              </h3>
              <p className="text-base text-foreground/70 mb-3 ml-10">Van pilotgemeenten vragen wij periodiek feedback op:</p>
              <ul className="space-y-2 ml-10">
                <li className="flex items-start gap-2 text-base text-foreground/70">
                  <Check className="w-4 h-4 text-coral flex-shrink-0 mt-1" />
                  bruikbaarheid van het behandelrapport
                </li>
                <li className="flex items-start gap-2 text-base text-foreground/70">
                  <Check className="w-4 h-4 text-coral flex-shrink-0 mt-1" />
                  volledigheid en herkenbaarheid van de juridische onderbouwing
                </li>
                <li className="flex items-start gap-2 text-base text-foreground/70">
                  <Check className="w-4 h-4 text-coral flex-shrink-0 mt-1" />
                  aansluiting bij de gemeentelijke werkwijze
                </li>
              </ul>
              <p className="text-base text-foreground/70 mt-3 ml-10">Feedback wordt gebruikt om het systeem gericht te verbeteren.</p>
            </div>
          </div>
        </div>

        {/* Wat blijft ongewijzigd */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-8">
            Wat blijft ongewijzigd?
          </h2>

          <div className="space-y-8">
            {/* Menselijke regie */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0D1A3B]/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-[#0D1A3B]" />
                </div>
                Menselijke regie
              </h3>
              <ul className="space-y-2 ml-10">
                <li className="text-base text-foreground/70">Ro-flow neemt geen besluiten en vervangt geen vergunningverlener.</li>
                <li className="text-base text-foreground/70">De behandelaar blijft volledig verantwoordelijk voor de beoordeling en het besluit.</li>
                <li className="text-base text-foreground/70">Het rapport is bedoeld als ondersteuning, niet als bindend advies.</li>
              </ul>
            </div>

            {/* Juridische verantwoordelijkheid */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0D1A3B]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-[#0D1A3B]" />
                </div>
                Juridische verantwoordelijkheid
              </h3>
              <ul className="space-y-2 ml-10">
                <li className="text-base text-foreground/70">De gemeente blijft eigenaar van alle dossiers en gegevens.</li>
                <li className="text-base text-foreground/70">Ro-flow voert geen geautomatiseerde besluitvorming uit (art. 22 AVG).</li>
                <li className="text-base text-foreground/70">Elk advies is herleidbaar tot de gebruikte bronregel.</li>
              </ul>
            </div>

            {/* Dataveiligheid en AVG */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0D1A3B]/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-[#0D1A3B]" />
                </div>
                Dataveiligheid en AVG
              </h3>
              <ul className="space-y-2 ml-10">
                <li className="text-base text-foreground/70">Aanvraagdocumenten worden niet gebruikt voor modeltraining.</li>
                <li className="text-base text-foreground/70">Verwerking vindt plaats via beveiligde API-verbindingen.</li>
                <li className="text-base text-foreground/70">Een verwerkersovereenkomst is beschikbaar conform gemeentelijke standaarden.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wat levert deelname op */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-6">
            Wat levert deelname op?
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-base text-foreground/80">
              <Check className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
              Inzicht in de toegevoegde waarde van AI-ondersteuning in de vergunningverlening
            </li>
            <li className="flex items-start gap-3 text-base text-foreground/80">
              <Check className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
              Ervaring met een systeem dat is ontworpen vanuit publieke waarden
            </li>
            <li className="flex items-start gap-3 text-base text-foreground/80">
              <Check className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
              Directe invloed op de doorontwikkeling van Ro-flow
            </li>
            <li className="flex items-start gap-3 text-base text-foreground/80">
              <Check className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
              Bijdrage aan een gedeelde oplossing voor capaciteitsdruk in het fysieke domein
            </li>
          </ul>
        </div>

        {/* Duur en verplichtingen */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-6">
            Duur en verplichtingen
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-base text-foreground/80">
              <Calendar className="w-5 h-5 text-foreground/40 flex-shrink-0 mt-0.5" />
              De pilot loopt gedurende een afgesproken testperiode, deze is standaard 6 maanden.
            </li>
            <li className="flex items-start gap-3 text-base text-foreground/80">
              <Calendar className="w-5 h-5 text-foreground/40 flex-shrink-0 mt-0.5" />
              Deelname is vrijblijvend en kan tussentijds worden beëindigd.
            </li>
            <li className="flex items-start gap-3 text-base text-foreground/80">
              <Calendar className="w-5 h-5 text-foreground/40 flex-shrink-0 mt-0.5" />
              Er zijn geen verplichtingen tot afname na afloop van de pilot.
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="max-w-3xl mx-auto mb-16">
          <hr className="border-border" />
        </div>

        {/* Aanmeldformulier */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Form */}
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-4">
              Aanmelden als pilotgemeente
            </h2>
            <p className="text-base text-foreground/70 mb-8">
              Vul onderstaand formulier in. Wij nemen binnen twee werkdagen contact met u op om de mogelijkheden te bespreken.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="gemeenteNaam">Gemeente / organisatie *</Label>
                <Input
                  id="gemeenteNaam"
                  name="gemeenteNaam"
                  placeholder="Naam van uw gemeente of organisatie"
                  value={formData.gemeenteNaam}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactpersoon">Contactpersoon *</Label>
                  <Input
                    id="contactpersoon"
                    name="contactpersoon"
                    placeholder="Uw volledige naam"
                    value={formData.contactpersoon}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="functie">Functie</Label>
                  <Input
                    id="functie"
                    name="functie"
                    placeholder="bijv. Vergunningverlener"
                    value={formData.functie}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mailadres *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="naam@gemeente.nl"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefoon">Telefoonnummer</Label>
                  <Input
                    id="telefoon"
                    name="telefoon"
                    type="tel"
                    placeholder="+31 6 12345678"
                    value={formData.telefoon}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aantalSeats">Aantal gebruikers</Label>
                <Input
                  id="aantalSeats"
                  name="aantalSeats"
                  type="number"
                  min="1"
                  placeholder="bijv. 5"
                  value={formData.aantalSeats}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  U kunt later altijd meer gebruikers toevoegen
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bericht">Opmerkingen (optioneel)</Label>
                <Textarea
                  id="bericht"
                  name="bericht"
                  placeholder="Heeft u specifieke wensen of vragen?"
                  rows={3}
                  value={formData.bericht}
                  onChange={handleChange}
                />
              </div>

              <Button
                type="submit"
                disabled={submitPilot.isPending}
                className="w-full h-14 text-base font-semibold rounded-xl bg-coral hover:bg-coral-dark text-white"
              >
                {submitPilot.isPending ? "Bezig met verzenden..." : "Aanmelden als pilotgemeente"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Door dit formulier in te vullen gaat u akkoord met ons{" "}
                <Link href="/privacy" className="underline hover:text-foreground">
                  privacybeleid
                </Link>
                {" "}en{" "}
                <Link href="/voorwaarden" className="underline hover:text-foreground">
                  algemene voorwaarden
                </Link>
                .
              </p>
            </form>
          </div>

          {/* Right Column - Summary */}
          <div className="hidden lg:block">
            <Card className="border-0 shadow-xl bg-white sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl">Samenvatting</CardTitle>
                <CardDescription>
                  Wat u kunt verwachten als pilotgemeente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Geen IT-traject nodig</h3>
                    <p className="text-sm text-muted-foreground">
                      Geen koppeling met zaaksystemen, direct naast de bestaande werkwijze.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">U bepaalt de scope</h3>
                    <p className="text-sm text-muted-foreground">
                      Kies zelf welke dossiers en hoeveel gebruikers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Menselijke regie</h3>
                    <p className="text-sm text-muted-foreground">
                      De behandelaar beslist altijd. Ro-flow ondersteunt, neemt geen besluiten.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">AVG-compliant</h3>
                    <p className="text-sm text-muted-foreground">
                      Beveiligde verwerking, verwerkersovereenkomst beschikbaar.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">6 maanden, vrijblijvend</h3>
                    <p className="text-sm text-muted-foreground">
                      Tussentijds opzegbaar, geen verplichtingen na afloop.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, Calendar, Users, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function Demo() {
  const [formData, setFormData] = useState({
    naam: "",
    email: "",
    gemeente: "",
    telefoon: "",
    bericht: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitDemo = trpc.demo.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Demo aanvraag verzonden!");
    },
    onError: (error: { message: string }) => {
      toast.error("Er ging iets mis: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.naam || !formData.email || !formData.gemeente) {
      toast.error("Vul alle verplichte velden in");
      return;
    }

    submitDemo.mutate(formData);
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
        {/* Header */}
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
              Bedankt voor je aanvraag!
            </h1>
            <p className="text-muted-foreground mb-8">
              We hebben je demo-aanvraag ontvangen. Een van onze specialisten neemt binnen 24 uur contact met je op om een demo in te plannen.
            </p>
            <Link href="/">
              <Button className="bg-accent hover:bg-accent/90">
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
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Form */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Plan een demo
            </h1>
            <p className="text-muted-foreground mb-8">
              Ontdek hoe Ro-flow jouw gemeente kan helpen met snellere en betere vergunningverlening. Vul het formulier in en we nemen binnen 24 uur contact met je op.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="naam">Naam *</Label>
                  <Input
                    id="naam"
                    name="naam"
                    placeholder="Je volledige naam"
                    value={formData.naam}
                    onChange={handleChange}
                    required
                  />
                </div>
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
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gemeente">Gemeente *</Label>
                  <Input
                    id="gemeente"
                    name="gemeente"
                    placeholder="Naam van je gemeente"
                    value={formData.gemeente}
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
                <Label htmlFor="bericht">Bericht (optioneel)</Label>
                <Textarea
                  id="bericht"
                  name="bericht"
                  placeholder="Vertel ons meer over je situatie of stel een vraag..."
                  rows={4}
                  value={formData.bericht}
                  onChange={handleChange}
                />
              </div>

              <Button
                type="submit"
                disabled={submitDemo.isPending}
                className="w-full h-14 text-base font-medium rounded-xl bg-accent hover:bg-accent/90"
              >
                {submitDemo.isPending ? "Verzenden..." : "Demo aanvragen"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Door dit formulier in te vullen ga je akkoord met ons{" "}
                <Link href="/privacy" className="underline hover:text-foreground">
                  privacybeleid
                </Link>
                .
              </p>
            </form>
          </div>

          {/* Right Column - Benefits */}
          <div className="hidden lg:block">
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Wat kun je verwachten?</CardTitle>
                <CardDescription>
                  Een persoonlijke demo afgestemd op jouw gemeente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Flexibele planning</h3>
                    <p className="text-sm text-muted-foreground">
                      We plannen de demo op een moment dat jou uitkomt, online of op locatie.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Neem collega's mee</h3>
                    <p className="text-sm text-muted-foreground">
                      Nodig gerust behandelaars, teamleiders of IT-collega's uit voor de demo.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">30 minuten</h3>
                    <p className="text-sm text-muted-foreground">
                      Een korte maar complete demonstratie van alle mogelijkheden.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Al je vragen beantwoord</h3>
                    <p className="text-sm text-muted-foreground">
                      Ruimte voor al je vragen over implementatie, kosten en mogelijkheden.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <p className="text-sm text-muted-foreground italic">
                    "De demo gaf ons direct inzicht in hoeveel tijd we kunnen besparen. Binnen een week waren we live."
                  </p>
                  <p className="text-sm font-medium mt-2">
                    — Vergunningverlener, Gemeente Hoorn
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

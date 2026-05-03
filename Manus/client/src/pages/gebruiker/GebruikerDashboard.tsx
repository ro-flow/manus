import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Upload, 
  FileText, 
  Clock,
  ChevronRight,
  Zap,
  Building2,
  CreditCard,
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";

export default function GebruikerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const gemeenteId = user?.gemeenteId || 1;
  const { data: gemeente } = trpc.gemeente.getById.useQuery({ id: gemeenteId });
  const { data: rapporten } = trpc.behandelrapport.listByUser.useQuery({ 
    email: user?.email || '', 
    limit: 5 
  });
  const { data: subscription } = trpc.payment.getSubscription.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welkom, {user?.name || 'Behandelaar'}</h1>
            <p className="text-muted-foreground">
              Start een nieuwe DSO-analyse of bekijk je recente rapporten
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-medium">{gemeente?.gemeenteNaam || 'Gemeente'}</span>
          </div>
        </div>

        {/* Subscription Status */}
        {subscription && (
          <Card 
            className="border shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-r from-accent/5 to-accent/10"
            onClick={() => setLocation('/abonnement')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Ro-flow Pro</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === 'trial' 
                          ? 'bg-blue-100 text-blue-700' 
                          : subscription.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {subscription.status === 'trial' ? 'Proefperiode' : subscription.status === 'active' ? 'Actief' : subscription.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {subscription.status === 'trial' 
                        ? `Proefperiode eindigt ${new Date(subscription.trialEndDate!).toLocaleDateString('nl-NL')}`
                        : `Volgende betaling ${new Date(subscription.nextBillingDate!).toLocaleDateString('nl-NL')}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-5 w-5" />
                  <span className="text-sm">Beheren</span>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card 
            className="border shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => setLocation('/gebruiker/upload')}
          >
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-6">
                <h2 className="text-xl font-semibold">Nieuwe DSO-Analyse</h2>
                <p className="text-muted-foreground mt-2">
                  Upload een DSO-ZIP bestand en ontvang binnen seconden een volledig behandelrapport
                </p>
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-primary" />
                  Snel resultaat
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-primary" />
                  PDF rapport
                </span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => setLocation('/gebruiker/rapporten')}
          >
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="h-16 w-16 rounded-2xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-6">
                <h2 className="text-xl font-semibold">Mijn Rapporten</h2>
                <p className="text-muted-foreground mt-2">
                  Bekijk en download je eerder gegenereerde behandelrapporten
                </p>
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {rapporten?.length || 0} rapporten
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recente Rapporten</CardTitle>
                <CardDescription>Je laatst gegenereerde behandelrapporten</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setLocation('/gebruiker/rapporten')}>
                Bekijk alle
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rapporten?.map((rapport) => (
                <div 
                  key={rapport.id} 
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{rapport.zaaknummer}</div>
                      <div className="text-sm text-muted-foreground">
                        {rapport.adres || 'Geen adres'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm">
                        {new Date(rapport.datumRapport).toLocaleDateString('nl-NL')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {rapport.verwerkingDuurSec ? `${rapport.verwerkingDuurSec}s` : '-'}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rapport.status === 'verzonden' 
                        ? 'bg-green-100 text-green-800' 
                        : rapport.status === 'mislukt'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {rapport.status || 'verwerking'}
                    </span>
                  </div>
                </div>
              ))}
              
              {(!rapporten || rapporten.length === 0) && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">Nog geen rapporten</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start je eerste DSO-analyse om een rapport te genereren
                  </p>
                  <Button className="mt-4" onClick={() => setLocation('/gebruiker/upload')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Analyse
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Hoe werkt Ro-flow?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  1. Upload je DSO-ZIP bestand met de aanvraaggegevens<br />
                  2. Ro-flow analyseert automatisch de locatie via PDOK<br />
                  3. De AI doorzoekt de 5-lagen kennisbank<br />
                  4. Je ontvangt een PDF-rapport per email
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

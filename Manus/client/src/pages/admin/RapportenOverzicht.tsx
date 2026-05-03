import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileText, ChevronLeft, Building2, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function RapportenOverzicht() {
  const [, setLocation] = useLocation();
  
  const { data: rapporten, isLoading } = trpc.behandelrapport.listAll.useQuery({ limit: 100 });
  const { data: stats } = trpc.behandelrapport.stats.useQuery();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verzonden':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'mislukt':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rapporten Overzicht</h1>
            <p className="text-muted-foreground">Alle gegenereerde behandelrapporten</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <div className="text-sm text-muted-foreground">Totaal rapporten</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.today || 0}</div>
              <div className="text-sm text-muted-foreground">Vandaag</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.thisMonth || 0}</div>
              <div className="text-sm text-muted-foreground">Deze maand</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {stats?.avgDuration ? `${Number(stats.avgDuration).toFixed(1)}s` : '0s'}
              </div>
              <div className="text-sm text-muted-foreground">Gem. verwerkingstijd</div>
            </CardContent>
          </Card>
        </div>

        {/* Rapporten List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Recente Rapporten</CardTitle>
            <CardDescription>Laatste 100 behandelrapporten</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {rapporten?.map(({ rapport, gemeente }) => (
                  <div 
                    key={rapport.id} 
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{rapport.zaaknummer}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {gemeente?.gemeenteNaam || 'Onbekend'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {rapport.verwerkingDuurSec ? `${rapport.verwerkingDuurSec}s` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm">{rapport.behandelaarNaam || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(rapport.datumRapport).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(rapport.status || 'verwerking')}
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
                  </div>
                ))}
                
                {rapporten?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nog geen rapporten gegenereerd
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { UserCheck, ChevronLeft, Plus, Mail, Phone, Globe } from "lucide-react";
import { useLocation } from "wouter";

export default function AdviseursBeheer() {
  const [, setLocation] = useLocation();
  
  const { data: adviseurs, isLoading } = trpc.adviseurs.list.useQuery();

  const externeAdviseurs = adviseurs?.filter(a => a.type === 'extern') || [];
  const interneAdviseurs = adviseurs?.filter(a => a.type === 'intern') || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/admin')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Adviseurs Beheer</h1>
              <p className="text-muted-foreground">Beheer externe en interne adviseurs</p>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Adviseur
          </Button>
        </div>

        {/* Externe Adviseurs */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Externe Adviseurs ({externeAdviseurs.length})</CardTitle>
            <CardDescription>Adviseurs buiten de gemeente (waterschap, RCE, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {externeAdviseurs.map((adviseur) => (
                  <div 
                    key={adviseur.id} 
                    className="flex items-start justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{adviseur.naam}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {adviseur.categorie} • Termijn: {adviseur.termijnWeken || '?'} weken
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {adviseur.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {adviseur.contactEmail}
                            </span>
                          )}
                          {adviseur.isLandelijk && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Landelijk
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Grondslag</div>
                      <div className="text-sm">{adviseur.grondslag || '-'}</div>
                    </div>
                  </div>
                ))}
                
                {externeAdviseurs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nog geen externe adviseurs
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interne Adviseurs */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Interne Adviseurs ({interneAdviseurs.length})</CardTitle>
            <CardDescription>Adviseurs binnen de gemeente (welstand, verkeer, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {interneAdviseurs.map((adviseur) => (
                  <div 
                    key={adviseur.id} 
                    className="flex items-start justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">{adviseur.naam}</div>
                        <div className="text-sm text-muted-foreground">
                          {adviseur.categorie} • Termijn: {adviseur.termijnWeken || '?'} weken
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {interneAdviseurs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nog geen interne adviseurs
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

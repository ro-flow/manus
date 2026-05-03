import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  Brain, 
  ChevronLeft,
  BarChart3,
  Lightbulb,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";

export default function FeedbackDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get gemeente ID from user
  const gemeenteId = user?.gemeenteId;

  // Fetch feedback statistics (no input needed, uses ctx.user.gemeenteId)
  const { data: stats, isLoading: statsLoading } = trpc.feedback.stats.useQuery(
    undefined,
    { enabled: !!gemeenteId }
  );

  // Fetch active patterns (no input needed, uses ctx.user.gemeenteId)
  const { data: patronen, isLoading: patronenLoading } = trpc.feedback.patronen.useQuery(
    undefined,
    { enabled: !!gemeenteId }
  );

  // Fetch recent feedback
  const { data: recentFeedback, isLoading: recentLoading } = trpc.feedback.recent.useQuery(
    { gemeenteId: gemeenteId!, limit: 10 },
    { enabled: !!gemeenteId }
  );

  const getFeedbackTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'algemeen': 'Algemeen',
      'procedure': 'Procedure',
      'adviseurs': 'Adviseurs',
      'toetsingskaders': 'Toetsingskaders',
      'volledigheid': 'Volledigheid',
      'juridisch': 'Juridisch',
      'beleidsdocumenten': 'Beleidsdocumenten',
      'overig': 'Overig',
    };
    return labels[type] || type;
  };

  const getPatroonTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'adviseur_gemist': 'Adviseur gemist',
      'adviseur_onterecht': 'Adviseur onterecht',
      'procedure_correctie': 'Procedure correctie',
      'toetsingskader_gemist': 'Toetsingskader gemist',
      'juridische_fout': 'Juridische fout',
      'overig': 'Overig',
    };
    return labels[type] || type;
  };

  const getScopeLabel = (patroon: any) => {
    if (patroon.gemeenteId) return 'Gemeente';
    if (patroon.provincie) return 'Provinciaal';
    return 'Landelijk';
  };

  const getScopeBadgeVariant = (patroon: any): "default" | "secondary" | "outline" => {
    if (patroon.gemeenteId) return 'default';
    if (patroon.provincie) return 'secondary';
    return 'outline';
  };

  if (!gemeenteId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Geen gemeente gekoppeld aan uw account.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/beheerder')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Zelflerend Systeem
            </h1>
            <p className="text-muted-foreground">
              Bekijk feedback statistieken en geleerde patronen
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Live updates
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats?.totaal || 0}</div>
                  <div className="text-sm text-muted-foreground">Totaal feedback</div>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats?.positief || 0}</div>
                  <div className="text-sm text-muted-foreground">Positief</div>
                </div>
                <ThumbsUp className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats?.negatief || 0}</div>
                  <div className="text-sm text-muted-foreground">Negatief (correcties)</div>
                </div>
                <ThumbsDown className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">{patronen?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Actieve patronen</div>
                </div>
                <Lightbulb className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accuracy Rate */}
        {stats && stats.totaal > 0 && (
          <Card className="border shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round((stats.positief / stats.totaal) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Nauwkeurigheid op basis van {stats.totaal} beoordelingen
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Patterns */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Geleerde Patronen
              </CardTitle>
              <CardDescription>
                Patronen die automatisch worden meegenomen in analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patronenLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : patronen && patronen.length > 0 ? (
                <div className="space-y-3">
                  {patronen.map((patroon: any) => (
                    <div 
                      key={patroon.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {getPatroonTypeLabel(patroon.patroonType)}
                            </span>
                            <Badge variant={getScopeBadgeVariant(patroon)} className="text-xs">
                              {getScopeLabel(patroon)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {patroon.aiInstructie}
                          </p>
                          {patroon.triggerActiviteit && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Trigger: <code className="bg-muted px-1 rounded">{patroon.triggerActiviteit}</code>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-primary">
                            {patroon.aantalVoorkomens}x
                          </div>
                          <div className="text-xs text-muted-foreground">gemeld</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Lightbulb className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nog geen patronen geleerd. Patronen ontstaan automatisch na herhaalde feedback.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Feedback */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Recente Feedback
              </CardTitle>
              <CardDescription>
                Laatste beoordelingen van behandelaars
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentFeedback && recentFeedback.length > 0 ? (
                <div className="space-y-3">
                  {recentFeedback.map((feedback: any) => (
                    <div 
                      key={feedback.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        feedback.score === 'positief' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {feedback.score === 'positief' 
                          ? <ThumbsUp className="h-5 w-5" />
                          : <ThumbsDown className="h-5 w-5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {getFeedbackTypeLabel(feedback.feedbackType)}
                          </span>
                          <Badge variant={feedback.score === 'positief' ? 'default' : 'destructive'} className="text-xs">
                            {feedback.score}
                          </Badge>
                        </div>
                        {feedback.correctie && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            Correctie: {feedback.correctie}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(feedback.createdAt).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nog geen feedback ontvangen. Behandelaars kunnen feedback geven op rapporten.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feedback per Type */}
        {stats?.perType && stats.perType.length > 0 && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Feedback per Categorie</CardTitle>
              <CardDescription>
                Verdeling van feedback over verschillende rapportonderdelen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.perType.map((item: any) => (
                  <div 
                    key={item.type} 
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-sm text-muted-foreground">
                      {getFeedbackTypeLabel(item.type)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border shadow-sm border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Hoe werkt het zelflerende systeem?</h3>
                <p className="text-sm text-muted-foreground">
                  Wanneer behandelaars feedback geven op rapporten, leert het systeem hiervan. 
                  Bij herhaalde correcties (3+ keer) wordt automatisch een patroon aangemaakt 
                  dat wordt meegenomen in toekomstige analyses. Patronen kunnen gemeente-specifiek, 
                  provinciaal of landelijk zijn, afhankelijk van de scope van de correctie.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

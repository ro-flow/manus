import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function Feedback() {
  const { user } = useAuth();
  
  // Get user's own feedback
  const { data: myFeedback, isLoading: loadingFeedback } = trpc.feedback.getMyFeedback.useQuery(
    { limit: 20 },
    { enabled: !!user }
  );

  // Get active patterns (visible to all)
  const { data: patterns, isLoading: loadingPatterns } = trpc.feedback.getActivePatterns.useQuery(
    { limit: 10 }
  );

  const positiveCount = myFeedback?.filter((f: { isPositive: boolean }) => f.isPositive).length || 0;
  const negativeCount = myFeedback?.filter((f: { isPositive: boolean }) => !f.isPositive).length || 0;
  const totalCount = myFeedback?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feedback & Verbeteringen</h1>
          <p className="text-muted-foreground mt-1">
            Bekijk uw feedback en zie hoe het systeem leert van alle gebruikers
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-sm text-muted-foreground">Mijn feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{positiveCount}</p>
                  <p className="text-sm text-muted-foreground">Positief</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ThumbsDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{negativeCount}</p>
                  <p className="text-sm text-muted-foreground">Correcties</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{patterns?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Actieve patronen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Recent Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mijn Recente Feedback</CardTitle>
              <CardDescription>
                Uw bijdragen aan het verbeteren van het systeem
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFeedback ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : myFeedback && myFeedback.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {myFeedback.map((feedback: { id: number; isPositive: boolean; sectionType: string; createdAt: string; correctedContent: string | null }) => (
                    <div
                      key={feedback.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {feedback.isPositive ? (
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium text-sm">{feedback.sectionType}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(feedback.createdAt), { 
                            addSuffix: true, 
                            locale: nl 
                          })}
                        </span>
                      </div>
                      {feedback.correctedContent && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          Correctie: {feedback.correctedContent}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>U heeft nog geen feedback gegeven</p>
                  <p className="text-sm mt-1">
                    Geef feedback op rapporten om het systeem te verbeteren
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actieve Verbeterpatronen</CardTitle>
              <CardDescription>
                Geleerde lessen die het systeem nu toepast
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPatterns ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : patterns && patterns.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {patterns.map((pattern: { id: number; sectionType: string; occurrenceCount: number; correctionPattern: string; scope: string }) => (
                    <div
                      key={pattern.id}
                      className="p-3 border rounded-lg bg-accent/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                          <span className="font-medium text-sm">{pattern.sectionType}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {pattern.occurrenceCount}x
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {pattern.correctionPattern}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {pattern.scope === 'gemeente' ? 'Gemeente' : 
                           pattern.scope === 'provinciaal' ? 'Provinciaal' : 'Landelijk'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nog geen actieve patronen</p>
                  <p className="text-sm mt-1">
                    Patronen worden automatisch aangemaakt na herhaalde correcties
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hoe werkt het zelflerende systeem?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ThumbsDown className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">1. U geeft feedback</h4>
                <p className="text-sm text-muted-foreground">
                  Bij elk rapportonderdeel kunt u aangeven of het advies correct was
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <h4 className="font-medium mb-1">2. Patronen worden herkend</h4>
                <p className="text-sm text-muted-foreground">
                  Na 3+ vergelijkbare correcties wordt een patroon aangemaakt
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium mb-1">3. AI past zich aan</h4>
                <p className="text-sm text-muted-foreground">
                  Toekomstige analyses nemen de geleerde lessen automatisch mee
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

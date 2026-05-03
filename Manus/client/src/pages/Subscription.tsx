import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft,
  Loader2,
  Sparkles,
  Clock,
  XCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Subscription() {
  const { user } = useAuth();
  const [isCanceling, setIsCanceling] = useState(false);
  
  const { data: subscription, isLoading, refetch } = trpc.payment.getSubscription.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const { data: payments } = trpc.payment.getPaymentHistory.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const cancelMutation = trpc.payment.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Je abonnement is opgezegd");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Er ging iets mis bij het opzeggen");
    },
    onSettled: () => {
      setIsCanceling(false);
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "€0,00";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Proefperiode</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Actief</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Betaling mislukt</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Opgezegd</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Verlopen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Betaald</Badge>;
      case 'open':
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">In behandeling</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Mislukt</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Geannuleerd</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <Link href="/gebruiker">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Terug naar dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Abonnement beheren</h1>

        {!subscription ? (
          // No subscription
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Geen actief abonnement</h2>
              <p className="text-muted-foreground mb-6">
                Start een gratis pilot om toegang te krijgen tot alle Ro-flow functies.
              </p>
              <Link href="/pilot">
                <Button className="bg-accent hover:bg-accent/90">
                  Start gratis pilot
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent" />
                      Ro-flow Pro {subscription.plan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
                    </CardTitle>
                    <CardDescription>
                      {subscription.status === 'trial' 
                        ? 'Je proefperiode is actief' 
                        : subscription.status === 'active'
                        ? 'Je abonnement is actief'
                        : subscription.status === 'canceled'
                        ? 'Je abonnement is opgezegd'
                        : 'Je abonnement status'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Trial/Billing Info */}
                  {subscription.status === 'trial' && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Proefperiode eindigt</p>
                        <p className="text-sm text-blue-700">{formatDate(subscription.trialEndDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Next Billing */}
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Volgende betaling</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.status === 'canceled' 
                          ? 'Geen (opgezegd)' 
                          : formatDate(subscription.nextBillingDate)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Amount */}
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Bedrag</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(subscription.amount)} / {subscription.plan === 'monthly' ? 'maand' : 'jaar'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cancel Button */}
                {subscription.status !== 'canceled' && subscription.status !== 'expired' && (
                  <div className="pt-4 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          Abonnement opzeggen
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {subscription.status === 'trial' ? (
                              <>
                                Als je nu opzegt, verlies je direct toegang tot alle Pro-functies. 
                                Je proefperiode loopt nog tot {formatDate(subscription.trialEndDate)}.
                              </>
                            ) : (
                              <>
                                Je abonnement wordt opgezegd. Je behoudt toegang tot het einde van de huidige periode 
                                ({formatDate(subscription.nextBillingDate)}).
                              </>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              setIsCanceling(true);
                              cancelMutation.mutate();
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isCanceling}
                          >
                            {isCanceling ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Bezig...
                              </>
                            ) : (
                              'Ja, opzeggen'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {/* Canceled notice */}
                {subscription.status === 'canceled' && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Abonnement opgezegd</p>
                      <p className="text-sm text-yellow-700">
                        Je abonnement is opgezegd op {formatDate(subscription.canceledAt)}. 
                        Je kunt een nieuw abonnement starten via de checkout.
                      </p>
                      <Link href="/pilot">
                        <Button size="sm" className="mt-3 bg-accent hover:bg-accent/90">
                          Nieuwe pilot aanvragen
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Betalingsgeschiedenis</CardTitle>
                <CardDescription>Overzicht van al je betalingen</CardDescription>
              </CardHeader>
              <CardContent>
                {!payments || payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nog geen betalingen
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div 
                        key={payment.id} 
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {payment.status === 'paid' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : payment.status === 'failed' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">{payment.description || 'Betaling'}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(payment.paidAt || payment.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getPaymentStatusBadge(payment.status)}
                          <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

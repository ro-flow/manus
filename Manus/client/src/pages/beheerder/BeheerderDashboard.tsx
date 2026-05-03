import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  FileText, 
  MessageSquare,
  ChevronRight,
  Settings,
  Building2
} from "lucide-react";
import { useLocation } from "wouter";

export default function BeheerderDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get gemeente data if user has gemeenteId
  const gemeenteId = user?.gemeenteId || 1; // Default to 1 for demo
  const { data: gemeente } = trpc.gemeente.getById.useQuery({ id: gemeenteId });
  const { data: seats } = trpc.seats.listByGemeente.useQuery({ gemeenteId });
  const { data: documenten } = trpc.beleidsdocumenten.listByGemeente.useQuery({ gemeenteId });

  const activeSeats = seats?.filter(s => s.status === 'actief').length || 0;
  const totalSeats = gemeente?.seatsGekocht || 0;

  const quickActions = [
    { 
      label: "Onboarding Chat", 
      description: "Configureer gemeente instellingen",
      path: "/beheerder/onboarding", 
      icon: MessageSquare,
      color: "bg-blue-100 text-blue-600"
    },
    { 
      label: "Seats Beheren", 
      description: "Nodig behandelaars uit",
      path: "/beheerder/seats", 
      icon: Users,
      color: "bg-green-100 text-green-600"
    },
    { 
      label: "Beleidsdocumenten", 
      description: "Koppel documenten aan kennisbank",
      path: "/beheerder/documenten", 
      icon: FileText,
      color: "bg-orange-100 text-orange-600"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Beheerder Dashboard</h1>
            <p className="text-muted-foreground">
              Welkom terug, {user?.name || 'Beheerder'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-medium">{gemeente?.gemeenteNaam || 'Gemeente'}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Seats Gebruikt
              </CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSeats} / {totalSeats}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalSeats - activeSeats} beschikbaar
              </p>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${totalSeats > 0 ? (activeSeats / totalSeats) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Beleidsdocumenten
              </CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documenten?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Gekoppeld aan kennisbank
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
              <Settings className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${
                  gemeente?.status === 'actief' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="text-lg font-medium">
                  {gemeente?.status === 'actief' ? 'Actief' : 'Configuratie vereist'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {gemeente?.provincie}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Snelle Acties</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Card 
                key={action.path} 
                className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(action.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`h-12 w-12 rounded-xl ${action.color} flex items-center justify-center`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-4">
                    <h3 className="font-medium">{action.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Gemeente Info */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Gemeente Configuratie</CardTitle>
            <CardDescription>Huidige instellingen voor {gemeente?.gemeenteNaam}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Waterschap</span>
                  <span className="font-medium">{gemeente?.waterschapNaam || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Veiligheidsregio</span>
                  <span className="font-medium">{gemeente?.vrNaam || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Omgevingsdienst</span>
                  <span className="font-medium">{gemeente?.odNaam || '-'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">GGD</span>
                  <span className="font-medium">{gemeente?.ggdNaam || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Welstandsniveau</span>
                  <span className="font-medium">{gemeente?.welstandsniveauDefault || 'Regulier'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Beschermd Gezicht</span>
                  <span className="font-medium">{gemeente?.heeftBeschermdGezicht ? 'Ja' : 'Nee'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

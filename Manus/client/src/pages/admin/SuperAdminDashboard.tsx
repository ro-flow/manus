import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Users, 
  FileText, 
  TrendingUp,
  ChevronRight,
  Activity,
  Euro,
  BookOpen
} from "lucide-react";
import { useLocation } from "wouter";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: gemeenteStats } = trpc.gemeente.stats.useQuery();
  const { data: rapportStats } = trpc.behandelrapport.stats.useQuery();
  const { data: gemeenten } = trpc.gemeente.list.useQuery();

  const stats = [
    {
      title: "Actieve Gemeenten",
      value: gemeenteStats?.active || 0,
      description: `${gemeenteStats?.pending || 0} wachtend op activatie`,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Totaal Seats",
      value: gemeenteStats?.totalSeats || 0,
      description: "Actieve licenties",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Rapporten Vandaag",
      value: rapportStats?.today || 0,
      description: `${rapportStats?.thisMonth || 0} deze maand`,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Gem. Verwerkingstijd",
      value: rapportStats?.avgDuration ? `${Number(rapportStats.avgDuration).toFixed(1)}s` : "0s",
      description: "Per rapport",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  const quickActions = [
    { label: "Gemeenten beheren", path: "/admin/gemeenten", icon: Building2 },
    { label: "Seats overzicht", path: "/admin/seats", icon: Users },
    { label: "Kennisbank beheren", path: "/admin/kennisbank", icon: BookOpen },
    { label: "Adviseurs beheren", path: "/admin/adviseurs", icon: TrendingUp },
    { label: "Alle rapporten", path: "/admin/rapporten", icon: FileText },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welkom terug, {user?.name || 'Admin'}. Hier is een overzicht van het platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-9 w-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card 
              key={action.path} 
              className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(action.path)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Gemeenten */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Actieve Gemeenten</CardTitle>
                <CardDescription>Overzicht van alle geregistreerde gemeenten</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setLocation('/admin/gemeenten')}>
                Bekijk alle
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gemeenten?.slice(0, 5).map((gemeente) => (
                <div 
                  key={gemeente.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{gemeente.gemeenteNaam}</div>
                      <div className="text-sm text-muted-foreground">
                        {gemeente.provincie} • {gemeente.seatsGekocht || 0} seats
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      gemeente.status === 'actief' 
                        ? 'bg-green-100 text-green-800' 
                        : gemeente.status === 'pending_activation'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {gemeente.status === 'actief' ? 'Actief' : 
                       gemeente.status === 'pending_activation' ? 'Wachtend' : 
                       gemeente.status}
                    </span>
                  </div>
                </div>
              ))}
              
              {(!gemeenten || gemeenten.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Nog geen gemeenten geregistreerd
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

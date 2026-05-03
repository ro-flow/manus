import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Users, 
  Clock,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Calendar,
  Mail,
  RefreshCw,
  XCircle,
  Eye,
  Rocket
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function PilotDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGemeente, setSelectedGemeente] = useState<any>(null);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [extendDays, setExtendDays] = useState(30);

  const { data: pilotStats, refetch: refetchStats } = trpc.pilot.stats.useQuery();
  const { data: pilotGemeenten, refetch: refetchGemeenten } = trpc.pilot.list.useQuery();
  
  const extendMutation = trpc.pilot.extend.useMutation({
    onSuccess: () => {
      toast.success(`Pilot verlengd met ${extendDays} dagen`);
      setShowExtendDialog(false);
      refetchGemeenten();
      refetchStats();
    },
    onError: (error) => {
      toast.error("Fout bij verlengen: " + error.message);
    },
  });

  const deactivateMutation = trpc.pilot.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Pilot gedeactiveerd");
      setShowDeactivateDialog(false);
      refetchGemeenten();
      refetchStats();
    },
    onError: (error) => {
      toast.error("Fout bij deactiveren: " + error.message);
    },
  });

  const filteredGemeenten = pilotGemeenten?.filter(g => 
    g.gemeenteNaam.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.contactBeheerder?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysRemaining = (trialEndsAt: Date | string | null) => {
    if (!trialEndsAt) return null;
    const end = new Date(trialEndsAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (gemeente: any) => {
    const daysRemaining = getDaysRemaining(gemeente.trialEndsAt);
    
    if (!gemeente.isPilot || daysRemaining === null || daysRemaining < 0) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Verlopen</Badge>;
    }
    if (daysRemaining <= 7) {
      return <Badge variant="destructive" className="bg-red-100 text-red-700">Verloopt binnenkort</Badge>;
    }
    if (daysRemaining <= 30) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">Actief</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Actief</Badge>;
  };

  const stats = [
    {
      title: "Totaal Pilots",
      value: pilotStats?.totalPilots || 0,
      description: "Gemeenten in pilot",
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Actieve Pilots",
      value: pilotStats?.activePilots || 0,
      description: `${pilotStats?.expiredPilots || 0} verlopen`,
      icon: Rocket,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Totaal Seats",
      value: pilotStats?.totalSeats || 0,
      description: "Pilot gebruikers",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Verloopt deze week",
      value: pilotStats?.expiringThisWeek || 0,
      description: "Actie vereist",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pilot Aanmeldingen</h1>
          <p className="text-muted-foreground">
            Beheer alle pilot gemeenten en hun trial periodes.
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

        {/* Pilot Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pilot Gemeenten</CardTitle>
                <CardDescription>
                  Overzicht van alle gemeenten met een pilot aanmelding
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek gemeente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gemeente</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Trial eindigt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aangemeld</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGemeenten.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "Geen gemeenten gevonden" : "Nog geen pilot aanmeldingen"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGemeenten.map((gemeente) => {
                    const daysRemaining = getDaysRemaining(gemeente.trialEndsAt);
                    return (
                      <TableRow key={gemeente.id}>
                        <TableCell>
                          <div className="font-medium">{gemeente.gemeenteNaam}</div>
                          <div className="text-sm text-muted-foreground">{gemeente.provincie}</div>
                        </TableCell>
                        <TableCell>
                          {gemeente.contactBeheerder ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{gemeente.contactBeheerder}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{gemeente.totalSeats || gemeente.seatsGekocht || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>{formatDate(gemeente.trialEndsAt)}</div>
                              {daysRemaining !== null && daysRemaining >= 0 && (
                                <div className="text-xs text-muted-foreground">
                                  nog {daysRemaining} dagen
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(gemeente)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(gemeente.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedGemeente(gemeente);
                                setShowDetailsDialog(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Details bekijken
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedGemeente(gemeente);
                                setShowExtendDialog(true);
                              }}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Pilot verlengen
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedGemeente(gemeente);
                                  setShowDeactivateDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactiveren
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Extend Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilot verlengen</DialogTitle>
            <DialogDescription>
              Verleng de pilot periode voor {selectedGemeente?.gemeenteNaam}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Aantal dagen verlengen</label>
            <Input
              type="number"
              value={extendDays}
              onChange={(e) => setExtendDays(parseInt(e.target.value) || 30)}
              min={1}
              max={365}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Huidige einddatum: {formatDate(selectedGemeente?.trialEndsAt)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={() => {
                if (selectedGemeente) {
                  extendMutation.mutate({ 
                    gemeenteId: selectedGemeente.id, 
                    daysToAdd: extendDays 
                  });
                }
              }}
              disabled={extendMutation.isPending}
            >
              {extendMutation.isPending ? "Bezig..." : "Verlengen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilot deactiveren</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je de pilot voor {selectedGemeente?.gemeenteNaam} wilt deactiveren?
              Alle seats worden op inactief gezet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Annuleren
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedGemeente) {
                  deactivateMutation.mutate({ gemeenteId: selectedGemeente.id });
                }
              }}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? "Bezig..." : "Deactiveren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGemeente?.gemeenteNaam}</DialogTitle>
            <DialogDescription>
              Pilot details en seat informatie
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Provincie</label>
                <p>{selectedGemeente?.provincie}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gemeente Code</label>
                <p>{selectedGemeente?.gemeenteCode}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact</label>
                <p>{selectedGemeente?.contactBeheerder || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Aangemeld op</label>
                <p>{formatDate(selectedGemeente?.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Trial eindigt</label>
                <p>{formatDate(selectedGemeente?.trialEndsAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Aantal seats</label>
                <p>{selectedGemeente?.totalSeats || selectedGemeente?.seatsGekocht || 0}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

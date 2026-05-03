import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Users, ChevronLeft, Plus, Mail, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function BeheerderSeats() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSeat, setNewSeat] = useState<{ email: string; naam: string; rol: 'behandelaar' | 'beheerder' }>({ email: '', naam: '', rol: 'behandelaar' });
  
  const gemeenteId = user?.gemeenteId || 1;
  const { data: gemeente } = trpc.gemeente.getById.useQuery({ id: gemeenteId });
  const { data: seats, refetch } = trpc.seats.listByGemeente.useQuery({ gemeenteId });
  
  const createSeat = trpc.seats.create.useMutation({
    onSuccess: () => {
      toast.success('Seat toegevoegd!');
      setIsDialogOpen(false);
      setNewSeat({ email: '', naam: '', rol: 'behandelaar' });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteSeat = trpc.seats.delete.useMutation({
    onSuccess: () => {
      toast.success('Seat verwijderd');
      refetch();
    }
  });

  const activeSeats = seats?.filter(s => s.status === 'actief').length || 0;
  const totalSeats = gemeente?.seatsGekocht || 0;

  const handleAddSeat = () => {
    if (!newSeat.email) {
      toast.error('Email is verplicht');
      return;
    }
    createSeat.mutate({
      email: newSeat.email,
      naam: newSeat.naam || undefined,
      gemeenteId,
      rol: newSeat.rol,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/beheerder')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Seats Beheren</h1>
              <p className="text-muted-foreground">Nodig behandelaars uit voor {gemeente?.gemeenteNaam}</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={activeSeats >= totalSeats}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Seat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Seat Toevoegen</DialogTitle>
                <DialogDescription>
                  Nodig een nieuwe behandelaar uit voor {gemeente?.gemeenteNaam}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="behandelaar@gemeente.nl"
                    value={newSeat.email}
                    onChange={(e) => setNewSeat(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Naam</Label>
                  <Input
                    placeholder="Volledige naam"
                    value={newSeat.naam}
                    onChange={(e) => setNewSeat(prev => ({ ...prev, naam: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select 
                    value={newSeat.rol} 
                    onValueChange={(v: 'behandelaar' | 'beheerder') => setNewSeat(prev => ({ ...prev, rol: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="behandelaar">Behandelaar</SelectItem>
                      <SelectItem value="beheerder">Beheerder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddSeat}
                  disabled={createSeat.isPending}
                >
                  {createSeat.isPending ? 'Toevoegen...' : 'Seat Toevoegen'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Seats Usage */}
        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-bold">{activeSeats} / {totalSeats}</div>
                <div className="text-sm text-muted-foreground">Seats in gebruik</div>
              </div>
              {activeSeats >= totalSeats && (
                <div className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                  Limiet bereikt
                </div>
              )}
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${totalSeats > 0 ? (activeSeats / totalSeats) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seats List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Alle Seats ({seats?.length || 0})</CardTitle>
            <CardDescription>Beheer de toegang voor behandelaars</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {seats?.map((seat) => (
                <div 
                  key={seat.id} 
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{seat.naam || 'Onbekend'}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {seat.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      seat.status === 'actief' 
                        ? 'bg-green-100 text-green-800' 
                        : seat.status === 'uitgenodigd'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {seat.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      seat.rol === 'beheerder' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {seat.rol}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteSeat.mutate({ id: seat.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {seats?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nog geen seats toegevoegd. Klik op "Nieuwe Seat" om te beginnen.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

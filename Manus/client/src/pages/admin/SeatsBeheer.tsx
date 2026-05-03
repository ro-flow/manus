import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Users, ChevronLeft, Mail, Building2 } from "lucide-react";
import { useLocation } from "wouter";

export default function SeatsBeheer() {
  const [, setLocation] = useLocation();
  
  const { data: seatsData, isLoading } = trpc.seats.listAll.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Seats Overzicht</h1>
            <p className="text-muted-foreground">Alle gebruikers en hun licenties</p>
          </div>
        </div>

        {/* Seats List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Alle Seats ({seatsData?.length || 0})</CardTitle>
            <CardDescription>Overzicht van alle geregistreerde seats</CardDescription>
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
                {seatsData?.map(({ seat, gemeente }) => (
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
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {gemeente?.gemeenteNaam || 'Onbekend'}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        seat.status === 'actief' 
                          ? 'bg-green-100 text-green-800' 
                          : seat.status === 'uitgenodigd'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {seat.status === 'actief' ? 'Actief' : 
                         seat.status === 'uitgenodigd' ? 'Uitgenodigd' : 
                         seat.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        seat.rol === 'beheerder' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {seat.rol}
                      </span>
                    </div>
                  </div>
                ))}
                
                {seatsData?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nog geen seats geregistreerd
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

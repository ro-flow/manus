import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Building2, Search, Plus, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function GemeentenBeheer() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: gemeenten, isLoading } = trpc.gemeente.list.useQuery();

  const filteredGemeenten = gemeenten?.filter(g => 
    g.gemeenteNaam.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.provincie.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-2xl font-bold tracking-tight">Gemeenten Beheer</h1>
              <p className="text-muted-foreground">Beheer alle geregistreerde gemeenten</p>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Gemeente
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of provincie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Gemeenten List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Alle Gemeenten ({filteredGemeenten?.length || 0})</CardTitle>
            <CardDescription>Klik op een gemeente voor details</CardDescription>
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
                {filteredGemeenten?.map((gemeente) => (
                  <div 
                    key={gemeente.id} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{gemeente.gemeenteNaam}</div>
                        <div className="text-sm text-muted-foreground">
                          {gemeente.provincie} • CBS: {gemeente.gemeenteCode}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{gemeente.seatsGekocht || 0} seats</div>
                        <div className="text-xs text-muted-foreground">
                          {gemeente.vrCode || 'Geen VR'}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                
                {filteredGemeenten?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Geen gemeenten gevonden
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

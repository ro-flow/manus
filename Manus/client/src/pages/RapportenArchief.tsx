import { useState, useMemo } from "react";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  MapPin, 
  FileText, 
  User, 
  Calendar,
  Download,
  Eye,
  Leaf,
  Building2,
  Landmark,
  Droplets,
  List,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { MapView } from "@/components/Map";

interface RapportItem {
  id: number;
  zaaknummer: string;
  projectNaam: string | null;
  aanvragerNaam: string | null;
  adres: string | null;
  woonplaats: string | null;
  behandelaarNaam: string | null;
  behandelaarEmail: string | null;
  procedureType: string | null;
  isVergunningvrij: boolean | null;
  isNatura2000: boolean | null;
  isRijksmonument: boolean | null;
  isBeschermdGezicht: boolean | null;
  isGrondwaterbescherming: boolean | null;
  rapportSamenvatting: string | null;
  pdfUrl: string | null;
  status: string | null;
  datumRapport: Date;
}

interface KaartRapport {
  id: number;
  zaaknummer: string;
  adres: string | null;
  wgs84Lat: string | null;
  wgs84Lng: string | null;
  procedureType: string | null;
  isNatura2000: boolean | null;
  isRijksmonument: boolean | null;
  isBeschermdGezicht: boolean | null;
  isGrondwaterbescherming: boolean | null;
  behandelaarNaam: string | null;
  datumRapport: Date;
}

function ProcedureBadge({ type }: { type: string | null }) {
  if (!type) return null;
  
  const colors: Record<string, string> = {
    'VERGUNNINGVRIJ': 'bg-green-100 text-green-800',
    'REGULIER': 'bg-blue-100 text-blue-800',
    'BOPA_REGULIER': 'bg-orange-100 text-orange-800',
    'BOPA_UITGEBREID': 'bg-red-100 text-red-800',
  };
  
  const labels: Record<string, string> = {
    'VERGUNNINGVRIJ': 'Vergunningvrij',
    'REGULIER': 'Regulier',
    'BOPA_REGULIER': 'BOPA Regulier',
    'BOPA_UITGEBREID': 'BOPA Uitgebreid',
  };
  
  return (
    <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
      {labels[type] || type}
    </Badge>
  );
}

function GebiedIndicators({ rapport }: { rapport: RapportItem | KaartRapport }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {rapport.isNatura2000 && (
        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
          <Leaf className="w-3 h-3 mr-1" />
          N2000
        </Badge>
      )}
      {rapport.isRijksmonument && (
        <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
          <Landmark className="w-3 h-3 mr-1" />
          Monument
        </Badge>
      )}
      {rapport.isBeschermdGezicht && (
        <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs">
          <Building2 className="w-3 h-3 mr-1" />
          Beschermd
        </Badge>
      )}
      {rapport.isGrondwaterbescherming && (
        <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
          <Droplets className="w-3 h-3 mr-1" />
          Grondwater
        </Badge>
      )}
    </div>
  );
}

function RapportCard({ rapport, onView }: { rapport: RapportItem; onView: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-sm">{rapport.zaaknummer}</h3>
            {rapport.projectNaam && (
              <p className="text-sm text-muted-foreground">{rapport.projectNaam}</p>
            )}
          </div>
          <ProcedureBadge type={rapport.procedureType} />
        </div>
        
        <div className="space-y-1 text-sm text-muted-foreground mb-3">
          {rapport.adres && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{rapport.adres}{rapport.woonplaats ? `, ${rapport.woonplaats}` : ''}</span>
            </div>
          )}
          {rapport.behandelaarNaam && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{rapport.behandelaarNaam}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(rapport.datumRapport).toLocaleDateString('nl-NL')}</span>
          </div>
        </div>
        
        <GebiedIndicators rapport={rapport} />
        
        {rapport.rapportSamenvatting && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {rapport.rapportSamenvatting}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RapportDetailDialog({ 
  rapport, 
  open, 
  onClose,
  onPreview
}: { 
  rapport: RapportItem | null; 
  open: boolean; 
  onClose: () => void;
  onPreview?: (pdfUrl: string, title: string, filename: string) => void;
}) {
  if (!rapport) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{rapport.zaaknummer}</span>
            <ProcedureBadge type={rapport.procedureType} />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {rapport.projectNaam && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Project</h4>
              <p>{rapport.projectNaam}</p>
            </div>
          )}
          
          {rapport.aanvragerNaam && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Aanvrager</h4>
              <p>{rapport.aanvragerNaam}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Locatie</h4>
              <p>{rapport.adres || 'Onbekend'}</p>
              {rapport.woonplaats && <p className="text-sm text-muted-foreground">{rapport.woonplaats}</p>}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Behandelaar</h4>
              <p>{rapport.behandelaarNaam || 'Onbekend'}</p>
              {rapport.behandelaarEmail && (
                <a href={`mailto:${rapport.behandelaarEmail}`} className="text-sm text-primary hover:underline">
                  {rapport.behandelaarEmail}
                </a>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Gebiedskenmerken</h4>
            <GebiedIndicators rapport={rapport} />
            {!rapport.isNatura2000 && !rapport.isRijksmonument && !rapport.isBeschermdGezicht && !rapport.isGrondwaterbescherming && (
              <p className="text-sm text-muted-foreground">Geen bijzondere gebiedskenmerken</p>
            )}
          </div>
          
          {rapport.rapportSamenvatting && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Samenvatting</h4>
              <p className="text-sm">{rapport.rapportSamenvatting}</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-4 border-t">
            {rapport.pdfUrl && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    onPreview?.(rapport.pdfUrl!, `Behandelrapport ${rapport.zaaknummer}`, `behandelrapport_${rapport.zaaknummer}.pdf`);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button asChild>
                  <a href={rapport.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KaartWeergave({ gemeenteId }: { gemeenteId: number }) {
  const { data: kaartData, isLoading } = trpc.behandelrapport.kaartData.useQuery({ gemeenteId });
  const [selectedRapport, setSelectedRapport] = useState<KaartRapport | null>(null);
  
  const markers = useMemo(() => {
    if (!kaartData) return [];
    return kaartData
      .filter(r => r.wgs84Lat && r.wgs84Lng)
      .map(r => ({
        id: r.id,
        lat: parseFloat(r.wgs84Lat!),
        lng: parseFloat(r.wgs84Lng!),
        title: r.zaaknummer,
        data: r,
      }));
  }, [kaartData]);
  
  if (isLoading) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Kaart laden...</p>
      </div>
    );
  }
  
  if (markers.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center">
          <MapIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Geen rapporten met locatiegegevens</p>
        </div>
      </div>
    );
  }
  
  // Calculate center from markers
  const center = {
    lat: markers.reduce((sum, m) => sum + m.lat, 0) / markers.length,
    lng: markers.reduce((sum, m) => sum + m.lng, 0) / markers.length,
  };
  
  return (
    <div className="relative">
      <div className="h-[500px] rounded-lg overflow-hidden">
        <MapView
          initialCenter={center}
          initialZoom={12}
          onMapReady={(map) => {
            // Add markers using AdvancedMarkerElement
            markers.forEach(marker => {
              const markerElement = new window.google.maps.marker.AdvancedMarkerElement({
                position: { lat: marker.lat, lng: marker.lng },
                map,
                title: marker.title,
              });
              
              const infoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px; max-width: 250px;">
                    <strong>${marker.data.zaaknummer}</strong>
                    <p style="margin: 4px 0; font-size: 12px; color: #666;">${marker.data.adres || 'Geen adres'}</p>
                    <p style="margin: 4px 0; font-size: 12px;">${marker.data.behandelaarNaam || 'Geen behandelaar'}</p>
                    <p style="margin: 4px 0; font-size: 11px; color: #888;">${new Date(marker.data.datumRapport).toLocaleDateString('nl-NL')}</p>
                  </div>
                `,
              });
              
              markerElement.addListener('click', () => {
                infoWindow.open(map, markerElement);
                setSelectedRapport(marker.data);
              });
            });
          }}
        />
      </div>
      
      {selectedRapport && (
        <Card className="absolute bottom-4 left-4 right-4 max-w-md">
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-sm">{selectedRapport.zaaknummer}</h4>
                <p className="text-xs text-muted-foreground">{selectedRapport.adres}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedRapport.behandelaarNaam} • {new Date(selectedRapport.datumRapport).toLocaleDateString('nl-NL')}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedRapport(null)}>
                ×
              </Button>
            </div>
            <div className="mt-2">
              <GebiedIndicators rapport={selectedRapport} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RapportenArchief() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'lijst' | 'kaart'>('lijst');
  const [zoekterm, setZoekterm] = useState('');
  const [behandelaar, setBehandelaar] = useState<string>('');
  const [procedureType, setProcedureType] = useState<string>('');
  const [page, setPage] = useState(0);
  const [selectedRapport, setSelectedRapport] = useState<RapportItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewFilename, setPreviewFilename] = useState<string>('rapport.pdf');
  
  const gemeenteId = user?.gemeenteId || 1; // Default to 1 for demo
  const limit = 20;
  
  const { data: archiefData, isLoading } = trpc.behandelrapport.archief.useQuery({
    gemeenteId,
    zoekterm: zoekterm || undefined,
    behandelaar: behandelaar || undefined,
    procedureType: procedureType as any || undefined,
    limit,
    offset: page * limit,
  });
  
  const { data: behandelaars } = trpc.behandelrapport.behandelaars.useQuery({ gemeenteId });
  
  const totalPages = Math.ceil((archiefData?.total || 0) / limit);
  
  const handleViewRapport = (rapport: RapportItem) => {
    setSelectedRapport(rapport);
    setDialogOpen(true);
  };
  
  const clearFilters = () => {
    setZoekterm('');
    setBehandelaar('');
    setProcedureType('');
    setPage(0);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Rapportenarchief</h1>
          <p className="text-muted-foreground">
            Bekijk en doorzoek alle behandelrapporten van je gemeente
          </p>
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op zaaknummer, adres, project..."
                    value={zoekterm}
                    onChange={(e) => { setZoekterm(e.target.value); setPage(0); }}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Select value={behandelaar} onValueChange={(v) => { setBehandelaar(v); setPage(0); }}>
                <SelectTrigger className="w-[200px]">
                  <User className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Behandelaar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle behandelaars</SelectItem>
                  {behandelaars?.map((b) => (
                    <SelectItem key={b.email} value={b.email!}>
                      {b.naam || b.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={procedureType} onValueChange={(v) => { setProcedureType(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Procedure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle procedures</SelectItem>
                  <SelectItem value="VERGUNNINGVRIJ">Vergunningvrij</SelectItem>
                  <SelectItem value="REGULIER">Regulier</SelectItem>
                  <SelectItem value="BOPA_REGULIER">BOPA Regulier</SelectItem>
                  <SelectItem value="BOPA_UITGEBREID">BOPA Uitgebreid</SelectItem>
                </SelectContent>
              </Select>
              
              {(zoekterm || behandelaar || procedureType) && (
                <Button variant="ghost" onClick={clearFilters}>
                  Filters wissen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Tabs: Lijst / Kaart */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lijst' | 'kaart')}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="lijst">
                <List className="w-4 h-4 mr-2" />
                Lijst ({archiefData?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="kaart">
                <MapIcon className="w-4 h-4 mr-2" />
                Kaart
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="lijst" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-40" />
                  </Card>
                ))}
              </div>
            ) : archiefData?.rapporten.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Geen rapporten gevonden</h3>
                  <p className="text-muted-foreground">
                    {zoekterm || behandelaar || procedureType 
                      ? 'Probeer andere zoektermen of filters'
                      : 'Er zijn nog geen rapporten in het archief'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archiefData?.rapporten.map((rapport) => (
                    <RapportCard 
                      key={rapport.id} 
                      rapport={rapport as RapportItem}
                      onView={() => handleViewRapport(rapport as RapportItem)}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Pagina {page + 1} van {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="kaart" className="mt-4">
            <KaartWeergave gemeenteId={gemeenteId} />
          </TabsContent>
        </Tabs>
      </div>
      
      <RapportDetailDialog
        rapport={selectedRapport}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPreview={(pdfUrl, title, filename) => {
          setPreviewPdfUrl(pdfUrl);
          setPreviewTitle(title);
          setPreviewFilename(filename);
        }}
      />
      
      {/* PDF Preview Modal */}
      <PdfPreviewModal
        pdfUrl={previewPdfUrl}
        isOpen={!!previewPdfUrl}
        onClose={() => setPreviewPdfUrl(null)}
        title={previewTitle}
        filename={previewFilename}
      />
    </DashboardLayout>
  );
}

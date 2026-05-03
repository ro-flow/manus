import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Plus, Pencil, Trash2, Search, Filter, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

// Activiteit types
const ACTIVITEIT_TYPES = [
  'nieuwbouw', 'uitbreiding', 'verbouw', 'renovatie', 'sloop', 'functiewijziging',
  'splitsen', 'samenvoegen', 'dakkapel', 'dakopbouw', 'aanbouw', 'bijgebouw',
  'erfafscheiding', 'reclame', 'terras', 'parkeren', 'opslag', 'evenement',
  'horeca', 'detailhandel', 'kantoor', 'overig'
];

// Functie types
const FUNCTIE_TYPES = [
  'wonen', 'horeca', 'detailhandel', 'kantoor', 'bedrijf', 'maatschappelijk',
  'sport', 'recreatie', 'agrarisch', 'groen', 'verkeer', 'water', 'gemengd', 'overig'
];

interface ToetsingsRegel {
  id: number;
  activiteitType: string;
  functieType: string;
  verplichteKaders: unknown; // JSON from database
  optioneleKaders: unknown | null;
  aandachtspunten: string | null;
  toelichting: string | null;
  status: 'actief' | 'inactief' | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to parse JSON kaders
function parseKaders(kaders: unknown): string[] {
  if (Array.isArray(kaders)) return kaders as string[];
  if (typeof kaders === 'string') {
    try { return JSON.parse(kaders); } catch { return []; }
  }
  return [];
}

// Helper to parse aandachtspunten
function parseAandachtspunten(ap: string | null): string[] {
  if (!ap) return [];
  return ap.split(';').map(s => s.trim()).filter(Boolean);
}

export default function ToetsingsmatrixBeheer() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActiviteit, setFilterActiviteit] = useState<string>('');
  const [filterFunctie, setFilterFunctie] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegel, setEditingRegel] = useState<ToetsingsRegel | null>(null);
  
  // Form state
  const [formActiviteit, setFormActiviteit] = useState('');
  const [formFunctie, setFormFunctie] = useState('');
  const [formVerplicht, setFormVerplicht] = useState('');
  const [formOptioneel, setFormOptioneel] = useState('');
  const [formAandachtspunten, setFormAandachtspunten] = useState('');

  // tRPC queries
  const { data: regels, isLoading, refetch } = trpc.toetsingsmatrix.list.useQuery();
  const createMutation = trpc.toetsingsmatrix.create.useMutation({
    onSuccess: () => {
      toast.success('Toetsingsregel toegevoegd');
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    }
  });
  const updateMutation = trpc.toetsingsmatrix.update.useMutation({
    onSuccess: () => {
      toast.success('Toetsingsregel bijgewerkt');
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    }
  });
  const deleteMutation = trpc.toetsingsmatrix.delete.useMutation({
    onSuccess: () => {
      toast.success('Toetsingsregel verwijderd');
      refetch();
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    }
  });

  const resetForm = () => {
    setFormActiviteit('');
    setFormFunctie('');
    setFormVerplicht('');
    setFormOptioneel('');
    setFormAandachtspunten('');
    setEditingRegel(null);
  };

  const openEditDialog = (regel: ToetsingsRegel) => {
    setEditingRegel(regel);
    setFormActiviteit(regel.activiteitType);
    setFormFunctie(regel.functieType);
    setFormVerplicht(parseKaders(regel.verplichteKaders).join('\n'));
    setFormOptioneel(parseKaders(regel.optioneleKaders).join('\n'));
    setFormAandachtspunten(parseAandachtspunten(regel.aandachtspunten).join('\n'));
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      activiteitType: formActiviteit,
      functieType: formFunctie,
      verplichtekaders: formVerplicht.split('\n').filter(k => k.trim()),
      optioneleKaders: formOptioneel.split('\n').filter(k => k.trim()),
      aandachtspunten: formAandachtspunten.split('\n').filter(a => a.trim())
    };

    if (editingRegel) {
      updateMutation.mutate({ id: editingRegel.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Weet je zeker dat je deze toetsingsregel wilt verwijderen?')) {
      deleteMutation.mutate({ id });
    }
  };

  // Filter regels
  const filteredRegels = (regels || []).filter(regel => {
    const kaders = parseKaders(regel.verplichteKaders);
    const matchesSearch = searchTerm === '' || 
      regel.activiteitType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regel.functieType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kaders.some((k: string) => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesActiviteit = filterActiviteit === '' || regel.activiteitType === filterActiviteit;
    const matchesFunctie = filterFunctie === '' || regel.functieType === filterFunctie;
    
    return matchesSearch && matchesActiviteit && matchesFunctie;
  });

  // Check admin access
  if (!user || !['super_admin', 'admin', 'gemeente_beheerder'].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Geen toegang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Je hebt geen toegang tot deze pagina. Alleen beheerders kunnen de toetsingsmatrix aanpassen.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Toetsingsmatrix Beheer</h1>
            <p className="text-muted-foreground">
              Bepaal welke toetsingskaders verplicht of optioneel zijn per activiteit en functie combinatie
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe regel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRegel ? 'Toetsingsregel bewerken' : 'Nieuwe toetsingsregel'}
                </DialogTitle>
                <DialogDescription>
                  Definieer welke toetsingskaders van toepassing zijn voor deze activiteit/functie combinatie
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Activiteittype</Label>
                    <Select value={formActiviteit} onValueChange={setFormActiviteit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer activiteit" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITEIT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Functietype</Label>
                    <Select value={formFunctie} onValueChange={setFormFunctie}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer functie" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNCTIE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Verplichte toetsingskaders (één per regel)</Label>
                  <Textarea 
                    value={formVerplicht}
                    onChange={(e) => setFormVerplicht(e.target.value)}
                    placeholder="Welstandsnota&#10;Parkeerbeleid&#10;Omgevingsplan"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deze kaders MOETEN altijd worden getoetst bij deze combinatie
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Optionele toetsingskaders (één per regel)</Label>
                  <Textarea 
                    value={formOptioneel}
                    onChange={(e) => setFormOptioneel(e.target.value)}
                    placeholder="Duurzaamheidsbeleid&#10;Groenbeleid"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deze kaders KAN de AI raadplegen indien relevant
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Aandachtspunten (één per regel)</Label>
                  <Textarea 
                    value={formAandachtspunten}
                    onChange={(e) => setFormAandachtspunten(e.target.value)}
                    placeholder="Let op tweezijdige werking bij horeca&#10;Check parkeerbalans"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formActiviteit || !formFunctie || createMutation.isPending || updateMutation.isPending}
                >
                  {editingRegel ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Hoe werkt de toetsingsmatrix?</p>
                <p>
                  Bij elke aanvraag detecteert de AI automatisch het activiteittype en de functie. 
                  Op basis van deze combinatie worden de verplichte en optionele toetsingskaders bepaald.
                  Verplichte kaders worden altijd meegenomen in de analyse, optionele alleen indien relevant.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op activiteit, functie of toetsingskader..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterActiviteit} onValueChange={setFilterActiviteit}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Alle activiteiten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle activiteiten</SelectItem>
                    {ACTIVITEIT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterFunctie} onValueChange={setFilterFunctie}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Alle functies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle functies</SelectItem>
                    {FUNCTIE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRegels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Filter className="h-12 w-12 mb-4 opacity-50" />
                <p>Geen toetsingsregels gevonden</p>
                <p className="text-sm">Pas de filters aan of voeg een nieuwe regel toe</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activiteit</TableHead>
                    <TableHead>Functie</TableHead>
                    <TableHead>Verplichte kaders</TableHead>
                    <TableHead>Optionele kaders</TableHead>
                    <TableHead>Aandachtspunten</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegels.map((regel) => (
                    <TableRow key={regel.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {regel.activiteitType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {regel.functieType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {parseKaders(regel.verplichteKaders).slice(0, 3).map((kader, i) => (
                            <Badge key={i} className="bg-red-100 text-red-800 hover:bg-red-100">
                              {kader}
                            </Badge>
                          ))}
                          {parseKaders(regel.verplichteKaders).length > 3 && (
                            <Badge variant="outline">+{parseKaders(regel.verplichteKaders).length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {parseKaders(regel.optioneleKaders).slice(0, 2).map((kader, i) => (
                            <Badge key={i} variant="outline" className="bg-blue-50">
                              {kader}
                            </Badge>
                          ))}
                          {parseKaders(regel.optioneleKaders).length > 2 && (
                            <Badge variant="outline">+{parseKaders(regel.optioneleKaders).length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {parseAandachtspunten(regel.aandachtspunten).length > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                            {parseAandachtspunten(regel.aandachtspunten).length} punt(en)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(regel)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(regel.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {regels && regels.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{regels.length}</div>
                <p className="text-sm text-muted-foreground">Totaal regels</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {new Set(regels.map(r => r.activiteitType)).size}
                </div>
                <p className="text-sm text-muted-foreground">Activiteittypes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {new Set(regels.map(r => r.functieType)).size}
                </div>
                <p className="text-sm text-muted-foreground">Functietypes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {regels.reduce((sum, r) => sum + parseKaders(r.verplichteKaders).length, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Verplichte kaders</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

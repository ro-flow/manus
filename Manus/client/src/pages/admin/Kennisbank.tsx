/**
 * Kennisbank Admin Page
 * 
 * AI-gestuurde kennisbank met human-in-the-loop validatie.
 * Beheerders kunnen AI-suggesties bekijken, aanpassen en goedkeuren.
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Sparkles, 
  BookOpen, 
  Users, 
  FileText, 
  Building2, 
  RefreshCw,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Scale,
  Shield,
  Droplets,
  Flame,
  Stethoscope,
  Landmark,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// Types
interface AdviseurSuggestie {
  naam: string;
  type: 'intern' | 'extern';
  categorie: string;
  triggers: string[];
  termijnWeken: number;
  grondslag: string;
  contactInfo?: string;
  isVerplicht: boolean;
  selected?: boolean;
}

interface BeleidsdocumentSuggestie {
  naam: string;
  type: 'welstandsnota' | 'parkeerbeleid' | 'erfgoedbeleid' | 'beleidsregels_afwijken' | 'gezondheidsbeleid' | 'groenbeleid' | 'overig';
  beschrijving: string;
  zoekterm: string;
  relevantieTags: string[];
  url?: string;
  selected?: boolean;
  // Gelaagde structuur
  laag?: 'rijks' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
  scopeCode?: string;
  toepassingscriteria?: string;
}

// Category icons
const categorieIcons: Record<string, React.ReactNode> = {
  'Erfgoed': <Landmark className="h-4 w-4" />,
  'Natuur': <Droplets className="h-4 w-4" />,
  'Milieu': <Shield className="h-4 w-4" />,
  'Brandveiligheid': <Flame className="h-4 w-4" />,
  'Veiligheid': <Flame className="h-4 w-4" />,
  'Gezondheid': <Stethoscope className="h-4 w-4" />,
  'Waterhuishouding': <Droplets className="h-4 w-4" />,
  'Welstand': <Building2 className="h-4 w-4" />,
  'Ruimtelijke kwaliteit': <Building2 className="h-4 w-4" />,
  'Infrastructuur': <Scale className="h-4 w-4" />,
};

export default function KennisbankPage() {
  const { user } = useAuth();
  const [selectedGemeenteId, setSelectedGemeenteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overzicht');
  const [suggestedAdviseurs, setSuggestedAdviseurs] = useState<AdviseurSuggestie[]>([]);
  const [suggestedDocumenten, setSuggestedDocumenten] = useState<BeleidsdocumentSuggestie[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddAdviseur, setShowAddAdviseur] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);

  // Queries
  const { data: gemeenten } = trpc.gemeente.list.useQuery();
  const { data: kennisbank, refetch: refetchKennisbank } = trpc.kennisbank.getForGemeente.useQuery(
    { gemeenteId: selectedGemeenteId! },
    { enabled: !!selectedGemeenteId }
  );
  const { data: stats } = trpc.kennisbank.stats.useQuery();

  // Mutations
  const generateSuggestions = trpc.kennisbank.generateSuggestions.useMutation({
    onSuccess: (data) => {
      if (data.suggestions) {
        setSuggestedAdviseurs(data.suggestions.adviseurs.map(a => ({ ...a, selected: true })));
        setSuggestedDocumenten(data.suggestions.beleidsdocumenten.map(d => ({ ...d, selected: true })));
        setActiveTab('suggesties');
        toast.success('AI-suggesties gegenereerd!');
      }
    },
    onError: (error) => {
      toast.error('Kon geen suggesties genereren: ' + error.message);
    },
  });

  const applySuggestions = trpc.kennisbank.applySuggestions.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.adviseursCreated} adviseurs en ${data.documentsCreated} documenten toegevoegd`);
      setSuggestedAdviseurs([]);
      setSuggestedDocumenten([]);
      setActiveTab('overzicht');
      refetchKennisbank();
    },
    onError: (error) => {
      toast.error('Kon suggesties niet toepassen: ' + error.message);
    },
  });

  const createAdviseur = trpc.adviseurs.create.useMutation({
    onSuccess: () => {
      toast.success('Adviseur toegevoegd');
      setShowAddAdviseur(false);
      refetchKennisbank();
    },
  });

  const createDocument = trpc.beleidsdocumenten.create.useMutation({
    onSuccess: () => {
      toast.success('Document toegevoegd');
      setShowAddDocument(false);
      refetchKennisbank();
    },
  });

  const deleteAdviseur = trpc.adviseurs.delete.useMutation({
    onSuccess: () => {
      toast.success('Adviseur verwijderd');
      refetchKennisbank();
    },
  });

  const deleteDocument = trpc.beleidsdocumenten.delete.useMutation({
    onSuccess: () => {
      toast.success('Document verwijderd');
      refetchKennisbank();
    },
  });

  // Handlers
  const handleGenerateSuggestions = async () => {
    if (!selectedGemeenteId) return;
    setIsGenerating(true);
    try {
      await generateSuggestions.mutateAsync({ gemeenteId: selectedGemeenteId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestions = async () => {
    if (!selectedGemeenteId) return;
    
    const selectedAdviseurs = suggestedAdviseurs.filter(a => a.selected);
    const selectedDocumenten = suggestedDocumenten.filter(d => d.selected);
    
    if (selectedAdviseurs.length === 0 && selectedDocumenten.length === 0) {
      toast.error('Selecteer minimaal één item om toe te voegen');
      return;
    }
    
    await applySuggestions.mutateAsync({
      gemeenteId: selectedGemeenteId,
      adviseurs: selectedAdviseurs.map(({ selected, ...a }) => a),
      beleidsdocumenten: selectedDocumenten.map(({ selected, zoekterm, ...d }) => ({
        ...d,
        relevantieTags: d.relevantieTags,
      })),
    });
  };

  const toggleAdviseurSelection = (index: number) => {
    setSuggestedAdviseurs(prev => 
      prev.map((a, i) => i === index ? { ...a, selected: !a.selected } : a)
    );
  };

  const toggleDocumentSelection = (index: number) => {
    setSuggestedDocumenten(prev => 
      prev.map((d, i) => i === index ? { ...d, selected: !d.selected } : d)
    );
  };

  // Check admin access
  if (!user || !['super_admin', 'admin', 'gemeente_beheerder'].includes(user.role)) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <p>Je hebt geen toegang tot deze pagina.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Kennisbank Beheer
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-gestuurde kennisbank met human-in-the-loop validatie
          </p>
        </div>
        
        {/* Gemeente selector */}
        <div className="flex items-center gap-4">
          <Select
            value={selectedGemeenteId?.toString() || ''}
            onValueChange={(v) => setSelectedGemeenteId(parseInt(v))}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecteer gemeente" />
            </SelectTrigger>
            <SelectContent>
              {gemeenten?.map((g) => (
                <SelectItem key={g.id} value={g.id.toString()}>
                  {g.gemeenteNaam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedGemeenteId && (
            <Button
              onClick={handleGenerateSuggestions}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI Suggesties
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAdviseurs}</p>
                  <p className="text-sm text-muted-foreground">Adviseurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalBeleidsdocumenten}</p>
                  <p className="text-sm text-muted-foreground">Documenten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.gemeentenMetBeleid}</p>
                  <p className="text-sm text-muted-foreground">Gemeenten met beleid</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Scale className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.landelijkeAdviseurs}</p>
                  <p className="text-sm text-muted-foreground">Landelijke adviseurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main content */}
      {selectedGemeenteId && kennisbank ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
            <TabsTrigger value="adviseurs">
              Adviseurs ({kennisbank.adviseurs.length})
            </TabsTrigger>
            <TabsTrigger value="documenten">
              Documenten ({kennisbank.beleidsdocumenten.length})
            </TabsTrigger>
            <TabsTrigger value="landelijk">
              Landelijk ({kennisbank.rijksWetgeving?.length || 0})
            </TabsTrigger>
            {(suggestedAdviseurs.length > 0 || suggestedDocumenten.length > 0) && (
              <TabsTrigger value="suggesties" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Suggesties
                <Badge variant="secondary" className="ml-1">
                  {suggestedAdviseurs.length + suggestedDocumenten.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overzicht Tab */}
          <TabsContent value="overzicht" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {kennisbank.gemeente.naam}
                </CardTitle>
                <CardDescription>
                  Provincie {kennisbank.gemeente.provincie}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Regionale organisaties</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Waterschap:</span>
                        <span>{kennisbank.gemeente.waterschap || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Veiligheidsregio:</span>
                        <span>{kennisbank.gemeente.veiligheidsregio || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Omgevingsdienst:</span>
                        <span>{kennisbank.gemeente.omgevingsdienst || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GGD:</span>
                        <span>{kennisbank.gemeente.ggd || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Kennisbank status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adviseurs:</span>
                        <span>{kennisbank.adviseurs.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Beleidsdocumenten:</span>
                        <span>{kennisbank.beleidsdocumenten.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Laatst bijgewerkt:</span>
                        <span>
                          {new Date(kennisbank.laatstBijgewerkt).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab('adviseurs')}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span>Adviseurs beheren</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab('documenten')}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span>Documenten beheren</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:border-primary transition-colors bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                onClick={handleGenerateSuggestions}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <span className="text-purple-900">AI Suggesties genereren</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Adviseurs Tab */}
          <TabsContent value="adviseurs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Adviseurs ({kennisbank.adviseurs.length})</h3>
              <Dialog open={showAddAdviseur} onOpenChange={setShowAddAdviseur}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adviseur toevoegen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe adviseur</DialogTitle>
                    <DialogDescription>
                      Voeg een nieuwe adviseur toe aan de kennisbank
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createAdviseur.mutate({
                      naam: formData.get('naam') as string,
                      type: formData.get('type') as 'intern' | 'extern',
                      categorie: formData.get('categorie') as string,
                      triggers: (formData.get('triggers') as string).split(',').map(t => t.trim()),
                      termijnWeken: parseInt(formData.get('termijnWeken') as string) || 4,
                      grondslag: formData.get('grondslag') as string,
                      contactEmail: formData.get('contactEmail') as string || undefined,
                    });
                  }}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="naam">Naam</Label>
                        <Input id="naam" name="naam" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select name="type" defaultValue="extern">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="intern">Intern</SelectItem>
                              <SelectItem value="extern">Extern</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="termijnWeken">Termijn (weken)</Label>
                          <Input id="termijnWeken" name="termijnWeken" type="number" defaultValue={4} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="categorie">Categorie</Label>
                        <Input id="categorie" name="categorie" placeholder="bijv. Erfgoed, Milieu" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggers">Triggers (komma-gescheiden)</Label>
                        <Textarea id="triggers" name="triggers" placeholder="rijksmonument, beschermd_gezicht" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grondslag">Grondslag</Label>
                        <Input id="grondslag" name="grondslag" placeholder="bijv. Erfgoedwet art. 9.32" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact email</Label>
                        <Input id="contactEmail" name="contactEmail" type="email" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddAdviseur(false)}>
                        Annuleren
                      </Button>
                      <Button type="submit" disabled={createAdviseur.isPending}>
                        {createAdviseur.isPending ? 'Toevoegen...' : 'Toevoegen'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {kennisbank.adviseurs.map((adviseur) => (
                <Card key={adviseur.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          {categorieIcons[adviseur.categorie || ''] || <Users className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{adviseur.naam}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={adviseur.type === 'extern' ? 'default' : 'secondary'}>
                              {adviseur.type}
                            </Badge>
                            {adviseur.categorie && (
                              <Badge variant="outline">{adviseur.categorie}</Badge>
                            )}
                            {adviseur.isLandelijk && (
                              <Badge variant="outline" className="bg-blue-50">Landelijk</Badge>
                            )}
                          </div>
                          {adviseur.triggers && adviseur.triggers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {adviseur.triggers.map((trigger: string, i: number) => (
                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {trigger}
                                </span>
                              ))}
                            </div>
                          )}
                          {adviseur.grondslag && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Grondslag: {adviseur.grondslag}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {adviseur.termijnWeken} weken
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Weet je zeker dat je deze adviseur wilt verwijderen?')) {
                              deleteAdviseur.mutate({ id: adviseur.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {kennisbank.adviseurs.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nog geen adviseurs toegevoegd</p>
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={handleGenerateSuggestions}
                      >
                        <Sparkles className="h-4 w-4" />
                        Genereer AI suggesties
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Documenten Tab */}
          <TabsContent value="documenten" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Beleidsdocumenten ({kennisbank.beleidsdocumenten.length})</h3>
              <Dialog open={showAddDocument} onOpenChange={setShowAddDocument}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Document toevoegen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuw beleidsdocument</DialogTitle>
                    <DialogDescription>
                      Voeg een beleidsdocument toe aan de kennisbank
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createDocument.mutate({
                      documentNaam: formData.get('naam') as string,
                      documentType: formData.get('type') as any,
                      gemeenteId: selectedGemeenteId!,
                      url: formData.get('url') as string || undefined,
                      relevantieTags: formData.get('tags') as string || undefined,
                    });
                  }}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="naam">Naam</Label>
                        <Input id="naam" name="naam" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select name="type" defaultValue="overig">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="welstandsnota">Welstandsnota</SelectItem>
                            <SelectItem value="parkeerbeleid">Parkeerbeleid</SelectItem>
                            <SelectItem value="erfgoedbeleid">Erfgoedbeleid</SelectItem>
                            <SelectItem value="beleidsregels_afwijken">Beleidsregels afwijken</SelectItem>
                            <SelectItem value="overig">Overig</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input id="url" name="url" type="url" placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags (komma-gescheiden)</Label>
                        <Input id="tags" name="tags" placeholder="welstand, bouwplan, exterieur" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddDocument(false)}>
                        Annuleren
                      </Button>
                      <Button type="submit" disabled={createDocument.isPending}>
                        {createDocument.isPending ? 'Toevoegen...' : 'Toevoegen'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {kennisbank.beleidsdocumenten.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{doc.documentNaam}</h4>
                          <Badge variant="outline" className="mt-1">
                            {doc.documentType}
                          </Badge>
                          {doc.relevantieTags && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doc.relevantieTags.split(',').map((tag, i) => (
                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Weet je zeker dat je dit document wilt verwijderen?')) {
                              deleteDocument.mutate({ id: doc.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {kennisbank.beleidsdocumenten.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nog geen beleidsdocumenten toegevoegd</p>
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={handleGenerateSuggestions}
                      >
                        <Sparkles className="h-4 w-4" />
                        Genereer AI suggesties
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Landelijk Tab - Rijks Wetgeving */}
          <TabsContent value="landelijk" className="space-y-4">
            <h3 className="text-lg font-medium">Landelijke wetgeving (Rijkslaag)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deze wetgeving geldt voor alle gemeenten in Nederland.
            </p>
            <div className="grid gap-4">
              {kennisbank.rijksWetgeving?.map((wet) => (
                <Card key={wet.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Scale className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{wet.wetNaam}</h4>
                          {wet.wetAfkorting && (
                            <Badge variant="outline" className="bg-blue-50">
                              {wet.wetAfkorting}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {wet.samenvatting}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Van toepassing bij: {wet.toepassingscriteria}
                        </p>
                      </div>
                      {wet.bronUrl && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={wet.bronUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!kennisbank.rijksWetgeving || kennisbank.rijksWetgeving.length === 0) && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                      <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Geen rijkswetgeving gevonden</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* AI Suggesties Tab */}
          <TabsContent value="suggesties" className="space-y-6">
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI-gegenereerde suggesties
                </CardTitle>
                <CardDescription>
                  Selecteer de items die je wilt toevoegen aan de kennisbank.
                  Je kunt items aanpassen voordat je ze goedkeurt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    onClick={handleApplySuggestions}
                    disabled={applySuggestions.isPending}
                    className="gap-2"
                  >
                    {applySuggestions.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Toepassen...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Geselecteerde items toevoegen
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuggestedAdviseurs([]);
                      setSuggestedDocumenten([]);
                      setActiveTab('overzicht');
                    }}
                  >
                    Annuleren
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Adviseurs */}
            {suggestedAdviseurs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Voorgestelde adviseurs ({suggestedAdviseurs.filter(a => a.selected).length}/{suggestedAdviseurs.length} geselecteerd)
                </h3>
                <div className="grid gap-3">
                  {suggestedAdviseurs.map((adviseur, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-all ${adviseur.selected ? 'border-primary bg-primary/5' : 'opacity-60'}`}
                      onClick={() => toggleAdviseurSelection(index)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <Checkbox 
                            checked={adviseur.selected} 
                            onCheckedChange={() => toggleAdviseurSelection(index)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{adviseur.naam}</h4>
                              <Badge variant={adviseur.type === 'extern' ? 'default' : 'secondary'}>
                                {adviseur.type}
                              </Badge>
                              <Badge variant="outline">{adviseur.categorie}</Badge>
                              {adviseur.isVerplicht && (
                                <Badge variant="destructive">Verplicht</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {adviseur.triggers.map((trigger, i) => (
                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {trigger}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {adviseur.grondslag} • {adviseur.termijnWeken} weken
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Documents */}
            {suggestedDocumenten.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Voorgestelde documenten ({suggestedDocumenten.filter(d => d.selected).length}/{suggestedDocumenten.length} geselecteerd)
                </h3>
                <div className="grid gap-3">
                  {suggestedDocumenten.map((doc, index) => (
                    <Card 
                      key={index}
                      className={`cursor-pointer transition-all ${doc.selected ? 'border-primary bg-primary/5' : 'opacity-60'}`}
                      onClick={() => toggleDocumentSelection(index)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <Checkbox 
                            checked={doc.selected}
                            onCheckedChange={() => toggleDocumentSelection(index)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{doc.naam}</h4>
                              <Badge variant="outline">{doc.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {doc.beschrijving}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doc.relevantieTags.map((tag, i) => (
                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Zoekterm: "{doc.zoekterm}"
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Selecteer een gemeente</h3>
              <p>Kies een gemeente om de kennisbank te bekijken en beheren</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

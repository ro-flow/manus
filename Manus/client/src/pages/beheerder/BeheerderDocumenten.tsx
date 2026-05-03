import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { FileText, ChevronLeft, Plus, Link, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function BeheerderDocumenten() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    documentNaam: '',
    documentType: 'welstandsnota' as const,
    url: '',
    relevantieTags: '',
    altijdOphalen: false,
  });
  
  const gemeenteId = user?.gemeenteId || 1;
  const { data: gemeente } = trpc.gemeente.getById.useQuery({ id: gemeenteId });
  const { data: documenten, refetch } = trpc.beleidsdocumenten.listByGemeente.useQuery({ gemeenteId });
  
  const createDoc = trpc.beleidsdocumenten.create.useMutation({
    onSuccess: () => {
      toast.success('Document toegevoegd!');
      setIsDialogOpen(false);
      setNewDoc({
        documentNaam: '',
        documentType: 'welstandsnota',
        url: '',
        relevantieTags: '',
        altijdOphalen: false,
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteDoc = trpc.beleidsdocumenten.delete.useMutation({
    onSuccess: () => {
      toast.success('Document verwijderd');
      refetch();
    }
  });

  const handleAddDoc = () => {
    if (!newDoc.documentNaam) {
      toast.error('Documentnaam is verplicht');
      return;
    }
    createDoc.mutate({
      ...newDoc,
      gemeenteId,
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      welstandsnota: 'Welstandsnota',
      parkeerbeleid: 'Parkeerbeleid',
      erfgoedbeleid: 'Erfgoedbeleid',
      beleidsregels_afwijken: 'Beleidsregels Afwijken',
      overig: 'Overig',
    };
    return labels[type] || type;
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
              <h1 className="text-2xl font-bold tracking-tight">Beleidsdocumenten</h1>
              <p className="text-muted-foreground">Koppel documenten aan de kennisbank voor {gemeente?.gemeenteNaam}</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nieuw Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuw Beleidsdocument</DialogTitle>
                <DialogDescription>
                  Voeg een beleidsdocument toe aan de kennisbank
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Documentnaam *</Label>
                  <Input
                    placeholder="bijv. Welstandsnota 2024"
                    value={newDoc.documentNaam}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, documentNaam: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={newDoc.documentType} 
                    onValueChange={(v: any) => setNewDoc(prev => ({ ...prev, documentType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welstandsnota">Welstandsnota</SelectItem>
                      <SelectItem value="parkeerbeleid">Parkeerbeleid</SelectItem>
                      <SelectItem value="erfgoedbeleid">Erfgoedbeleid</SelectItem>
                      <SelectItem value="beleidsregels_afwijken">Beleidsregels Afwijken</SelectItem>
                      <SelectItem value="overig">Overig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    placeholder="https://gemeente.nl/document.pdf"
                    value={newDoc.url}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relevantie Tags</Label>
                  <Input
                    placeholder="welstand, bouwen, exterieur"
                    value={newDoc.relevantieTags}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, relevantieTags: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Komma-gescheiden tags</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Altijd ophalen</Label>
                    <p className="text-xs text-muted-foreground">Document altijd meenemen in analyse</p>
                  </div>
                  <Switch
                    checked={newDoc.altijdOphalen}
                    onCheckedChange={(v) => setNewDoc(prev => ({ ...prev, altijdOphalen: v }))}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddDoc}
                  disabled={createDoc.isPending}
                >
                  {createDoc.isPending ? 'Toevoegen...' : 'Document Toevoegen'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Documents List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Gekoppelde Documenten ({documenten?.length || 0})</CardTitle>
            <CardDescription>Deze documenten worden gebruikt in de AI-analyse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documenten?.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{doc.documentNaam}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted text-xs">
                          {getTypeLabel(doc.documentType)}
                        </span>
                        {doc.altijdOphalen && (
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">
                            Altijd ophalen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {doc.url && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => window.open(doc.url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteDoc.mutate({ id: doc.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {documenten?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nog geen documenten gekoppeld. Klik op "Nieuw Document" om te beginnen.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border shadow-sm bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Link className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Over de Kennisbank</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Documenten die je hier toevoegt worden automatisch geïndexeerd in de 
                  Gemini File Search kennisbank. Bij elke DSO-analyse worden relevante 
                  documenten automatisch meegenomen op basis van de tags en het type aanvraag.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

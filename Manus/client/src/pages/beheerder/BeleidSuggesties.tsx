import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Scale, 
  Search,
  Building2,
  AlertTriangle,
  Info,
  Loader2,
  BookOpen,
  Link2
} from "lucide-react";

interface BeleidSuggestie {
  id: number;
  bron: string;
  bronUrl: string;
  bronType: string;
  gevondenBeleid: string;
  beleidType: string;
  relevantieBeschrijving: string;
  zoekQuery: string;
  status: string;
  createdAt: string;
  rechtspraakEcli?: string;
  rechtspraakTitel?: string;
}

export default function BeleidSuggesties() {
  const { user } = useAuth();
  const [selectedSuggestie, setSelectedSuggestie] = useState<BeleidSuggestie | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch pending suggestions
  const { data: pendingSuggesties, isLoading: loadingPending, refetch: refetchPending } = 
    trpc.beleidSuggestie.getPending.useQuery(
      { gemeenteId: user?.gemeenteId || 0 },
      { enabled: !!user?.gemeenteId }
    );

  // Fetch processed suggestions
  const { data: processedSuggesties, isLoading: loadingProcessed, refetch: refetchProcessed } = 
    trpc.beleidSuggestie.getPending.useQuery(
      { gemeenteId: user?.gemeenteId || 0 },
      { enabled: false } // Processed suggesties - to be implemented
    );

  // Process suggestion mutation
  const processMutation = trpc.beleidSuggestie.accept.useMutation({
    onSuccess: () => {
      refetchPending();
      refetchProcessed();
      setConfirmDialogOpen(false);
      setSelectedSuggestie(null);
      setDocumentUrl("");
    }
  });

  // Reject suggestion mutation
  const rejectMutation = trpc.beleidSuggestie.reject.useMutation({
    onSuccess: () => {
      refetchPending();
      refetchProcessed();
      setConfirmDialogOpen(false);
      setRejectDialogOpen(false);
      setSelectedSuggestie(null);
      setDocumentUrl("");
      setRejectReason("");
    }
  });

  const handleAccept = () => {
    if (!selectedSuggestie) return;
    processMutation.mutate({
      suggestieId: selectedSuggestie.id,
      documentUrl: documentUrl || undefined
    });
  };

  const handleReject = () => {
    if (!selectedSuggestie) return;
    rejectMutation.mutate({
      suggestieId: selectedSuggestie.id,
      reden: rejectReason || undefined
    });
  };

  const openConfirmDialog = (suggestie: BeleidSuggestie) => {
    setSelectedSuggestie(suggestie);
    setDocumentUrl(suggestie.bronUrl || "");
    setConfirmDialogOpen(true);
  };

  const openRejectDialog = (suggestie: BeleidSuggestie) => {
    setSelectedSuggestie(suggestie);
    setRejectDialogOpen(true);
  };

  const getBronTypeIcon = (type: string) => {
    switch (type) {
      case 'rechtspraak':
        return <Scale className="h-4 w-4" />;
      case 'google':
        return <Search className="h-4 w-4" />;
      case 'gemeente':
        return <Building2 className="h-4 w-4" />;
      case 'overheid':
        return <FileText className="h-4 w-4" />;
      default:
        return <Link2 className="h-4 w-4" />;
    }
  };

  const getBronTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'rechtspraak': 'bg-purple-100 text-purple-800',
      'google': 'bg-blue-100 text-blue-800',
      'gemeente': 'bg-green-100 text-green-800',
      'overheid': 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSuggestieCard = (suggestie: BeleidSuggestie, showActions: boolean = true) => (
    <Card key={suggestie.id} className="mb-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getBronTypeBadge(suggestie.bronType)}>
                {getBronTypeIcon(suggestie.bronType)}
                <span className="ml-1 capitalize">{suggestie.bronType}</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {suggestie.beleidType}
              </Badge>
            </div>
            <CardTitle className="text-lg">{suggestie.gevondenBeleid}</CardTitle>
            <CardDescription className="mt-1">
              Gevonden via: {suggestie.bron}
            </CardDescription>
          </div>
          {suggestie.status === 'pending' && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Clock className="h-3 w-3 mr-1" />
              Wacht op beoordeling
            </Badge>
          )}
          {suggestie.status === 'accepted' && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Toegevoegd
            </Badge>
          )}
          {suggestie.status === 'rejected' && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <XCircle className="h-3 w-3 mr-1" />
              Afgewezen
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Relevance description */}
          <div className="bg-stone-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-stone-700">Waarom relevant?</p>
                <p className="text-sm text-stone-600 mt-1">{suggestie.relevantieBeschrijving}</p>
              </div>
            </div>
          </div>

          {/* Source link */}
          {suggestie.bronUrl && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-stone-400" />
              <a 
                href={suggestie.bronUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate max-w-md"
              >
                {suggestie.bronUrl}
              </a>
            </div>
          )}

          {/* Rechtspraak reference */}
          {suggestie.rechtspraakEcli && (
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Scale className="h-4 w-4 text-purple-500" />
              <span>Gebaseerd op jurisprudentie: </span>
              <a 
                href={`https://uitspraken.rechtspraak.nl/#!/details?id=${suggestie.rechtspraakEcli}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                {suggestie.rechtspraakEcli}
              </a>
            </div>
          )}

          {/* Search query used */}
          <div className="text-xs text-stone-500">
            <span className="font-medium">Zoekopdracht:</span> {suggestie.zoekQuery}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-stone-400">
            Gevonden op {formatDate(suggestie.createdAt)}
          </div>

          {/* Action buttons */}
          {showActions && suggestie.status === 'pending' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                onClick={() => openConfirmDialog(suggestie)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Toevoegen aan kennisbank
              </Button>
              <Button 
                variant="outline" 
                onClick={() => openRejectDialog(suggestie)}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Afwijzen
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-800">Beleidsuggesties</h1>
              <p className="text-stone-600">
                Beoordeel gevonden beleidsdocumenten uit jurisprudentie
              </p>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Hoe werkt dit?
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Wanneer Ro-Flow relevante jurisprudentie analyseert, worden verwijzingen naar 
                  beleidsdocumenten automatisch gedetecteerd. Het systeem zoekt vervolgens naar 
                  vergelijkbare documenten voor uw gemeente. Hier kunt u beoordelen of deze 
                  documenten actueel en relevant zijn voordat ze aan uw kennisbank worden toegevoegd.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Te beoordelen
              {pendingSuggesties && pendingSuggesties.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                  {pendingSuggesties.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Verwerkt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {loadingPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
              </div>
            ) : pendingSuggesties && pendingSuggesties.length > 0 ? (
              <div>
                {pendingSuggesties.map((suggestie: BeleidSuggestie) => 
                  renderSuggestieCard(suggestie, true)
                )}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-700">Alles bijgewerkt</h3>
                  <p className="text-stone-500 mt-2">
                    Er zijn momenteel geen beleidsuggesties die beoordeeld moeten worden.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="processed">
            {loadingProcessed ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
              </div>
            ) : processedSuggesties && processedSuggesties.length > 0 ? (
              <div>
                {processedSuggesties.map((suggestie: BeleidSuggestie) => 
                  renderSuggestieCard(suggestie, false)
                )}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-700">Geen verwerkte suggesties</h3>
                  <p className="text-stone-500 mt-2">
                    Verwerkte beleidsuggesties verschijnen hier.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirm Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Beleid toevoegen aan kennisbank
              </DialogTitle>
              <DialogDescription>
                Bevestig dat dit document actueel en relevant is voor uw gemeente.
              </DialogDescription>
            </DialogHeader>

            {selectedSuggestie && (
              <div className="space-y-4 py-4">
                <div className="bg-stone-50 p-3 rounded-lg">
                  <p className="font-medium text-stone-800">{selectedSuggestie.gevondenBeleid}</p>
                  <p className="text-sm text-stone-600 mt-1">{selectedSuggestie.relevantieBeschrijving}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentUrl">Document URL (optioneel)</Label>
                  <Input
                    id="documentUrl"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-stone-500">
                    Vul hier de directe link naar het document in als deze afwijkt van de gevonden URL.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleAccept} 
                disabled={processMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {processMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Toevoegen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Suggestie afwijzen
              </DialogTitle>
              <DialogDescription>
                Geef aan waarom dit document niet relevant of niet actueel is.
              </DialogDescription>
            </DialogHeader>

            {selectedSuggestie && (
              <div className="space-y-4 py-4">
                <div className="bg-stone-50 p-3 rounded-lg">
                  <p className="font-medium text-stone-800">{selectedSuggestie.gevondenBeleid}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejectReason">Reden voor afwijzing (optioneel)</Label>
                  <Textarea
                    id="rejectReason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Bijv. document is verouderd, niet van toepassing op onze gemeente, etc."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleReject} 
                disabled={processMutation.isPending}
                variant="destructive"
              >
                {processMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Afwijzen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

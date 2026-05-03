/**
 * BeleidSuggestiePanel - UI voor bevestiging van gevonden beleidsdocumenten
 * 
 * Toont suggesties die zijn gevonden via jurisprudentie-analyse en laat
 * gebruikers bevestigen of het beleid actueel is en toegevoegd moet worden
 * aan de kennisbank.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  FileText, 
  Scale,
  AlertTriangle,
  Upload,
  Clock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BeleidSuggestie {
  id: number;
  documentNaam: string;
  documentType: string | null;
  bronUrl: string;
  bronType: string;
  gevondenDatum: Date | null;
  geschattePublicatieDatum: Date | null;
  aiSamenvatting: string | null;
  aiRelevantie: number | null;
  triggerEcli?: string;
}

interface BeleidSuggestiePanelProps {
  gemeenteId: number;
  onSuggestieVerwerkt?: () => void;
}

export function BeleidSuggestiePanel({ gemeenteId, onSuggestieVerwerkt }: BeleidSuggestiePanelProps) {
  const [selectedSuggestie, setSelectedSuggestie] = useState<BeleidSuggestie | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [customDocumentUrl, setCustomDocumentUrl] = useState("");
  const [customDocumentName, setCustomDocumentName] = useState("");

  // Haal pending suggesties op
  const { data: suggesties, isLoading, refetch } = trpc.beleidSuggestie.getPending.useQuery(
    { gemeenteId },
    { enabled: gemeenteId > 0 }
  );

  // Mutations
  const acceptMutation = trpc.beleidSuggestie.accept.useMutation({
    onSuccess: () => {
      toast.success("Beleidsdocument toegevoegd aan kennisbank");
      setAcceptDialogOpen(false);
      setSelectedSuggestie(null);
      setCustomDocumentUrl("");
      setCustomDocumentName("");
      refetch();
      onSuggestieVerwerkt?.();
    },
    onError: (error) => {
      toast.error(`Fout bij toevoegen: ${error.message}`);
    }
  });

  const rejectMutation = trpc.beleidSuggestie.reject.useMutation({
    onSuccess: () => {
      toast.success("Suggestie afgewezen");
      setRejectDialogOpen(false);
      setSelectedSuggestie(null);
      setRejectReason("");
      refetch();
      onSuggestieVerwerkt?.();
    },
    onError: (error) => {
      toast.error(`Fout bij afwijzen: ${error.message}`);
    }
  });

  const handleAccept = () => {
    if (!selectedSuggestie) return;
    acceptMutation.mutate({
      suggestieId: selectedSuggestie.id,
      documentUrl: customDocumentUrl || undefined,
      documentNaam: customDocumentName || undefined
    });
  };

  const handleReject = () => {
    if (!selectedSuggestie) return;
    rejectMutation.mutate({
      suggestieId: selectedSuggestie.id,
      reden: rejectReason || undefined
    });
  };

  const getBronTypeLabel = (bronType: string) => {
    const labels: Record<string, string> = {
      gemeente_website: "Gemeente website",
      overheid_nl: "Overheid.nl",
      lokaleregelgeving_nl: "Lokale regelgeving",
      google_search: "Google zoekresultaat",
      ruimtelijkeplannen_nl: "Ruimtelijke plannen"
    };
    return labels[bronType] || bronType;
  };

  const getRelevantieColor = (relevantie: number | null) => {
    if (!relevantie) return "secondary";
    if (relevantie >= 80) return "default";
    if (relevantie >= 60) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Beleidssuggesties laden...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!suggesties || suggesties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Beleidssuggesties
          </CardTitle>
          <CardDescription>
            Geen openstaande suggesties. Nieuwe suggesties verschijnen hier wanneer 
            jurisprudentie verwijst naar beleid dat niet in uw kennisbank staat.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Beleidssuggesties uit Jurisprudentie
            <Badge variant="secondary">{suggesties.length}</Badge>
          </CardTitle>
          <CardDescription>
            Deze beleidsdocumenten zijn gevonden via jurisprudentie-analyse. 
            Bevestig of het beleid actueel is om het toe te voegen aan uw kennisbank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggesties.map((suggestie) => (
            <Card key={suggestie.id} className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{suggestie.documentNaam}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{suggestie.documentType || "Onbekend type"}</Badge>
                      <Badge variant="secondary">{getBronTypeLabel(suggestie.bronType)}</Badge>
                      {suggestie.aiRelevantie && (
                        <Badge variant={getRelevantieColor(suggestie.aiRelevantie)}>
                          {suggestie.aiRelevantie}% relevant
                        </Badge>
                      )}
                    </div>
                  </div>
                  <a 
                    href={suggestie.bronUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    Bekijk bron <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                {suggestie.aiSamenvatting && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {suggestie.aiSamenvatting}
                  </p>
                )}
                {suggestie.geschattePublicatieDatum && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Geschatte publicatiedatum: {new Date(suggestie.geschattePublicatieDatum).toLocaleDateString('nl-NL')}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 gap-2">
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => {
                    setSelectedSuggestie(suggestie);
                    setAcceptDialogOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Ja, dit is actueel beleid
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setSelectedSuggestie(suggestie);
                    setRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Nee, niet actueel
                </Button>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Accept Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Beleid toevoegen aan kennisbank</DialogTitle>
            <DialogDescription>
              Bevestig dat "{selectedSuggestie?.documentNaam}" actueel beleid is. 
              U kunt optioneel een andere URL of naam opgeven.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customName">Document naam (optioneel)</Label>
              <Input
                id="customName"
                placeholder={selectedSuggestie?.documentNaam}
                value={customDocumentName}
                onChange={(e) => setCustomDocumentName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Laat leeg om de gevonden naam te gebruiken
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customUrl">Document URL (optioneel)</Label>
              <Input
                id="customUrl"
                placeholder={selectedSuggestie?.bronUrl}
                value={customDocumentUrl}
                onChange={(e) => setCustomDocumentUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Heeft u een directere link naar het document? Vul die hier in.
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Let op</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Door te bevestigen wordt dit document toegevoegd aan uw gemeentelijke 
                  kennisbank en meegenomen in toekomstige analyses.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAccept} disabled={acceptMutation.isPending}>
              {acceptMutation.isPending ? "Bezig..." : "Toevoegen aan kennisbank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggestie afwijzen</DialogTitle>
            <DialogDescription>
              Waarom is "{selectedSuggestie?.documentNaam}" niet actueel?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reden (optioneel)</Label>
              <Textarea
                id="rejectReason"
                placeholder="Bijv. 'Vervangen door nieuwe versie' of 'Niet van toepassing op onze gemeente'"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Bezig..." : "Afwijzen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BeleidSuggestiePanel;

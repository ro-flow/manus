import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Trash2, AlertTriangle, CheckCircle, Shield, FileText, Database } from "lucide-react";
import { toast } from "sonner";

export default function Privacy() {
  const { user } = useAuth();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Check if account can be deleted
  const { data: canDeleteData, isLoading: isCheckingDelete } = trpc.avg.canDelete.useQuery();

  // Export mutation
  const exportMutation = trpc.avg.exportData.useMutation({
    onSuccess: (result) => {
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mijn-gegevens-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Gegevens geëxporteerd", {
        description: "Uw persoonsgegevens zijn gedownload als JSON bestand.",
      });
    },
    onError: (error) => {
      toast.error("Export mislukt", {
        description: error.message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = trpc.avg.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account verwijderd", {
        description: "Uw account en alle persoonsgegevens zijn verwijderd.",
      });
      // Redirect to homepage after deletion
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error("Verwijdering mislukt", {
        description: error.message,
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleDelete = () => {
    if (deleteConfirmation !== "IK BEGRIJP DAT DIT ONOMKEERBAAR IS") {
      toast.error("Bevestiging vereist", {
        description: "Typ de exacte bevestigingstekst om door te gaan.",
      });
      return;
    }
    deleteMutation.mutate({ bevestiging: "IK BEGRIJP DAT DIT ONOMKEERBAAR IS" });
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Privacy & Gegevensbeheer
        </h1>
        <p className="text-muted-foreground mt-2">
          Beheer uw persoonsgegevens conform de AVG (Algemene Verordening Gegevensbescherming)
        </p>
      </div>

      {/* User info card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Uw account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Naam:</span>
              <span className="ml-2 font-medium">{user?.name || "Niet ingesteld"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <span className="ml-2 font-medium">{user?.email || "Niet ingesteld"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Rol:</span>
              <span className="ml-2 font-medium">{user?.role}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Account ID:</span>
              <span className="ml-2 font-medium">{user?.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gegevens exporteren (Art. 15 & 20 AVG)
          </CardTitle>
          <CardDescription>
            Download een kopie van al uw persoonsgegevens in een machineleesbaar formaat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Wat wordt geëxporteerd?</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Uw accountgegevens (naam, email, rol)</li>
                <li>Seats (werkplekken) gekoppeld aan uw email</li>
                <li>Behandelrapporten waar u behandelaar bent</li>
                <li>Feedback die u heeft gegeven</li>
                <li>Betalingsgeschiedenis</li>
              </ul>
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleExport} 
            disabled={exportMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? "Exporteren..." : "Download mijn gegevens"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Deletion Card */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Account verwijderen (Art. 17 AVG)
          </CardTitle>
          <CardDescription>
            Verwijder uw account en alle bijbehorende persoonsgegevens permanent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Let op: dit is onomkeerbaar!</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Uw account wordt permanent verwijderd</li>
                <li>Alle seats gekoppeld aan uw email worden verwijderd</li>
                <li>Uw feedback wordt verwijderd</li>
                <li>Behandelrapporten worden geanonimiseerd (niet verwijderd, voor audit trail)</li>
                <li>Betalingsgegevens worden bewaard (wettelijke bewaarplicht 7 jaar)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {!canDeleteData?.canDelete && canDeleteData?.reason && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Account kan niet worden verwijderd</AlertTitle>
              <AlertDescription>{canDeleteData.reason}</AlertDescription>
            </Alert>
          )}

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={!canDeleteData?.canDelete || isCheckingDelete}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Account verwijderen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Account permanent verwijderen?</DialogTitle>
                <DialogDescription>
                  Dit verwijdert uw account en alle persoonsgegevens. Deze actie kan niet ongedaan worden gemaakt.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="confirmation">
                  Typ <strong>IK BEGRIJP DAT DIT ONOMKEERBAAR IS</strong> om te bevestigen:
                </Label>
                <Input
                  id="confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Typ de bevestigingstekst"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Annuleren
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleteConfirmation !== "IK BEGRIJP DAT DIT ONOMKEERBAAR IS" || deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Verwijderen..." : "Definitief verwijderen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Info about data retention */}
      <Card className="mt-6 bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Over uw privacy rechten</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Recht op inzage (Art. 15 AVG):</strong> U heeft het recht om te weten welke 
            persoonsgegevens wij van u verwerken. Gebruik de export functie hierboven.
          </p>
          <p>
            <strong>Recht op overdraagbaarheid (Art. 20 AVG):</strong> U kunt uw gegevens 
            downloaden in een machineleesbaar formaat (JSON).
          </p>
          <p>
            <strong>Recht op vergetelheid (Art. 17 AVG):</strong> U kunt verzoeken om verwijdering 
            van uw persoonsgegevens. Sommige gegevens worden bewaard vanwege wettelijke verplichtingen.
          </p>
          <p>
            Voor vragen over uw privacy kunt u contact opnemen via{" "}
            <a href="mailto:info@ro-flow.nl" className="text-primary hover:underline">
              info@ro-flow.nl
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

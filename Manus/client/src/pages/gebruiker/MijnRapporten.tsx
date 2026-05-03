import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import { QuickFeedback } from "@/components/FeedbackPanel";
import { 
  FileText, 
  ChevronLeft, 
  Search,
  Download,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  ThumbsUp
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function MijnRapporten() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewFilename, setPreviewFilename] = useState<string>('rapport.pdf');
  
  const { data: rapporten, isLoading } = trpc.behandelrapport.listByUser.useQuery({ 
    email: user?.email || '', 
    limit: 50 
  });

  const filteredRapporten = rapporten?.filter(r => 
    r.zaaknummer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.adres?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verzonden':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'mislukt':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
    }
  };

  const getProcedureLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      'VERGUNNINGVRIJ': 'Vergunningvrij',
      'REGULIER': 'Regulier',
      'BOPA_REGULIER': 'BOPA Regulier',
      'BOPA_UITGEBREID': 'BOPA Uitgebreid',
    };
    return type ? labels[type] || type : '-';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/gebruiker')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mijn Rapporten</h1>
            <p className="text-muted-foreground">Overzicht van al je behandelrapporten</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op zaaknummer of adres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rapporten?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Totaal rapporten</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {rapporten?.filter(r => r.status === 'verzonden').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Verzonden</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {rapporten?.filter(r => r.isVergunningvrij).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Vergunningvrij</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {rapporten?.filter(r => r.status === 'verwerking').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">In verwerking</div>
            </CardContent>
          </Card>
        </div>

        {/* Rapporten List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Alle Rapporten ({filteredRapporten?.length || 0})</CardTitle>
            <CardDescription>Klik op een rapport voor details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRapporten?.map((rapport) => (
                  <div 
                    key={rapport.id} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{rapport.zaaknummer}</div>
                        <div className="text-sm text-muted-foreground">
                          {rapport.adres || 'Geen adres'}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(rapport.datumRapport).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {rapport.verwerkingDuurSec && (
                            <span>• {rapport.verwerkingDuurSec}s</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rapport.isVergunningvrij 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {getProcedureLabel(rapport.procedureType)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(rapport.status || 'verwerking')}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rapport.status === 'verzonden' 
                            ? 'bg-green-100 text-green-800' 
                            : rapport.status === 'mislukt'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {rapport.status || 'verwerking'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {rapport.pdfUrl && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              title="Preview bekijken"
                              onClick={() => {
                                setPreviewPdfUrl(rapport.pdfUrl!);
                                setPreviewTitle(`Behandelrapport ${rapport.zaaknummer}`);
                                setPreviewFilename(`behandelrapport_${rapport.zaaknummer}.pdf`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              title="Direct downloaden"
                              onClick={() => window.open(rapport.pdfUrl!, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Feedback knop */}
                        <QuickFeedback
                          behandelrapportId={rapport.id}
                          sectionType="algemeen"
                          originalValue={rapport.procedureType || undefined}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredRapporten?.length === 0 && (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">Geen rapporten gevonden</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery ? 'Probeer een andere zoekterm' : 'Start een DSO-analyse om je eerste rapport te genereren'}
                    </p>
                    {!searchQuery && (
                      <Button className="mt-4" onClick={() => setLocation('/gebruiker/upload')}>
                        Start Analyse
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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

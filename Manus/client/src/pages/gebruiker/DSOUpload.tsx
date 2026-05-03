import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Upload, 
  FileArchive, 
  ChevronLeft, 
  FileText,
  MapPin,
  CheckCircle,
  Loader2,
  AlertCircle,
  X,
  Lock,
  UserX,
  Building2,
  Sparkles,
  Wand2,
  Clock
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type AnalysisStep = 'upload' | 'extracting' | 'pdok' | 'analyzing' | 'generating' | 'complete' | 'error';

interface ExtractedFile {
  name: string;
  size: number;
  type: string;
}

export default function DSOUpload() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<AnalysisStep>('upload');
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [zaaknummer, setZaaknummer] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [adres, setAdres] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<number>(15); // Default 15 seconds
  
  // Estimated total time per step (in seconds)
  const STEP_TIMES = {
    extracting: 2,
    pdok: 3,
    analyzing: 8,
    generating: 2,
  };
  const TOTAL_ESTIMATED_TIME = Object.values(STEP_TIMES).reduce((a, b) => a + b, 0);
  
  // Check seat access
  const { data: seatAccess, isLoading: seatLoading } = trpc.seats.checkAccess.useQuery();
  
  const gemeenteId = (seatAccess && 'gemeente' in seatAccess && seatAccess.gemeente?.id) || user?.gemeenteId || 1;
  const { data: gemeente } = trpc.gemeente.getById.useQuery({ id: gemeenteId });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        // Extract zaaknummer from filename
        const match = file.name.match(/(\d{4,})/);
        if (match) {
          setZaaknummer(match[1]);
        }
      } else {
        toast.error('Alleen ZIP-bestanden zijn toegestaan');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        const match = file.name.match(/(\d{4,})/);
        if (match) {
          setZaaknummer(match[1]);
        }
      } else {
        toast.error('Alleen ZIP-bestanden zijn toegestaan');
      }
    }
  };

  // tRPC mutation for DSO analysis
  const analyzeMutation = trpc.analyse.analyzeDSO.useMutation({
    onSuccess: (data) => {
      setStep('complete');
      setProgress(100);
      if (data.emailSent) {
        toast.success('Analyse voltooid! Rapport is per email verzonden.');
      } else {
        toast.success('Analyse voltooid!');
      }
    },
    onError: (error) => {
      setStep('error');
      setErrorMessage(error.message || 'Er is een fout opgetreden tijdens de analyse');
      toast.error('Analyse mislukt');
    },
  });

  const startAnalysis = async () => {
    if (!selectedFile || !zaaknummer) {
      toast.error('Selecteer een bestand en vul een zaaknummer in');
      return;
    }

    try {
      // Start timer for estimated time
      setStartTime(Date.now());
      setEstimatedTimeLeft(TOTAL_ESTIMATED_TIME);
      
      // Step 1: Extracting ZIP (client-side simulation for now)
      setStep('extracting');
      setProgress(10);
      
      // Read ZIP file and extract file list
      const fileList: ExtractedFile[] = [];
      // For now, we'll show the ZIP file itself
      fileList.push({
        name: selectedFile.name,
        size: selectedFile.size,
        type: 'application/zip',
      });
      setExtractedFiles(fileList);
      setProgress(25);

      // Step 2: PDOK Lookup
      setStep('pdok');
      setProgress(35);
      await new Promise(r => setTimeout(r, 500));
      setProgress(50);

      // Step 3: AI Analysis - call the real backend
      setStep('analyzing');
      setProgress(60);
      
      // Get gemeente ID from seat access or user
      const targetGemeenteId = (seatAccess && 'gemeente' in seatAccess && seatAccess.gemeente?.id) || user?.gemeenteId || 1;
      
      // Call the backend API
      analyzeMutation.mutate({
        zaaknummer,
        gemeenteId: targetGemeenteId,
        activiteiten: ['bouwen'], // Default activity, could be extracted from ZIP
        omschrijving: `DSO aanvraag ${zaaknummer}`,
        adres: adres || undefined,
        behandelaarNaam: user?.name || 'Behandelaar',
        behandelaarEmail: user?.email || undefined,
        bijlagen: fileList.map(f => ({ naam: f.name, type: f.type })),
      });
      
      // Progress will continue in onSuccess/onError
      setProgress(75);
      setStep('generating');
      setProgress(85);
      
    } catch (error) {
      setStep('error');
      setErrorMessage('Er is een fout opgetreden tijdens de analyse');
      toast.error('Analyse mislukt');
    }
  };

  const resetAnalysis = () => {
    setStep('upload');
    setProgress(0);
    setSelectedFile(null);
    setExtractedFiles([]);
    setZaaknummer('');
    setErrorMessage('');
    setStartTime(null);
    setEstimatedTimeLeft(TOTAL_ESTIMATED_TIME);
  };

  // Timer effect for countdown
  useEffect(() => {
    if (!startTime || step === 'upload' || step === 'complete' || step === 'error') {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, TOTAL_ESTIMATED_TIME - elapsed);
      setEstimatedTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, step, TOTAL_ESTIMATED_TIME]);

  // Format time as mm:ss or just seconds
  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return 'Bijna klaar...';
    if (seconds < 60) return `~${seconds} sec`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `~${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepInfo = () => {
    switch (step) {
      case 'extracting':
        return { label: 'Bestanden uitpakken...', subLabel: 'Even geduld, we openen je dossier', icon: FileArchive };
      case 'pdok':
        return { label: 'Locatie ophalen...', subLabel: 'We zoeken de precieze locatie op', icon: MapPin };
      case 'analyzing':
        return { label: 'Wacht even, de magie is aan het werk ✨', subLabel: 'Onze AI analyseert je aanvraag', icon: Wand2 };
      case 'generating':
        return { label: 'Rapport wordt gemaakt...', subLabel: 'Bijna klaar!', icon: FileText };
      case 'complete':
        return { label: 'Analyse voltooid!', subLabel: 'Je rapport is klaar', icon: CheckCircle };
      case 'error':
        return { label: 'Oeps, er ging iets mis', subLabel: 'Probeer het opnieuw', icon: AlertCircle };
      default:
        return { label: 'Upload DSO-bestand', subLabel: '', icon: Upload };
    }
  };

  const stepInfo = getStepInfo();

  // Loading state
  if (seatLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Toegang controleren...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // No access - show access denied page
  if (!seatAccess?.hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/gebruiker')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">DSO-Analyse</h1>
              <p className="text-muted-foreground">Upload een DSO-ZIP bestand voor analyse</p>
            </div>
          </div>

          {/* Access Denied Card */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <Lock className="h-10 w-10 text-destructive" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-destructive">Geen toegang</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {seatAccess?.reason || 'Je hebt geen toegang tot de DSO-analyse functie.'}
                  </p>
                </div>

                <div className="bg-background rounded-lg p-6 border max-w-md mx-auto">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <UserX className="h-5 w-5 text-muted-foreground" />
                    Wat kun je doen?
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-3 text-left">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">1.</span>
                      Neem contact op met je gemeente beheerder om een seat aan te vragen
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">2.</span>
                      Controleer of je bent ingelogd met het juiste e-mailadres
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">3.</span>
                      Vraag je beheerder om je seat te activeren als deze nog op 'uitgenodigd' staat
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setLocation('/gebruiker')}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Terug naar dashboard
                  </Button>
                  <Button onClick={() => setLocation('/demo')}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Demo aanvragen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info about seats */}
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <UserX className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Wat is een seat?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Een seat is een licentie die je gemeente koopt voor medewerkers die Ro-flow mogen gebruiken. 
                    Elke behandelaar die DSO-analyses wil uitvoeren heeft een actieve seat nodig. 
                    Je gemeente beheerder kan seats toewijzen en beheren.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Has access - show normal upload interface
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/gebruiker')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DSO-Analyse</h1>
            <p className="text-muted-foreground">Upload een DSO-ZIP bestand voor analyse</p>
          </div>
        </div>

        {/* Gemeente info badge */}
        {'gemeente' in seatAccess && seatAccess.gemeente && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 w-fit">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{seatAccess.gemeente.gemeenteNaam}</span>
          </div>
        )}

        {/* Upload Area */}
        {step === 'upload' && (
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : selectedFile 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
                      <FileArchive className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      <X className="h-4 w-4 mr-1" />
                      Verwijderen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Sleep je DSO-ZIP bestand hierheen</p>
                      <p className="text-sm text-muted-foreground">of klik om te selecteren</p>
                    </div>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" asChild>
                        <span>Selecteer bestand</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Zaaknummer</Label>
                    <Input
                      placeholder="bijv. 2024-001234"
                      value={zaaknummer}
                      onChange={(e) => setZaaknummer(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adres (optioneel)</Label>
                    <Input
                      placeholder="bijv. Hoofdstraat 1, Amsterdam"
                      value={adres}
                      onChange={(e) => setAdres(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Voor PDOK locatiegegevens</p>
                  </div>
                  <Button className="w-full" size="lg" onClick={startAnalysis} disabled={analyzeMutation.isPending}>
                    <Upload className="h-5 w-5 mr-2" />
                    Start Analyse
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processing */}
        {['extracting', 'pdok', 'analyzing', 'generating'].includes(step) && (
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                {/* Magic Animation Container */}
                <div className="relative">
                  {/* Floating sparkles */}
                  {step === 'analyzing' && (
                    <>
                      <div className="absolute -top-2 left-1/2 -translate-x-8 animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }}>
                        <Sparkles className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="absolute top-0 left-1/2 translate-x-6 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>
                        <Sparkles className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="absolute -top-4 left-1/2 -translate-x-2 animate-bounce" style={{ animationDelay: '1s', animationDuration: '1.8s' }}>
                        <Sparkles className="h-3 w-3 text-blue-400" />
                      </div>
                    </>
                  )}
                  
                  {/* Main icon with glow effect */}
                  <div className={`h-24 w-24 rounded-3xl flex items-center justify-center mx-auto relative ${
                    step === 'analyzing' 
                      ? 'bg-gradient-to-br from-purple-500/20 via-primary/20 to-amber-500/20' 
                      : 'bg-primary/10'
                  }`}>
                    {step === 'analyzing' && (
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/10 via-primary/10 to-amber-500/10 animate-pulse" />
                    )}
                    <stepInfo.icon className={`h-12 w-12 relative z-10 ${
                      step === 'analyzing' 
                        ? 'text-primary animate-[wiggle_1s_ease-in-out_infinite]' 
                        : 'text-primary animate-pulse'
                    }`} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className={`text-xl font-semibold ${
                    step === 'analyzing' ? 'bg-gradient-to-r from-purple-600 via-primary to-amber-600 bg-clip-text text-transparent' : ''
                  }`}>
                    {stepInfo.label}
                  </h2>
                  <p className="text-muted-foreground">
                    {stepInfo.subLabel}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    Zaaknummer: {zaaknummer}
                  </p>
                </div>
                
                {/* Progress bar with gradient */}
                <div className="space-y-3">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        step === 'analyzing'
                          ? 'bg-gradient-to-r from-purple-500 via-primary to-amber-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{progress}% voltooid</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">{formatTimeLeft(estimatedTimeLeft)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {extractedFiles.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="font-medium mb-4">Uitgepakte bestanden</h3>
                  <div className="space-y-2">
                    {extractedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <div className="h-20 w-20 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Analyse voltooid!</h2>
                  <p className="text-muted-foreground mt-1">
                    Het behandelrapport is gegenereerd en wordt per email verzonden.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={resetAnalysis}>
                    Nieuwe analyse
                  </Button>
                  <Button onClick={() => setLocation('/gebruiker/rapporten')}>
                    Bekijk rapporten
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {step === 'error' && (
          <Card className="border shadow-sm border-destructive/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-destructive">Analyse mislukt</h2>
                  <p className="text-muted-foreground mt-1">
                    {errorMessage || 'Er is een onbekende fout opgetreden.'}
                  </p>
                </div>
                <Button onClick={resetAnalysis}>
                  Opnieuw proberen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border shadow-sm bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <FileArchive className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Ondersteunde bestanden</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload een DSO-ZIP bestand met daarin de aanvraag.xml en bijlagen. 
                  Ro-flow extraheert automatisch de relevante gegevens en voert een 
                  volledige analyse uit met de 5-lagen kennisbank.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

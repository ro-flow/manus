import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  ChevronLeft, 
  MessageSquare, 
  Check,
  Building2,
  Droplets,
  Shield,
  Factory,
  Heart,
  TreePine,
  FileText,
  Users,
  Sparkles,
  Loader2,
  ExternalLink,
  Plus,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";

type OnboardingStep = 'welcome' | 'gemeente' | 'regio' | 'beleid' | 'seats' | 'confirm';

interface BeleidDocument {
  type: string;
  naam: string;
  url: string;
  suggested: boolean;
  confirmed: boolean;
}

export default function OnboardingChat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tokenParam = params.get('token');
  const gemeenteParam = params.get('gemeente');
  
  const [step, setStep] = useState<OnboardingStep>(gemeenteParam ? 'welcome' : 'gemeente');
  const [gemeenteNaam, setGemeenteNaam] = useState(gemeenteParam || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedGemeente, setSelectedGemeente] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Regio form state
  const [regioData, setRegioData] = useState({
    waterschapCode: '',
    waterschapNaam: '',
    recreatieschapCode: '',
    recreatieschapNaam: '',
    vrCode: '',
    vrNaam: '',
    odCode: '',
    odNaam: '',
    ggdCode: '',
    ggdNaam: '',
  });

  // Beleid documents state
  const [beleidDocumenten, setBeleidDocumenten] = useState<BeleidDocument[]>([]);
  const [nieuwDocument, setNieuwDocument] = useState({ type: '', naam: '', url: '' });
  const [showAddDocument, setShowAddDocument] = useState(false);

  // Seats state
  const [seatEmails, setSeatEmails] = useState<string[]>(['']);
  const [totalSeats, setTotalSeats] = useState(3);

  const { data: searchData } = trpc.gemeente.searchRegio.useQuery(
    { query: gemeenteNaam },
    { enabled: gemeenteNaam.length >= 2 && !selectedGemeente }
  );

  const { data: lookupResult, isLoading: isLoadingLookup } = trpc.gemeente.lookupRegio.useQuery(
    { gemeenteNaam: selectedGemeente?.gemeenteNaam || gemeenteParam || '' },
    { enabled: !!(selectedGemeente || gemeenteParam) }
  );

  // TODO: Implement saveOnboarding mutation in gemeente router
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSaveOnboarding = async () => {
    setIsSaving(true);
    // Simuleer opslaan - in productie zou dit een echte API call zijn
    setTimeout(() => {
      toast.success('Onboarding voltooid! Je collega\'s ontvangen nu een uitnodiging.');
      setIsSaving(false);
      setLocation('/beheerder');
    }, 1500);
  };

  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData);
    }
  }, [searchData]);

  // Mapping van codes naar namen
  const waterschapNamen: Record<string, string> = {
    'hhnk': 'Hoogheemraadschap Hollands Noorderkwartier',
    'agv': 'Waterschap Amstel, Gooi en Vecht',
    'hhsk': 'Hoogheemraadschap van Schieland en de Krimpenerwaard',
    'delfland': 'Hoogheemraadschap van Delfland',
    'hdsr': 'Hoogheemraadschap De Stichtse Rijnlanden',
    'rijnland': 'Hoogheemraadschap van Rijnland',
    'rivierenland': 'Waterschap Rivierenland',
    'scheldestromen': 'Waterschap Scheldestromen',
    'brabantse-delta': 'Waterschap Brabantse Delta',
    'de-dommel': 'Waterschap De Dommel',
    'aa-en-maas': 'Waterschap Aa en Maas',
    'limburg': 'Waterschap Limburg',
    'drents-overijsselse-delta': 'Waterschap Drents Overijsselse Delta',
    'vechtstromen': 'Waterschap Vechtstromen',
    'rijn-en-ijssel': 'Waterschap Rijn en IJssel',
    'vallei-en-veluwe': 'Waterschap Vallei en Veluwe',
    'zuiderzeeland': 'Waterschap Zuiderzeeland',
    'noorderzijlvest': 'Waterschap Noorderzijlvest',
    'hunze-en-aas': 'Waterschap Hunze en Aa\'s',
    'wetterskip-fryslan': 'Wetterskip Fryslân',
  };

  const vrNamen: Record<string, string> = {
    'vr-nhn': 'Veiligheidsregio Noord-Holland Noord',
    'vr-aa': 'Veiligheidsregio Amsterdam-Amstelland',
    'vr-rr': 'Veiligheidsregio Rotterdam-Rijnmond',
    'vr-hl': 'Veiligheidsregio Haaglanden',
    'vru': 'Veiligheidsregio Utrecht',
    'vr-zh': 'Veiligheidsregio Zuid-Holland Zuid',
    'vr-mwb': 'Veiligheidsregio Midden- en West-Brabant',
    'vr-bn': 'Veiligheidsregio Brabant-Noord',
    'vr-bzo': 'Veiligheidsregio Brabant-Zuidoost',
    'vr-ln': 'Veiligheidsregio Limburg-Noord',
    'vr-lz': 'Veiligheidsregio Zuid-Limburg',
    'vr-gld': 'Veiligheidsregio Gelderland',
    'vr-twente': 'Veiligheidsregio Twente',
    'vr-ij': 'Veiligheidsregio IJsselland',
    'vr-flevoland': 'Veiligheidsregio Flevoland',
    'vr-groningen': 'Veiligheidsregio Groningen',
    'vr-fryslan': 'Veiligheidsregio Fryslân',
    'vr-drenthe': 'Veiligheidsregio Drenthe',
    'vr-zaanstreek': 'Veiligheidsregio Zaanstreek-Waterland',
    'vr-kennemerland': 'Veiligheidsregio Kennemerland',
    'vr-gooi': 'Veiligheidsregio Gooi en Vechtstreek',
    'vr-hollands-midden': 'Veiligheidsregio Hollands Midden',
    'vr-zeeland': 'Veiligheidsregio Zeeland',
  };

  const odNamen: Record<string, string> = {
    'od-nhn': 'Omgevingsdienst Noord-Holland Noord',
    'od-nzkg': 'Omgevingsdienst Noordzeekanaalgebied',
    'dcmr': 'DCMR Milieudienst Rijnmond',
    'odh': 'Omgevingsdienst Haaglanden',
    'rud-ut': 'RUD Utrecht',
    'odrn': 'Omgevingsdienst Regio Nijmegen',
    'odra': 'Omgevingsdienst Regio Arnhem',
    'odzob': 'Omgevingsdienst Zuidoost-Brabant',
    'omwb': 'Omgevingsdienst Midden- en West-Brabant',
    'odbn': 'Omgevingsdienst Brabant Noord',
    'rud-lim': 'RUD Limburg',
    'od-twente': 'Omgevingsdienst Twente',
    'od-ijsselland': 'Omgevingsdienst IJsselland',
    'ofgv': 'Omgevingsdienst Flevoland & Gooi en Vechtstreek',
    'od-groningen': 'Omgevingsdienst Groningen',
    'fumo': 'FUMO (Fryske Utfieringstsjinst Miljeu en Omjouwing)',
    'rud-drenthe': 'RUD Drenthe',
    'odwh': 'Omgevingsdienst West-Holland',
    'ozhz': 'Omgevingsdienst Zuid-Holland Zuid',
    'odmh': 'Omgevingsdienst Midden-Holland',
    'rud-zeeland': 'RUD Zeeland',
  };

  const ggdNamen: Record<string, string> = {
    'ggd-hollands-noorden': 'GGD Hollands Noorden',
    'ggd-amsterdam': 'GGD Amsterdam',
    'ggd-rotterdam-rijnmond': 'GGD Rotterdam-Rijnmond',
    'ggd-haaglanden': 'GGD Haaglanden',
    'ggd-regio-utrecht': 'GGD regio Utrecht',
    'ggd-kennemerland': 'GGD Kennemerland',
    'ggd-zaanstreek-waterland': 'GGD Zaanstreek-Waterland',
    'ggd-gooi-vechtstreek': 'GGD Gooi en Vechtstreek',
    'ggd-hollands-midden': 'GGD Hollands Midden',
    'ggd-zh-zuid': 'GGD Zuid-Holland Zuid',
    'ggd-zeeland': 'GGD Zeeland',
    'ggd-west-brabant': 'GGD West-Brabant',
    'ggd-hart-brabant': 'GGD Hart voor Brabant',
    'ggd-brabant-zuidoost': 'GGD Brabant-Zuidoost',
    'ggd-limburg-noord': 'GGD Limburg-Noord',
    'ggd-zuid-limburg': 'GGD Zuid Limburg',
    'ggd-gelderland-midden': 'GGD Gelderland-Midden',
    'ggd-gelderland-zuid': 'GGD Gelderland-Zuid',
    'ggd-noord-oost-gelderland': 'GGD Noord- en Oost-Gelderland',
    'ggd-twente': 'GGD Twente',
    'ggd-ijsselland': 'GGD IJsselland',
    'ggd-flevoland': 'GGD Flevoland',
    'ggd-groningen': 'GGD Groningen',
    'ggd-fryslan': 'GGD Fryslân',
    'ggd-drenthe': 'GGD Drenthe',
  };

  // Auto-fill regio data from lookup
  useEffect(() => {
    if (lookupResult) {
      setRegioData({
        waterschapCode: lookupResult.waterschapCode || '',
        waterschapNaam: waterschapNamen[lookupResult.waterschapCode || ''] || lookupResult.waterschapCode || '',
        recreatieschapCode: '',
        recreatieschapNaam: '',
        vrCode: lookupResult.vrCode || '',
        vrNaam: vrNamen[lookupResult.vrCode || ''] || lookupResult.vrCode || '',
        odCode: lookupResult.odCode || '',
        odNaam: odNamen[lookupResult.odCode || ''] || lookupResult.odCode || '',
        ggdCode: lookupResult.ggdCode || '',
        ggdNaam: ggdNamen[lookupResult.ggdCode || ''] || lookupResult.ggdCode || '',
      });

      // Generate AI suggestions for beleid documents
      if (beleidDocumenten.length === 0) {
        setIsLoadingSuggestions(true);
        const gemeente = selectedGemeente?.gemeenteNaam || gemeenteParam || '';
        
        // Simulated AI suggestions based on gemeente
        setTimeout(() => {
          const suggestions: BeleidDocument[] = [
            { type: 'Welstandsnota', naam: `Welstandsnota ${gemeente}`, url: '', suggested: true, confirmed: false },
            { type: 'Parkeerbeleid', naam: `Parkeerbeleid ${gemeente}`, url: '', suggested: true, confirmed: false },
            { type: 'Groenbeleid', naam: `Groenstructuurplan ${gemeente}`, url: '', suggested: true, confirmed: false },
            { type: 'Erfgoedbeleid', naam: `Erfgoedverordening ${gemeente}`, url: '', suggested: true, confirmed: false },
            { type: 'Archeologiebeleid', naam: `Archeologische beleidskaart ${gemeente}`, url: '', suggested: true, confirmed: false },
          ];
          setBeleidDocumenten(suggestions);
          setIsLoadingSuggestions(false);
        }, 1500);
      }
    }
  }, [lookupResult, selectedGemeente, gemeenteParam]);

  const handleSelectGemeente = (gemeente: any) => {
    setSelectedGemeente(gemeente);
    setGemeenteNaam(gemeente.gemeenteNaam);
    setSearchResults([]);
    setStep('regio');
  };

  const handleConfirmRegio = () => {
    setStep('beleid');
  };

  const handleConfirmBeleid = () => {
    setStep('seats');
  };

  const handleAddSeatEmail = () => {
    if (seatEmails.length < totalSeats) {
      setSeatEmails([...seatEmails, '']);
    }
  };

  const handleRemoveSeatEmail = (index: number) => {
    setSeatEmails(seatEmails.filter((_, i) => i !== index));
  };

  const handleSeatEmailChange = (index: number, value: string) => {
    const newEmails = [...seatEmails];
    newEmails[index] = value;
    setSeatEmails(newEmails);
  };

  const handleAddDocument = () => {
    if (nieuwDocument.type && nieuwDocument.naam) {
      setBeleidDocumenten([...beleidDocumenten, { ...nieuwDocument, suggested: false, confirmed: true }]);
      setNieuwDocument({ type: '', naam: '', url: '' });
      setShowAddDocument(false);
    }
  };

  const handleToggleDocument = (index: number) => {
    const updated = [...beleidDocumenten];
    updated[index].confirmed = !updated[index].confirmed;
    setBeleidDocumenten(updated);
  };

  const handleUpdateDocumentUrl = (index: number, url: string) => {
    const updated = [...beleidDocumenten];
    updated[index].url = url;
    setBeleidDocumenten(updated);
  };

  const handleConfirm = () => {
    handleSaveOnboarding();
  };

  const steps = [
    { id: 'welcome', label: 'Welkom', icon: Sparkles },
    { id: 'gemeente', label: 'Gemeente', icon: Building2 },
    { id: 'regio', label: 'Regio', icon: Shield },
    { id: 'beleid', label: 'Beleid', icon: FileText },
    { id: 'seats', label: 'Team', icon: Users },
    { id: 'confirm', label: 'Bevestigen', icon: Check },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const activeGemeente = selectedGemeente?.gemeenteNaam || gemeenteParam || '';

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/beheerder')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kennisbank Configuratie</h1>
            <p className="text-muted-foreground">
              {activeGemeente ? `Configureer de kennisbank voor ${activeGemeente}` : 'Configureer je gemeente in een paar stappen'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.filter(s => gemeenteParam ? true : s.id !== 'welcome').map((s, i) => (
            <div key={s.id} className="flex items-center flex-shrink-0">
              <div className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors ${
                steps.findIndex(st => st.id === s.id) <= currentStepIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <s.icon className="h-5 w-5" />
              </div>
              {i < steps.filter(s => gemeenteParam ? true : s.id !== 'welcome').length - 1 && (
                <div className={`h-1 w-8 sm:w-12 mx-1 sm:mx-2 transition-colors ${
                  steps.findIndex(st => st.id === s.id) < currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Chat Interface */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Ro-flow Assistent</CardTitle>
                <CardDescription>Ik help je met de configuratie</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Step: Welcome (only for email link) */}
            {step === 'welcome' && gemeenteParam && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-6 w-6 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-lg">Welkom bij Ro-flow!</p>
                      <p className="text-muted-foreground mt-1">
                        We gaan de kennisbank inrichten voor <strong>{gemeenteParam}</strong>. 
                        Dit duurt ongeveer 5 minuten.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium mb-2">Wat gaan we doen?</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Regio-instellingen bevestigen (waterschap, omgevingsdienst, etc.)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Beleidsdocumenten toevoegen of bevestigen
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Je team uitnodigen
                    </li>
                  </ul>
                </div>
                
                <Button onClick={() => setStep('regio')} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start configuratie
                </Button>
              </div>
            )}

            {/* Step: Gemeente */}
            {step === 'gemeente' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p>Welkom! Laten we beginnen met het configureren van je gemeente. 
                  Ik zal automatisch de regionale organisaties opzoeken.</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Zoek je gemeente</Label>
                  <Input
                    placeholder="Typ de naam van je gemeente..."
                    value={gemeenteNaam}
                    onChange={(e) => setGemeenteNaam(e.target.value)}
                  />
                  
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {searchResults.map((g) => (
                        <button
                          key={g.id}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => handleSelectGemeente(g)}
                        >
                          <div className="font-medium">{g.gemeenteNaam}</div>
                          <div className="text-sm text-muted-foreground">{g.provincie}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step: Regio - All regional organizations at once with AI suggestions */}
            {step === 'regio' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">AI-suggesties voor {activeGemeente}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ik heb de regionale organisaties opgezocht. Controleer of alles klopt en pas aan waar nodig.
                      </p>
                    </div>
                  </div>
                </div>

                {isLoadingLookup ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Regio-informatie ophalen...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Waterschap */}
                    <div className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <Label className="font-medium">Waterschap</Label>
                        {regioData.waterschapNaam && <Badge variant="secondary" className="text-xs">AI-suggestie</Badge>}
                      </div>
                      <Input
                        value={regioData.waterschapNaam}
                        onChange={(e) => setRegioData(prev => ({ ...prev, waterschapNaam: e.target.value }))}
                        placeholder="Naam waterschap"
                      />
                    </div>

                    {/* Recreatieschap */}
                    <div className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        <TreePine className="h-4 w-4 text-green-500" />
                        <Label className="font-medium">Recreatieschap</Label>
                        <Badge variant="outline" className="text-xs">Optioneel</Badge>
                      </div>
                      <Input
                        value={regioData.recreatieschapNaam}
                        onChange={(e) => setRegioData(prev => ({ ...prev, recreatieschapNaam: e.target.value }))}
                        placeholder="Naam recreatieschap (indien van toepassing)"
                      />
                    </div>

                    {/* Veiligheidsregio */}
                    <div className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        <Label className="font-medium">Veiligheidsregio</Label>
                        {regioData.vrNaam && <Badge variant="secondary" className="text-xs">AI-suggestie</Badge>}
                      </div>
                      <Input
                        value={regioData.vrNaam}
                        onChange={(e) => setRegioData(prev => ({ ...prev, vrNaam: e.target.value }))}
                        placeholder="Naam veiligheidsregio"
                      />
                    </div>

                    {/* Omgevingsdienst */}
                    <div className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-orange-500" />
                        <Label className="font-medium">Omgevingsdienst</Label>
                        {regioData.odNaam && <Badge variant="secondary" className="text-xs">AI-suggestie</Badge>}
                      </div>
                      <Input
                        value={regioData.odNaam}
                        onChange={(e) => setRegioData(prev => ({ ...prev, odNaam: e.target.value }))}
                        placeholder="Naam omgevingsdienst"
                      />
                    </div>

                    {/* GGD */}
                    <div className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <Label className="font-medium">GGD</Label>
                        {regioData.ggdNaam && <Badge variant="secondary" className="text-xs">AI-suggestie</Badge>}
                      </div>
                      <Input
                        value={regioData.ggdNaam}
                        onChange={(e) => setRegioData(prev => ({ ...prev, ggdNaam: e.target.value }))}
                        placeholder="Naam GGD"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(gemeenteParam ? 'welcome' : 'gemeente')}>Terug</Button>
                  <Button onClick={handleConfirmRegio} className="flex-1" disabled={isLoadingLookup}>
                    <Check className="h-4 w-4 mr-2" />
                    Bevestig regio-instellingen
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Beleid - Policy documents with AI suggestions */}
            {step === 'beleid' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Beleidsdocumenten voor {activeGemeente}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Hieronder staan suggesties voor relevante beleidsdocumenten. 
                        Vink aan wat van toepassing is en voeg eventueel URLs toe.
                      </p>
                    </div>
                  </div>
                </div>

                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Beleidssuggesties genereren...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {beleidDocumenten.map((doc, index) => (
                      <div key={index} className={`p-4 rounded-lg border transition-colors ${doc.confirmed ? 'border-primary bg-primary/5' : ''}`}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={doc.confirmed}
                            onCheckedChange={() => handleToggleDocument(index)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{doc.naam}</span>
                              {doc.suggested && <Badge variant="secondary" className="text-xs">AI-suggestie</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground">{doc.type}</div>
                            {doc.confirmed && (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="URL naar document (optioneel)"
                                  value={doc.url}
                                  onChange={(e) => handleUpdateDocumentUrl(index, e.target.value)}
                                  className="text-sm"
                                />
                                {doc.url && (
                                  <Button variant="ghost" size="icon" asChild>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add custom document */}
                    {showAddDocument ? (
                      <div className="p-4 rounded-lg border border-dashed space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">Nieuw document toevoegen</Label>
                          <Button variant="ghost" size="icon" onClick={() => setShowAddDocument(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Type (bijv. Bomenverordening)"
                          value={nieuwDocument.type}
                          onChange={(e) => setNieuwDocument(prev => ({ ...prev, type: e.target.value }))}
                        />
                        <Input
                          placeholder="Naam document"
                          value={nieuwDocument.naam}
                          onChange={(e) => setNieuwDocument(prev => ({ ...prev, naam: e.target.value }))}
                        />
                        <Input
                          placeholder="URL (optioneel)"
                          value={nieuwDocument.url}
                          onChange={(e) => setNieuwDocument(prev => ({ ...prev, url: e.target.value }))}
                        />
                        <Button onClick={handleAddDocument} disabled={!nieuwDocument.type || !nieuwDocument.naam}>
                          <Plus className="h-4 w-4 mr-2" />
                          Toevoegen
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => setShowAddDocument(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ander document toevoegen
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('regio')}>Terug</Button>
                  <Button onClick={handleConfirmBeleid} className="flex-1">
                    <Check className="h-4 w-4 mr-2" />
                    Bevestig beleidsdocumenten
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Seats - Invite team members */}
            {step === 'seats' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Nodig je team uit</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vul de e-mailadressen in van je collega's die Ro-flow gaan gebruiken. 
                        Zij ontvangen automatisch een uitnodiging met installatie-instructies.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {seatEmails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder={`E-mailadres collega ${index + 1}`}
                        value={email}
                        onChange={(e) => handleSeatEmailChange(index, e.target.value)}
                      />
                      {seatEmails.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSeatEmail(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button variant="outline" onClick={handleAddSeatEmail} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Nog een collega toevoegen
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                  <p className="text-blue-800">
                    <strong>Tip:</strong> Je kunt later altijd meer collega's uitnodigen via het beheerder dashboard.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('beleid')}>Terug</Button>
                  <Button onClick={() => setStep('confirm')} className="flex-1">
                    <Check className="h-4 w-4 mr-2" />
                    Volgende
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Confirm */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-green-800 font-medium">
                    🎉 Uitstekend! Hier is een overzicht van je configuratie.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Gemeente */}
                  <div className="p-4 rounded-lg border">
                    <h3 className="font-medium flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4" />
                      Gemeente
                    </h3>
                    <p className="text-lg font-semibold">{activeGemeente}</p>
                  </div>

                  {/* Regio */}
                  <div className="p-4 rounded-lg border">
                    <h3 className="font-medium flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4" />
                      Regionale organisaties
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Waterschap:</div>
                      <div>{regioData.waterschapNaam || '-'}</div>
                      <div className="text-muted-foreground">Recreatieschap:</div>
                      <div>{regioData.recreatieschapNaam || '-'}</div>
                      <div className="text-muted-foreground">Veiligheidsregio:</div>
                      <div>{regioData.vrNaam || '-'}</div>
                      <div className="text-muted-foreground">Omgevingsdienst:</div>
                      <div>{regioData.odNaam || '-'}</div>
                      <div className="text-muted-foreground">GGD:</div>
                      <div>{regioData.ggdNaam || '-'}</div>
                    </div>
                  </div>

                  {/* Beleid */}
                  <div className="p-4 rounded-lg border">
                    <h3 className="font-medium flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4" />
                      Beleidsdocumenten ({beleidDocumenten.filter(d => d.confirmed).length})
                    </h3>
                    <div className="space-y-1 text-sm">
                      {beleidDocumenten.filter(d => d.confirmed).map((doc, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>{doc.naam}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team */}
                  <div className="p-4 rounded-lg border">
                    <h3 className="font-medium flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      Team ({seatEmails.filter(e => e.trim()).length} uitnodigingen)
                    </h3>
                    <div className="space-y-1 text-sm">
                      {seatEmails.filter(e => e.trim()).map((email, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>{email}</span>
                        </div>
                      ))}
                      {seatEmails.filter(e => e.trim()).length === 0 && (
                        <p className="text-muted-foreground">Geen uitnodigingen (je kunt dit later doen)</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('seats')}>Terug</Button>
                  <Button 
                    onClick={handleConfirm} 
                    className="flex-1"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Opslaan...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Bevestig & Start kennisbank
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

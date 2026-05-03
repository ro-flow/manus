import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  Users,
  FileText,
  Scale,
  Building2,
  Globe,
  MapPin,
  Layers,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Laag = "basis" | "rijks" | "provinciaal" | "regionaal" | "gemeentelijk";
type ItemType = "adviseur" | "beleidsdocument" | "toetsingskader";
type Status = "concept" | "actief" | "inactief";
type JuridischeStatus = "normstellend" | "richtinggevend" | "afwegingskader";

const LAGEN: { value: Laag; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "basis", label: "Basis", icon: <Scale className="h-4 w-4" />, description: "Fundamenteel juridisch kader (Omgevingswet, Bbl, Bal)" },
  { value: "rijks", label: "Landelijk", icon: <Globe className="h-4 w-4" />, description: "Nationale regelgeving en instructieregels" },
  { value: "provinciaal", label: "Provinciaal", icon: <MapPin className="h-4 w-4" />, description: "Provinciale omgevingsverordening" },
  { value: "regionaal", label: "Regionaal", icon: <Building2 className="h-4 w-4" />, description: "Waterschap, Veiligheidsregio, Omgevingsdienst, GGD, Recreatieschap" },
  { value: "gemeentelijk", label: "Gemeentelijk", icon: <Layers className="h-4 w-4" />, description: "Lokaal beleid en regelgeving" },
];

const ITEM_TYPES: { value: ItemType; label: string; icon: React.ReactNode }[] = [
  { value: "adviseur", label: "Adviseur", icon: <Users className="h-4 w-4" /> },
  { value: "beleidsdocument", label: "Beleidsdocument", icon: <FileText className="h-4 w-4" /> },
  { value: "toetsingskader", label: "Toetsingskader", icon: <BookOpen className="h-4 w-4" /> },
];

const PROVINCIES = [
  "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen",
  "Limburg", "Noord-Brabant", "Noord-Holland", "Overijssel",
  "Utrecht", "Zeeland", "Zuid-Holland"
];

export default function KennisbankBeheer() {
  // Using sonner toast
  const [selectedLaag, setSelectedLaag] = useState<Laag | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<ItemType | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<Status | undefined>("actief");
  const [zoekterm, setZoekterm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    laag: "gemeentelijk" as Laag,
    itemType: "adviseur" as ItemType,
    naam: "",
    samenvatting: "",
    url: "",
    triggers: "",
    juridischeStatus: "richtinggevend" as JuridischeStatus,
    wettelijkeBasis: "",
    scopeGemeenteId: undefined as number | undefined,
    scopeProvincie: "",
    scopeRegioCode: "",
    adviseurType: "extern" as "intern" | "extern",
    contactEmail: "",
    termijnWeken: 4,
    status: "actief" as Status,
  });

  // Queries
  const { data: itemsData, refetch: refetchItems } = trpc.kennisbank.list.useQuery({
    laag: selectedLaag,
    itemType: selectedType,
    status: selectedStatus,
    zoekterm: zoekterm || undefined,
    limit: 50,
  });

  const { data: stats } = trpc.kennisbank.statsPerLaag.useQuery();
  const { data: gemeenten } = trpc.gemeente.list.useQuery();

  // Mutations
  const createMutation = trpc.kennisbank.create.useMutation({
    onSuccess: () => {
      toast.success("Item aangemaakt", { description: "Het kennisbank item is succesvol aangemaakt." });
      setIsCreateDialogOpen(false);
      resetForm();
      refetchItems();
    },
    onError: (error) => {
      toast.error("Fout", { description: error.message });
    },
  });

  const updateMutation = trpc.kennisbank.update.useMutation({
    onSuccess: () => {
      toast.success("Item bijgewerkt", { description: "Het kennisbank item is succesvol bijgewerkt." });
      setEditingItem(null);
      refetchItems();
    },
    onError: (error) => {
      toast.error("Fout", { description: error.message });
    },
  });

  const deleteMutation = trpc.kennisbank.delete.useMutation({
    onSuccess: () => {
      toast.success("Item verwijderd", { description: "Het kennisbank item is gedeactiveerd." });
      refetchItems();
    },
    onError: (error) => {
      toast.error("Fout", { description: error.message });
    },
  });

  // Bulk import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importGemeenteId, setImportGemeenteId] = useState<number | undefined>(undefined);

  // Bulk import mutation
  const bulkImportMutation = trpc.kennisbank.bulkImport.useMutation({
    onSuccess: (result) => {
      if (result.failed === 0) {
        toast.success("Import geslaagd", { 
          description: `${result.success} items succesvol geïmporteerd.` 
        });
      } else {
        toast.warning("Import deels geslaagd", { 
          description: `${result.success} items geïmporteerd, ${result.failed} mislukt.` 
        });
      }
      setIsImportDialogOpen(false);
      setImportPreview([]);
      setImportFile(null);
      refetchItems();
    },
    onError: (error) => {
      toast.error("Import mislukt", { description: error.message });
    },
  });

  // Template query
  const { data: templateData } = trpc.kennisbank.getTemplate.useQuery();

  // CSV parsing function
  const parseCSV = (content: string): any[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(';').map(h => h.trim());
    const items: any[] = [];
    const errors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      if (values.length < 3) continue; // Skip empty lines
      
      const item: any = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header === 'termijnWeken' && value) {
          item[header] = parseInt(value, 10) || undefined;
        } else if (value) {
          item[header] = value;
        }
      });
      
      // Validate required fields
      if (!item.laag || !item.itemType || !item.naam) {
        errors.push(`Rij ${i + 1}: Verplichte velden ontbreken (laag, itemType, naam)`);
        continue;
      }
      
      // Validate enum values
      const validLagen = ['basis', 'rijks', 'provinciaal', 'regionaal', 'gemeentelijk'];
      const validTypes = ['adviseur', 'beleidsdocument', 'toetsingskader'];
      
      if (!validLagen.includes(item.laag)) {
        errors.push(`Rij ${i + 1}: Ongeldige laag "${item.laag}"`);
        continue;
      }
      if (!validTypes.includes(item.itemType)) {
        errors.push(`Rij ${i + 1}: Ongeldig itemType "${item.itemType}"`);
        continue;
      }
      
      items.push(item);
    }
    
    setImportErrors(errors);
    return items;
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    setImportErrors([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const items = parseCSV(content);
      setImportPreview(items);
    };
    reader.readAsText(file);
  };

  // Execute bulk import
  const executeBulkImport = () => {
    if (importPreview.length === 0) {
      toast.error("Geen items", { description: "Er zijn geen geldige items om te importeren." });
      return;
    }
    
    // Add gemeenteId to gemeentelijke items if selected
    const itemsToImport = importPreview.map(item => ({
      ...item,
      scopeGemeenteId: item.laag === 'gemeentelijk' ? importGemeenteId : undefined,
    }));
    
    bulkImportMutation.mutate({ items: itemsToImport });
  };

  // Download template
  const downloadTemplate = () => {
    if (!templateData) return;
    
    const blob = new Blob([templateData.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = templateData.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      laag: "gemeentelijk",
      itemType: "adviseur",
      naam: "",
      samenvatting: "",
      url: "",
      triggers: "",
      juridischeStatus: "richtinggevend",
      wettelijkeBasis: "",
      scopeGemeenteId: undefined,
      scopeProvincie: "",
      scopeRegioCode: "",
      adviseurType: "extern",
      contactEmail: "",
      termijnWeken: 4,
      status: "actief",
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...formData,
      triggers: formData.triggers ? JSON.stringify(formData.triggers.split(",").map(t => t.trim())) : undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingItem) return;
    updateMutation.mutate({
      id: editingItem.id,
      data: {
        naam: formData.naam,
        samenvatting: formData.samenvatting || undefined,
        url: formData.url || undefined,
        triggers: formData.triggers ? JSON.stringify(formData.triggers.split(",").map(t => t.trim())) : undefined,
        juridischeStatus: formData.juridischeStatus,
        wettelijkeBasis: formData.wettelijkeBasis || undefined,
        adviseurType: formData.adviseurType,
        contactEmail: formData.contactEmail || undefined,
        termijnWeken: formData.termijnWeken,
        status: formData.status,
      },
    });
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    let triggersStr = "";
    if (item.triggers) {
      try {
        const parsed = typeof item.triggers === "string" ? JSON.parse(item.triggers) : item.triggers;
        triggersStr = Array.isArray(parsed) ? parsed.join(", ") : "";
      } catch {
        triggersStr = "";
      }
    }
    setFormData({
      laag: item.laag,
      itemType: item.itemType,
      naam: item.naam,
      samenvatting: item.samenvatting || "",
      url: item.documentUrl || "",
      triggers: triggersStr,
      juridischeStatus: item.juridischeStatus || "richtinggevend",
      wettelijkeBasis: item.adviseurGrondslag || "",
      scopeGemeenteId: item.scopeGemeenteId,
      scopeProvincie: item.scopeProvincie || "",
      scopeRegioCode: item.scopeRegioCode || "",
      adviseurType: item.adviseurType || "extern",
      contactEmail: item.adviseurContactEmail || "",
      termijnWeken: item.adviseurTermijnWeken || 4,
      status: item.status,
    });
  };

  const getLaagBadgeColor = (laag: string) => {
    switch (laag) {
      case "basis": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "rijks": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "provinciaal": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "regionaal": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "gemeentelijk": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "actief": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "concept": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "inactief": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const renderForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Laag *</Label>
          <Select
            value={formData.laag}
            onValueChange={(v) => setFormData({ ...formData, laag: v as Laag })}
            disabled={!!editingItem}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAGEN.map((laag) => (
                <SelectItem key={laag.value} value={laag.value}>
                  <div className="flex items-center gap-2">
                    {laag.icon}
                    {laag.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select
            value={formData.itemType}
            onValueChange={(v) => setFormData({ ...formData, itemType: v as ItemType })}
            disabled={!!editingItem}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.icon}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scope velden op basis van laag */}
      {formData.laag === "provinciaal" && (
        <div className="space-y-2">
          <Label>Provincie *</Label>
          <Select
            value={formData.scopeProvincie}
            onValueChange={(v) => setFormData({ ...formData, scopeProvincie: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer provincie" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCIES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.laag === "regionaal" && (
        <div className="space-y-2">
          <Label>Regio Code *</Label>
          <Input
            value={formData.scopeRegioCode}
            onChange={(e) => setFormData({ ...formData, scopeRegioCode: e.target.value })}
            placeholder="bijv. hhnk, vr-nhn, od-nhn"
          />
          <p className="text-xs text-muted-foreground">
            Code van het waterschap, veiligheidsregio, omgevingsdienst of GGD
          </p>
        </div>
      )}

      {formData.laag === "gemeentelijk" && (
        <div className="space-y-2">
          <Label>Gemeente *</Label>
          <Select
            value={formData.scopeGemeenteId?.toString() || ""}
            onValueChange={(v) => setFormData({ ...formData, scopeGemeenteId: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer gemeente" />
            </SelectTrigger>
            <SelectContent>
              {gemeenten?.map((g) => (
                <SelectItem key={g.id} value={g.id.toString()}>{g.gemeenteNaam}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Naam *</Label>
        <Input
          value={formData.naam}
          onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
          placeholder="Naam van het item"
        />
      </div>

      <div className="space-y-2">
        <Label>Samenvatting</Label>
        <Textarea
          value={formData.samenvatting}
          onChange={(e) => setFormData({ ...formData, samenvatting: e.target.value })}
          placeholder="Korte beschrijving voor de AI"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Triggers (komma-gescheiden)</Label>
        <Input
          value={formData.triggers}
          onChange={(e) => setFormData({ ...formData, triggers: e.target.value })}
          placeholder="monument, beschermd gezicht, archeologie"
        />
        <p className="text-xs text-muted-foreground">
          Keywords die bepalen wanneer dit item relevant is
        </p>
      </div>

      {formData.itemType === "adviseur" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adviseur Type</Label>
              <Select
                value={formData.adviseurType}
                onValueChange={(v) => setFormData({ ...formData, adviseurType: v as "intern" | "extern" })}
              >
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
              <Label>Termijn (weken)</Label>
              <Input
                type="number"
                value={formData.termijnWeken}
                onChange={(e) => setFormData({ ...formData, termijnWeken: parseInt(e.target.value) || 4 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              placeholder="adviseur@example.com"
            />
          </div>
        </>
      )}

      {formData.itemType === "beleidsdocument" && (
        <div className="space-y-2">
          <Label>Document URL</Label>
          <Input
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Juridische Status</Label>
          <Select
            value={formData.juridischeStatus}
            onValueChange={(v) => setFormData({ ...formData, juridischeStatus: v as JuridischeStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normstellend">Normstellend (bindend)</SelectItem>
              <SelectItem value="richtinggevend">Richtinggevend</SelectItem>
              <SelectItem value="afwegingskader">Afwegingskader</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as Status })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actief">Actief</SelectItem>
              <SelectItem value="concept">Concept</SelectItem>
              <SelectItem value="inactief">Inactief</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Wettelijke Basis / Grondslag</Label>
        <Input
          value={formData.wettelijkeBasis}
          onChange={(e) => setFormData({ ...formData, wettelijkeBasis: e.target.value })}
          placeholder="bijv. Artikel 4.2 Omgevingswet"
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kennisbank Beheer</h1>
            <p className="text-muted-foreground">
              Beheer adviseurs, beleidsdocumenten en toetsingskaders per laag
            </p>
          </div>
          <div className="flex gap-2">
            {/* Download Template Button */}
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
            
            {/* Import Button */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Importeren
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Import</DialogTitle>
                  <DialogDescription>
                    Upload een CSV bestand om meerdere kennisbank items tegelijk te importeren.
                    Download eerst de template voor het juiste formaat.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>CSV Bestand</Label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gebruik puntkomma (;) als scheidingsteken. Download de template voor het juiste formaat.
                    </p>
                  </div>
                  
                  {/* Gemeente selectie voor gemeentelijke items */}
                  <div className="space-y-2">
                    <Label>Gemeente (voor gemeentelijke items)</Label>
                    <Select
                      value={importGemeenteId?.toString() || ""}
                      onValueChange={(v) => setImportGemeenteId(v ? parseInt(v, 10) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer gemeente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {gemeenten?.map((g) => (
                          <SelectItem key={g.id} value={g.id.toString()}>
                            {g.gemeenteNaam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecteer de gemeente voor items met laag "gemeentelijk"
                    </p>
                  </div>
                  
                  {/* Validation Errors */}
                  {importErrors.length > 0 && (
                    <div className="rounded-md bg-destructive/10 p-4">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Validatiefouten ({importErrors.length})</span>
                      </div>
                      <ul className="text-sm text-destructive space-y-1 max-h-32 overflow-y-auto">
                        {importErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Preview */}
                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">{importPreview.length} items klaar voor import</span>
                      </div>
                      <div className="rounded-md border max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Laag</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Naam</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importPreview.slice(0, 10).map((item, i) => (
                              <TableRow key={i}>
                                <TableCell>
                                  <Badge className={getLaagBadgeColor(item.laag)}>
                                    {item.laag}
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.itemType}</TableCell>
                                <TableCell className="max-w-xs truncate">{item.naam}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {item.juridischeStatus || 'richtinggevend'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {importPreview.length > 10 && (
                          <p className="text-xs text-muted-foreground p-2 text-center">
                            ... en {importPreview.length - 10} meer items
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportPreview([]);
                    setImportErrors([]);
                    setImportFile(null);
                  }}>
                    Annuleren
                  </Button>
                  <Button 
                    onClick={executeBulkImport} 
                    disabled={importPreview.length === 0 || bulkImportMutation.isPending}
                  >
                    {bulkImportMutation.isPending ? "Bezig..." : `Importeer ${importPreview.length} items`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Create Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingItem(null); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuw Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuw Kennisbank Item</DialogTitle>
                <DialogDescription>
                  Voeg een nieuw item toe aan de kennisbank
                </DialogDescription>
              </DialogHeader>
              {renderForm()}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Bezig..." : "Aanmaken"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {LAGEN.map((laag) => (
            <Card key={laag.value} className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedLaag(selectedLaag === laag.value ? undefined : laag.value)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{laag.label}</CardTitle>
                {laag.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats ? (stats as any)[laag.value === "basis" ? "rijks" : laag.value] || 0 : 0}
                </div>
                <p className="text-xs text-muted-foreground truncate">{laag.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="sr-only">Zoeken</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op naam of samenvatting..."
                    value={zoekterm}
                    onChange={(e) => setZoekterm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select
                value={selectedLaag || "all"}
                onValueChange={(v) => setSelectedLaag(v === "all" ? undefined : v as Laag)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle lagen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle lagen</SelectItem>
                  {LAGEN.map((laag) => (
                    <SelectItem key={laag.value} value={laag.value}>{laag.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedType || "all"}
                onValueChange={(v) => setSelectedType(v === "all" ? undefined : v as ItemType)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  {ITEM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedStatus || "all"}
                onValueChange={(v) => setSelectedStatus(v === "all" ? undefined : v as Status)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="inactief">Inactief</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Kennisbank Items
              {itemsData && <span className="ml-2 text-muted-foreground font-normal">({itemsData.total} items)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Laag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Juridische Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsData?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.naam}</div>
                        {item.samenvatting && (
                          <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {item.samenvatting}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getLaagBadgeColor(item.laag)}>
                        {LAGEN.find(l => l.value === item.laag)?.label || item.laag}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ITEM_TYPES.find(t => t.value === item.itemType)?.icon}
                        {ITEM_TYPES.find(t => t.value === item.itemType)?.label || item.itemType}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.juridischeStatus && (
                        <Badge variant="outline">
                          {item.juridischeStatus === "normstellend" ? "Normstellend" :
                           item.juridischeStatus === "richtinggevend" ? "Richtinggevend" :
                           "Afwegingskader"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(item.status || 'actief')}>
                        {item.status || 'actief'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Weet je zeker dat je dit item wilt deactiveren?")) {
                              deleteMutation.mutate({ id: item.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!itemsData?.items || itemsData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Geen items gevonden. Pas de filters aan of voeg een nieuw item toe.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Item Bewerken</DialogTitle>
              <DialogDescription>
                Pas de gegevens van dit kennisbank item aan
              </DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Annuleren
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Bezig..." : "Opslaan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

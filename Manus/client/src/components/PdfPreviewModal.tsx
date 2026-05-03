/**
 * PDF Preview Modal Component
 * 
 * Toont een PDF preview in een modal voordat de gebruiker het document downloadt.
 * Bevat annotatie functionaliteit, print mogelijkheid en keyboard shortcuts.
 * Gebruikt react-pdf voor in-browser PDF rendering.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Download, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  Loader2,
  FileWarning,
  Maximize2,
  Minimize2,
  Printer,
  MessageSquarePlus,
  Highlighter,
  Trash2,
  Keyboard
} from 'lucide-react';
import { toast } from 'sonner';

// Configureer pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Types voor annotaties
interface Annotation {
  id: string;
  pageNumber: number;
  x: number; // percentage van pagina breedte
  y: number; // percentage van pagina hoogte
  type: 'comment' | 'highlight';
  content: string;
  color?: string;
  createdAt: Date;
}

interface PdfPreviewModalProps {
  /** URL naar de PDF of base64 data */
  pdfUrl: string | null;
  /** Of de modal open is */
  isOpen: boolean;
  /** Callback wanneer de modal wordt gesloten */
  onClose: () => void;
  /** Callback wanneer de gebruiker op download klikt */
  onDownload?: () => void;
  /** Callback wanneer annotaties worden opgeslagen */
  onSaveAnnotations?: (annotations: Annotation[]) => void;
  /** Bestaande annotaties om te laden */
  initialAnnotations?: Annotation[];
  /** Titel van het document */
  title?: string;
  /** Bestandsnaam voor download */
  filename?: string;
}

export default function PdfPreviewModal({
  pdfUrl,
  isOpen,
  onClose,
  onDownload,
  onSaveAnnotations,
  initialAnnotations = [],
  title = 'Behandelrapport Preview',
  filename = 'rapport.pdf'
}: PdfPreviewModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Annotatie state
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [isAnnotationMode, setIsAnnotationMode] = useState<boolean>(false);
  const [annotationType, setAnnotationType] = useState<'comment' | 'highlight'>('comment');
  const [newAnnotationContent, setNewAnnotationContent] = useState<string>('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Laad initiële annotaties wanneer modal opent
  useEffect(() => {
    if (isOpen && initialAnnotations.length > 0) {
      setAnnotations(initialAnnotations);
    }
  }, [isOpen, initialAnnotations]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setError('Kon de PDF niet laden. Probeer het opnieuw of download direct.');
    setIsLoading(false);
  }, []);

  // Navigatie functies
  const goToPrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  const goToFirstPage = useCallback(() => {
    setPageNumber(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setPageNumber(numPages);
  }, [numPages]);

  // Zoom functies
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 2.5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Negeer als we in een input veld typen
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        // Paginering
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          goToNextPage();
          break;
        case 'Home':
          e.preventDefault();
          goToFirstPage();
          break;
        case 'End':
          e.preventDefault();
          goToLastPage();
          break;
        
        // Zoom
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetZoom();
          }
          break;
        
        // Andere shortcuts
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsFullscreen(prev => !prev);
          }
          break;
        case 'p':
        case 'P':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handlePrint();
          }
          break;
        case 'Escape':
          if (isAnnotationMode) {
            setIsAnnotationMode(false);
            setSelectedAnnotation(null);
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAnnotationMode, goToPrevPage, goToNextPage, goToFirstPage, goToLastPage, zoomIn, zoomOut, resetZoom]);

  // Download functie
  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onDownload?.();
      toast.success('PDF wordt gedownload');
    }
  };

  // Print functie
  const handlePrint = () => {
    if (pdfUrl) {
      // Open PDF in nieuw venster voor printen
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
        toast.success('Print dialoog wordt geopend');
      } else {
        // Fallback: gebruik iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = pdfUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        };
        toast.success('Print dialoog wordt geopend');
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Annotatie functies
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotationMode || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (annotationType === 'comment') {
      // Maak een nieuwe annotatie
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        pageNumber,
        x,
        y,
        type: 'comment',
        content: '',
        createdAt: new Date()
      };
      setSelectedAnnotation(newAnnotation);
    } else if (annotationType === 'highlight') {
      // Maak een highlight annotatie
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        pageNumber,
        x,
        y,
        type: 'highlight',
        content: 'Gemarkeerd',
        color: '#ffeb3b',
        createdAt: new Date()
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      toast.success('Markering toegevoegd');
    }
  };

  const saveAnnotation = () => {
    if (selectedAnnotation && newAnnotationContent.trim()) {
      const updatedAnnotation = {
        ...selectedAnnotation,
        content: newAnnotationContent.trim()
      };
      
      setAnnotations(prev => {
        const existing = prev.find(a => a.id === updatedAnnotation.id);
        if (existing) {
          return prev.map(a => a.id === updatedAnnotation.id ? updatedAnnotation : a);
        }
        return [...prev, updatedAnnotation];
      });
      
      setSelectedAnnotation(null);
      setNewAnnotationContent('');
      toast.success('Opmerking opgeslagen');
    }
  };

  const deleteAnnotation = (annotationId: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    setSelectedAnnotation(null);
    toast.success('Annotatie verwijderd');
  };

  const saveAllAnnotations = () => {
    onSaveAnnotations?.(annotations);
    toast.success(`${annotations.length} annotatie(s) opgeslagen`);
  };

  // Reset state wanneer modal sluit
  const handleClose = () => {
    setPageNumber(1);
    setScale(1.0);
    setIsLoading(true);
    setError(null);
    setIsFullscreen(false);
    setIsAnnotationMode(false);
    setSelectedAnnotation(null);
    setNewAnnotationContent('');
    setShowShortcutsHelp(false);
    onClose();
  };

  // Filter annotaties voor huidige pagina
  const currentPageAnnotations = annotations.filter(a => a.pageNumber === pageNumber);

  if (!pdfUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        ref={dialogRef}
        className={`${isFullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-5xl h-[90vh]'} flex flex-col p-0 gap-0`}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="text-sm">
                Controleer het rapport voordat u het downloadt • Druk op ? voor sneltoetsen
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              {/* Annotatie tools */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={isAnnotationMode ? "default" : "ghost"}
                    size="icon"
                    title="Annotaties"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Annotatie tools</h4>
                    <div className="flex gap-2">
                      <Button
                        variant={annotationType === 'comment' && isAnnotationMode ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setAnnotationType('comment');
                          setIsAnnotationMode(true);
                        }}
                      >
                        <MessageSquarePlus className="h-3 w-3 mr-1" />
                        Opmerking
                      </Button>
                      <Button
                        variant={annotationType === 'highlight' && isAnnotationMode ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setAnnotationType('highlight');
                          setIsAnnotationMode(true);
                        }}
                      >
                        <Highlighter className="h-3 w-3 mr-1" />
                        Markeren
                      </Button>
                    </div>
                    {isAnnotationMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setIsAnnotationMode(false)}
                      >
                        Annuleren
                      </Button>
                    )}
                    {annotations.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          {annotations.length} annotatie(s)
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={saveAllAnnotations}
                        >
                          Annotaties opslaan
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Print knop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrint}
                title="Printen (Ctrl+P)"
                disabled={isLoading || !!error}
              >
                <Printer className="h-4 w-4" />
              </Button>

              {/* Keyboard shortcuts help */}
              <Popover open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Sneltoetsen (?)"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <h4 className="font-medium text-sm mb-3">Sneltoetsen</h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">← / →</span>
                      <span>Vorige/Volgende pagina</span>
                      <span className="text-muted-foreground">Home / End</span>
                      <span>Eerste/Laatste pagina</span>
                      <span className="text-muted-foreground">+ / -</span>
                      <span>In-/Uitzoomen</span>
                      <span className="text-muted-foreground">Ctrl+0</span>
                      <span>Reset zoom</span>
                      <span className="text-muted-foreground">F</span>
                      <span>Volledig scherm</span>
                      <span className="text-muted-foreground">Ctrl+P</span>
                      <span>Printen</span>
                      <span className="text-muted-foreground">Esc</span>
                      <span>Annotatie annuleren</span>
                      <span className="text-muted-foreground">?</span>
                      <span>Deze hulp</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Fullscreen toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Verkleinen (F)' : 'Vergroten (F)'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Annotatie mode indicator */}
        {isAnnotationMode && (
          <div className="px-6 py-2 bg-primary/10 border-b text-sm flex items-center justify-between">
            <span>
              <strong>Annotatie modus:</strong> Klik op de PDF om een {annotationType === 'comment' ? 'opmerking' : 'markering'} toe te voegen
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsAnnotationMode(false)}>
              Annuleren
            </Button>
          </div>
        )}

        {/* PDF Viewer */}
        <div 
          ref={pdfContainerRef}
          className={`flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 relative ${isAnnotationMode ? 'cursor-crosshair' : ''}`}
          onClick={handlePdfClick}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">PDF laden...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center p-6">
                <FileWarning className="h-12 w-12 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{error}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    U kunt het bestand nog steeds downloaden.
                  </p>
                </div>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Direct downloaden
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-4 relative">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className="shadow-lg relative"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                />
              </Document>

              {/* Render annotaties voor huidige pagina */}
              {currentPageAnnotations.map(annotation => (
                <div
                  key={annotation.id}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${annotation.x}%`,
                    top: `${annotation.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotation(annotation);
                    setNewAnnotationContent(annotation.content);
                  }}
                >
                  {annotation.type === 'comment' ? (
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                      <MessageSquarePlus className="h-3 w-3 text-yellow-900" />
                    </div>
                  ) : (
                    <div 
                      className="w-8 h-8 rounded opacity-50"
                      style={{ backgroundColor: annotation.color || '#ffeb3b' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Annotatie editor popover */}
          {selectedAnnotation && (
            <div 
              className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-72 z-20"
              style={{
                left: `${Math.min(selectedAnnotation.x, 70)}%`,
                top: `${Math.min(selectedAnnotation.y + 5, 80)}%`
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {selectedAnnotation.type === 'comment' ? 'Opmerking' : 'Markering'}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteAnnotation(selectedAnnotation.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Voer uw opmerking in..."
                  value={newAnnotationContent}
                  onChange={(e) => setNewAnnotationContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedAnnotation(null);
                      setNewAnnotationContent('');
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={saveAnnotation}
                    disabled={!newAnnotationContent.trim()}
                  >
                    Opslaan
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer met navigatie en acties */}
        <DialogFooter className="px-6 py-3 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            {/* Paginering */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1 || isLoading || !!error}
                title="Vorige pagina (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= numPages) {
                      setPageNumber(val);
                    }
                  }}
                  className="w-14 h-8 text-center text-sm"
                  disabled={isLoading || !!error}
                />
                <span className="text-sm text-muted-foreground">
                  / {numPages || '...'}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages || isLoading || !!error}
                title="Volgende pagina (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={zoomOut}
                disabled={scale <= 0.5 || isLoading || !!error}
                title="Uitzoomen (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
                className="min-w-[60px]"
                title="Reset zoom (Ctrl+0)"
              >
                {Math.round(scale * 100)}%
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={zoomIn}
                disabled={scale >= 2.5 || isLoading || !!error}
                title="Inzoomen (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Acties */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Sluiten
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePrint} 
                disabled={!pdfUrl || isLoading || !!error}
              >
                <Printer className="h-4 w-4 mr-2" />
                Printen
              </Button>
              <Button onClick={handleDownload} disabled={!pdfUrl}>
                <Download className="h-4 w-4 mr-2" />
                Downloaden
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

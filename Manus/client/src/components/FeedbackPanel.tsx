import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type FeedbackType = 'algemeen' | 'procedure' | 'adviseurs' | 'toetsingskaders' | 'volledigheid' | 'juridisch' | 'beleidsdocumenten' | 'overig';
type Score = 'positief' | 'negatief' | 'neutraal';

interface FeedbackPanelProps {
  behandelrapportId: number;
  sectionType: FeedbackType;
  sectionTitle: string;
  originalValue?: string;
  activiteitType?: string;
  beschermingsregime?: string;
  compact?: boolean;
}

export function FeedbackPanel({
  behandelrapportId,
  sectionType,
  sectionTitle,
  originalValue,
  activiteitType,
  beschermingsregime,
  compact = false,
}: FeedbackPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState<Score | null>(null);
  const [correctie, setCorrectie] = useState('');
  const [redenIncorrect, setRedenIncorrect] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Feedback opgeslagen! Het systeem leert van uw correcties.');
    },
    onError: (error) => {
      toast.error(`Fout bij opslaan: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!score) {
      toast.error('Selecteer eerst een beoordeling (👍 of 👎)');
      return;
    }

    submitFeedback.mutate({
      behandelrapportId,
      feedbackType: sectionType,
      score,
      correctie: correctie || undefined,
      redenIncorrect: redenIncorrect || undefined,
      origineleWaarde: originalValue,
      gecorrigeerdeWaarde: score === 'negatief' ? correctie : undefined,
      activiteitType,
      beschermingsregime,
    });
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span>Bedankt voor uw feedback!</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground">Was dit correct?</span>
        <Button
          variant={score === 'positief' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => {
            setScore('positief');
            submitFeedback.mutate({
              behandelrapportId,
              feedbackType: sectionType,
              score: 'positief',
              origineleWaarde: originalValue,
              activiteitType,
              beschermingsregime,
            });
          }}
          disabled={submitFeedback.isPending}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={score === 'negatief' ? 'destructive' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => {
            setScore('negatief');
            setIsOpen(true);
          }}
          disabled={submitFeedback.isPending}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
        
        {isOpen && score === 'negatief' && (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder="Wat was correct geweest?"
              className="flex-1 h-7 px-2 text-xs border rounded"
              value={correctie}
              onChange={(e) => setCorrectie(e.target.value)}
            />
            <Button
              size="sm"
              className="h-7"
              onClick={handleSubmit}
              disabled={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verstuur'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>Feedback geven</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3">
        <Card className="border-dashed">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Feedback: {sectionTitle}
              <Badge variant="outline" className="text-xs">Zelflerend systeem</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Was dit onderdeel correct?</p>
              <div className="flex gap-2">
                <Button
                  variant={score === 'positief' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScore('positief')}
                  className="gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Correct
                </Button>
                <Button
                  variant={score === 'negatief' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setScore('negatief')}
                  className="gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Onjuist
                </Button>
              </div>
            </div>

            {score === 'negatief' && (
              <>
                <div>
                  <label className="text-sm font-medium">Wat was er onjuist?</label>
                  <Textarea
                    placeholder="Beschrijf kort wat er niet klopte..."
                    value={redenIncorrect}
                    onChange={(e) => setRedenIncorrect(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Wat had het moeten zijn?</label>
                  <Textarea
                    placeholder="Geef de correcte informatie..."
                    value={correctie}
                    onChange={(e) => setCorrectie(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Annuleren
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmit}
                disabled={submitFeedback.isPending || !score}
              >
                {submitFeedback.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  'Feedback versturen'
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Uw feedback helpt het systeem om te leren. Bij herhaalde correcties wordt dit automatisch meegenomen in toekomstige analyses.
            </p>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Quick feedback buttons for inline use
export function QuickFeedback({
  behandelrapportId,
  sectionType,
  originalValue,
  activiteitType,
  beschermingsregime,
}: Omit<FeedbackPanelProps, 'sectionTitle' | 'compact'>) {
  return (
    <FeedbackPanel
      behandelrapportId={behandelrapportId}
      sectionType={sectionType}
      sectionTitle={sectionType}
      originalValue={originalValue}
      activiteitType={activiteitType}
      beschermingsregime={beschermingsregime}
      compact
    />
  );
}

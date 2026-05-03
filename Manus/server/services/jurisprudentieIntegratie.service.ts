/**
 * Jurisprudentie Integratie Service
 * 
 * Integreert rechtspraak in de AI analyse context wanneer dit meerwaarde heeft.
 * Volgt het principe: alleen jurisprudentie gebruiken bij complexe zaken waar
 * vage normen, verwachte bezwaren, of precedentwerking relevant zijn.
 */

import { 
  bepaalJurisprudentieMeerwaarde, 
  getRelevantJurisprudentie,
  getAlleBeleidsverwijzingen,
  type AnalyseContext 
} from './jurisprudentieCrawler';
import { 
  vergelijkMetKennisbank, 
  analyseerEnZoekOntbrekendBeleid,
  type BeleidsverwijzingUitJurisprudentie 
} from './beleidZoekService';
import { getDb } from '../db';
import { beleidSuggestie } from '../../drizzle/schema';
import { eq, and, count } from 'drizzle-orm';

export interface JurisprudentieContext {
  isRelevant: boolean;
  trigger?: {
    heeftMeerwaarde: boolean;
    reden: string;
    relevanteThemas: string[];
  };
  cases: RelevantCase[];
  beleidsverwijzingen: BeleidsverwijzingUitJurisprudentie[];
  aiContextTekst: string;
}

export interface RelevantCase {
  ecli: string;
  titel: string;
  instantie: string;
  datum: string;
  relevantieScore: number;
  samenvatting: string;
  kernoverweging?: string;
  isOmgevingswet: boolean;
  url: string;
}

/**
 * Bepaal of jurisprudentie relevant is voor deze aanvraag en verzamel context
 */
export async function verzamelJurisprudentieContext(
  activiteiten: string[],
  omschrijving: string,
  gemeenteId: number,
  gemeenteNaam: string,
  isBOPA: boolean = false,
  isMonument: boolean = false,
  heeftStikstof: boolean = false
): Promise<JurisprudentieContext> {
  // Bouw analyse context
  const analyseContext: AnalyseContext = {
    activiteiten,
    isBOPA,
    isMonument,
    heeftStikstof,
    heeftBelangenafweging: isBOPA || omschrijving.toLowerCase().includes('belangenafweging'),
    beleidOntbreekt: false, // Wordt later bepaald
    bezwaarWaarschijnlijk: isBOPA || isMonument,
    vageNormen: detecteerVageNormen(omschrijving)
  };

  // Stap 1: Bepaal of jurisprudentie meerwaarde heeft
  const trigger = bepaalJurisprudentieMeerwaarde(analyseContext);
  
  if (!trigger.heeftMeerwaarde) {
    return {
      isRelevant: false,
      cases: [],
      beleidsverwijzingen: [],
      aiContextTekst: ''
    };
  }

  console.log('[Jurisprudentie] Meerwaarde gedetecteerd:', trigger.reden);
  console.log('[Jurisprudentie] Relevante themas:', trigger.relevanteThemas);

  // Stap 2: Haal relevante jurisprudentie op uit database
  const jurisprudentieCases = await getRelevantJurisprudentie(
    trigger.relevanteThemas,
    10 // Max 10 cases
  );

  if (jurisprudentieCases.length === 0) {
    console.log('[Jurisprudentie] Geen relevante cases gevonden in database');
    return {
      isRelevant: false,
      trigger,
      cases: [],
      beleidsverwijzingen: [],
      aiContextTekst: ''
    };
  }

  console.log(`[Jurisprudentie] ${jurisprudentieCases.length} relevante cases gevonden`);

  // Stap 3: Converteer naar RelevantCase format
  const relevanteCases: RelevantCase[] = jurisprudentieCases.map((c: any) => ({
    ecli: c.ecli,
    titel: c.titel || 'Geen titel',
    instantie: c.instantie,
    datum: c.datumUitspraak ? new Date(c.datumUitspraak).toISOString().split('T')[0] : 'onbekend',
    relevantieScore: c.relevantieScore / 100,
    samenvatting: c.inhoudsindicatie || c.aiSamenvatting || '',
    kernoverweging: c.aiToetsingscriteria,
    isOmgevingswet: c.isOmgevingswetRelevant,
    url: `https://uitspraken.rechtspraak.nl/#!/details?id=${c.ecli}`
  }));

  // Stap 4: Haal beleidsverwijzingen op
  const beleidsverwijzingen = await getAlleBeleidsverwijzingen();
  
  // Converteer naar juiste type
  const verwijzingenVoorKennisbank: BeleidsverwijzingUitJurisprudentie[] = beleidsverwijzingen.map((v: any) => ({
    beleidsNaam: v.beleidsNaam,
    beleidsType: v.beleidsType || 'onbekend',
    gemeenteInJurisprudentie: v.gemeenteInJurisprudentie,
    genoemdeNormen: v.genoemdeNormen,
    citaat: v.citaat,
    ecli: v.jurisprudentieId?.toString() || ''
  }));

  // Stap 5: Vergelijk met kennisbank en zoek ontbrekend beleid
  if (verwijzingenVoorKennisbank.length > 0) {
    try {
      const vergelijking = await vergelijkMetKennisbank(gemeenteId, verwijzingenVoorKennisbank);
      
      // Als er ontbrekend beleid is, zoek op internet
      if (vergelijking.ontbrekend.length > 0) {
        console.log(`[Jurisprudentie] ${vergelijking.ontbrekend.length} ontbrekende beleidsdocumenten, zoeken op internet...`);
        await analyseerEnZoekOntbrekendBeleid(gemeenteId, gemeenteNaam, verwijzingenVoorKennisbank);
      }
    } catch (error) {
      console.error('[Jurisprudentie] Fout bij vergelijken met kennisbank:', error);
    }
  }

  // Stap 6: Genereer AI context tekst
  const aiContextTekst = formatJurisprudentieVoorAI(
    trigger,
    relevanteCases,
    verwijzingenVoorKennisbank
  );

  return {
    isRelevant: true,
    trigger,
    cases: relevanteCases,
    beleidsverwijzingen: verwijzingenVoorKennisbank,
    aiContextTekst
  };
}

/**
 * Detecteer vage normen in de omschrijving
 */
function detecteerVageNormen(omschrijving: string): string[] {
  const vageNormen: string[] = [];
  const tekst = omschrijving.toLowerCase();
  
  const vageNormPatronen = [
    { patroon: 'redelijke eisen van welstand', norm: 'welstandstoets' },
    { patroon: 'goede ruimtelijke ordening', norm: 'ruimtelijke ordening' },
    { patroon: 'aanvaardbaar woon- en leefklimaat', norm: 'woon- en leefklimaat' },
    { patroon: 'evenwichtige toedeling van functies', norm: 'evenwichtige toedeling' },
    { patroon: 'stedenbouwkundig aanvaardbaar', norm: 'stedenbouwkundige inpassing' },
    { patroon: 'onevenredige aantasting', norm: 'evenredigheid' },
    { patroon: 'zwaarwegend belang', norm: 'belangenafweging' }
  ];
  
  for (const { patroon, norm } of vageNormPatronen) {
    if (tekst.includes(patroon)) {
      vageNormen.push(norm);
    }
  }
  
  return vageNormen;
}

/**
 * Format jurisprudentie context voor AI prompt
 */
function formatJurisprudentieVoorAI(
  trigger: { heeftMeerwaarde: boolean; reden: string; relevanteThemas: string[] },
  cases: RelevantCase[],
  beleidsverwijzingen: BeleidsverwijzingUitJurisprudentie[]
): string {
  if (cases.length === 0) {
    return '';
  }

  let context = `
## RELEVANTE JURISPRUDENTIE
Jurisprudentie is relevant voor deze aanvraag vanwege: ${trigger.reden}

### Belangrijkste uitspraken (gesorteerd op relevantie)
`;

  // Top 5 cases
  const topCases = cases.slice(0, 5);
  for (const caseItem of topCases) {
    const omgevingswetLabel = caseItem.isOmgevingswet ? '✓ Omgevingswet' : '⚠ Wro/Wabo';
    context += `
#### ${caseItem.instantie} - ${caseItem.datum} (${omgevingswetLabel})
- **ECLI**: ${caseItem.ecli}
- **Relevantiescore**: ${Math.round(caseItem.relevantieScore * 100)}%
- **Samenvatting**: ${caseItem.samenvatting}
${caseItem.kernoverweging ? `- **Kernoverweging**: ${caseItem.kernoverweging}` : ''}
`;
  }

  // Beleidsverwijzingen uit jurisprudentie
  if (beleidsverwijzingen.length > 0) {
    context += `
### Beleid genoemd in jurisprudentie
De volgende beleidsdocumenten worden in de jurisprudentie genoemd en kunnen relevant zijn:
`;
    for (const verwijzing of beleidsverwijzingen.slice(0, 10)) {
      context += `- **${verwijzing.beleidsNaam}** (${verwijzing.beleidsType})\n`;
    }
  }

  // Instructies voor AI
  context += `
### Instructies voor gebruik jurisprudentie
1. **Weeg recente uitspraken zwaarder**: Uitspraken na 1-1-2024 (Omgevingswet) hebben meer precedentwaarde
2. **Raad van State boven Rechtbank**: Uitspraken van de Raad van State zijn leidend
3. **Vergelijk met lokale situatie**: Controleer of de feiten vergelijkbaar zijn
4. **Citeer correct**: Verwijs naar ECLI en datum bij gebruik in rapport
5. **Beleid uit jurisprudentie**: Check of vergelijkbaar beleid bestaat voor deze gemeente
`;

  return context;
}

/**
 * Genereer jurisprudentie sectie voor rapport
 */
export function genereerJurisprudentieSectie(context: JurisprudentieContext): string {
  if (!context.isRelevant || context.cases.length === 0) {
    return '';
  }

  let sectie = `
## Relevante Jurisprudentie

Bij de beoordeling van deze aanvraag is jurisprudentie geraadpleegd vanwege: **${context.trigger?.reden || 'complexe aspecten'}**.

### Relevante uitspraken
`;

  for (const caseItem of context.cases.slice(0, 3)) {
    const omgevingswetStatus = caseItem.isOmgevingswet 
      ? 'Uitspraak onder Omgevingswet (hoge precedentwaarde)'
      : 'Uitspraak onder Wro/Wabo (beperkte precedentwaarde na 1-1-2024)';
    
    sectie += `
#### ${caseItem.titel}
- **Instantie**: ${caseItem.instantie}
- **Datum**: ${new Date(caseItem.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
- **ECLI**: [${caseItem.ecli}](${caseItem.url})
- **Status**: ${omgevingswetStatus}
- **Relevantie**: ${caseItem.samenvatting}
${caseItem.kernoverweging ? `\n> "${caseItem.kernoverweging}"` : ''}
`;
  }

  // Beleidsverwijzingen
  if (context.beleidsverwijzingen.length > 0) {
    sectie += `
### Beleid uit jurisprudentie
De volgende beleidsdocumenten worden in de jurisprudentie genoemd:
`;
    for (const verwijzing of context.beleidsverwijzingen.slice(0, 5)) {
      sectie += `- **${verwijzing.beleidsNaam}** (${verwijzing.beleidsType})\n`;
    }
  }

  return sectie;
}

/**
 * Check of er openstaande beleidsuggesties zijn voor een gemeente
 */
export async function heeftOpenstaandeSuggesties(gemeenteId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.select({ count: count() })
      .from(beleidSuggestie)
      .where(and(
        eq(beleidSuggestie.gemeenteId, gemeenteId),
        eq(beleidSuggestie.status, 'pending')
      ));
    
    return (result[0]?.count || 0) > 0;
  } catch (error) {
    console.error('[Jurisprudentie] Fout bij check openstaande suggesties:', error);
    return false;
  }
}

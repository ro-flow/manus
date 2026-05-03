/**
 * Indicator Enrichment Service
 * 
 * Verrijkt elke indicator met:
 * - wettelijkeGrondslag: exacte artikelnummers en wetten
 * - consequenties: wat betekent dit voor de aanvrager (suggestief)
 * - suggesties: welke onderzoeken/adviezen worden aanbevolen
 * - relevantieToelichting: waarom is dit relevant bij verschillende typen aanvragen
 */

import type { IndicatorResult } from './omgevingsscanEngine';
import { ENRICHMENT_PART2 } from './indicatorEnrichment_part2';

interface EnrichmentEntry {
  wettelijkeGrondslag: string;
  consequenties: Record<string, string>;
  suggesties: Record<string, string[]>;
  relevantieToelichting: Record<string, string>;
}

// Merge all enrichment data from part2 (which contains all indicators)
const ALL_ENRICHMENT: Record<string, EnrichmentEntry> = ENRICHMENT_PART2 as Record<string, EnrichmentEntry>;

/**
 * Enrich an array of IndicatorResults with wettelijkeGrondslag, consequenties, suggesties, relevantieToelichting.
 * This is called after all indicators are computed.
 */
export function enrichIndicators(indicators: IndicatorResult[]): IndicatorResult[] {
  return indicators.map(ind => {
    const enrichment = ALL_ENRICHMENT[ind.code];
    if (!enrichment) return ind;

    const statusKey = ind.status === 'error' || ind.status === 'onbekend' ? 'relevant' : ind.status;

    return {
      ...ind,
      wettelijkeGrondslag: ind.wettelijkeGrondslag || enrichment.wettelijkeGrondslag,
      consequenties: ind.consequenties || enrichment.consequenties[statusKey] || enrichment.consequenties.relevant || '',
      suggesties: ind.suggesties || enrichment.suggesties[statusKey] || enrichment.suggesties.relevant || [],
      relevantieToelichting: ind.relevantieToelichting || enrichment.relevantieToelichting[statusKey] || enrichment.relevantieToelichting.relevant || '',
    };
  });
}

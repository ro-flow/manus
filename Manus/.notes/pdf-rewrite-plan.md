# PDF Rapport Herschrijving Plan

## Huidige structuur:
1. Cover page (adres, gemeente, postcode, coords, datum)
2. Samenvatting (kaart + donut chart + summary cards + inhoudsopgave + aandachtspunten overzicht)
3. AI Samenvatting (professionele analyse & aanbevelingen)
4. Gedetailleerde resultaten per thema (alle indicatoren)
5. Disclaimer + footer

## Gewenste structuur (plannentoets als startpunt):
1. Cover page (behouden)
2. **NIEUW: Planologisch kader** (als eerste inhoudelijke sectie)
   - Vigerende bestemmingsplannen (uit BESTEMMINGSPLAN indicator)
   - Enkelbestemmingen (uit BESTEMMING indicator)
   - Dubbelbestemmingen (uit DUBBELBESTEMMING indicator) 
   - Gebiedsaanduidingen (uit GEBIEDSAANDUIDING indicator)
   - Bouwvlak & maatvoering (uit BOUWVLAK en MAATVOERING indicators)
   - Parapluplannen (uit PARAPLUPLAN indicator)
   - Voorbereidingsbesluiten (uit VOORBEREIDINGSBESLUIT indicator)
   - Planregels (uit PLANREGELS indicator)
   - Onderzoeksvereisten (uit ONDERZOEKSVEREISTEN indicator)
3. **NIEUW: Omgevingsloket / DSO** (beter gepresenteerd)
   - DSO Activiteiten
   - DSO Conclusies
   - Omgevingsplan regels
4. Samenvatting (donut chart + summary cards)
5. Kaart
6. AI Samenvatting
7. Gedetailleerde resultaten per thema (overige thema's)
8. Disclaimer + footer

## Key changes:
- IndicatorResult interface needs `rawData?: any` field
- Extract plan indicators from the full list and render them specially
- DSO data gets its own section
- Omgevingsloket plannen beter presenteren met tabellen

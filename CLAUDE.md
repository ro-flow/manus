# RO-flow — Claude Code instructies

## Wat is dit project?

RO-flow is een **privacy-first vergunning intake platform** voor Nederlandse gemeenten.
AI ondersteunt — de behandelaar beslist altijd zelf.

Zowel formele aanvragen als conceptaanvragen (vooroverleg/principeverzoeken) worden getoetst
in de digitale intake en analyse omgeving.

---

## Monorepo structuur

```
apps/api/           Express backend (Node, ESM, TypeScript)
apps/web/           React 18 + Vite + Tailwind CSS frontend
packages/core/      Domeinlogica: volledigheidscheck, procedures, extractie, DSO-parser
packages/db/        Drizzle ORM schema + repositories (Azure PostgreSQL)
packages/ai/        AIProvider interface + GroqProvider (MVP)
packages/privacy/   sanitizeForAI, restoreTemplateFields, PrivacyViolationError
```

---

## Kernregel: persoonsgegevens gaan NOOIT naar AI

- `sanitizeForAI()` gooit `PrivacyViolationError` bij NAW-detectie
- NAW staat in aparte tabel `aanvrager_pii`, nooit in `aanvragen`
- AI krijgt alleen placeholders: `[AANVRAGER]`, `[ADRES_VERWIJDERD]`

---

## Verplichte AI flow

1. Context ophalen uit DB (geen PII)
2. `sanitizeForAI(context)`
3. Prompt bouwen met `build*Prompt()` uit `packages/core`
4. `ai.generateText()`
5. Loggen via `aiLogRepository.log()`
6. PII ophalen + `restoreTemplateFields()`

---

## Bestandstypen

```
PDF       → extraheer via Groq AI (sanitizeForAI verplicht)
.zip/.xml → parse direct via packages/core/dsoParser
            geen AI aanroep nodig
Methode altijd meegeven in response: "methode": "pdf_ai" | "dso_xml"
```

---

## Tech stack versies

```
Node.js 20.x LTS
TypeScript 5.x strict mode
Drizzle ORM — Azure PostgreSQL
Groq (MVP) — later vervangbaar door Azure OpenAI
AI_PROVIDER env variabele bepaalt de provider
```

---

## Audit log — verplicht bij elke AI aanroep

`aiLogRepository.log()` bevat altijd:

```
- timestamp
- aanvraagId
- provider + model
- sanitizedPayload (wat naar AI ging)
- aiResponse
- privacyBlocked (boolean)
- durationMs
```

---

## Foutafhandeling

```
PrivacyViolationError → HTTP 403 + log entry met privacyBlocked: true
Groq timeout          → HTTP 503 + retry max 2x
DSO parse fout        → HTTP 422 + duidelijke foutmelding
```

---

## Brief templates — drie typen

```
1. ontvangstbevestiging_volledig    → aanvraag compleet
2. aanvullende_stukken_vereist      → ontbrekende stukken + termijn opgeschort
3. termijnverlenging                → beslistermijn verlengd met 6 weken

AI genereert altijd met placeholders [AANVRAGER] [ADRES_VERWIJDERD]
restoreTemplateFields() vult NAW in — altijd in Azure backend, nooit via AI
```

### Gemeente-eigen briefformaten (nog te ontwerpen)

> **TODO:** Gemeenten moeten hun eigen briefformat kunnen uploaden of instellen.
> Hoe dit precies werkt moet nog worden uitgewerkt, maar de richting is:
>
> - Gemeente laadt een eigen Word/HTML-template op (met vaste placeholders)
> - RO-flow vult de template in met de AI-gegenereerde inhoud + NAW-restore
> - Fallback: het standaard RO-flow format als er geen gemeente-template is
> - Opslaan in database per gemeente (tabel `gemeente_instellingen` of apart)
> - Beheer via een nog te bouwen instellingenpagina voor de gemeente
>
> **Nog niet implementeren** totdat het format en de opslag zijn vastgesteld.

---

## Deployment

```
Hosting:   Azure App Service
Database:  Azure Database for PostgreSQL Flexible Server
Opslag:    Azure Blob Storage (PDF/DSO bestanden)
Secrets:   Azure Key Vault (nooit in .env in productie)
Regio:     West Europe (AVG)
```

---

## Wat niet te doen

```
Nooit PII meegeven aan packages/ai/
Nooit sanitizeForAI() overslaan
Nooit NAW in de aanvragen tabel
Nooit .env committen naar GitHub
Nooit volledige PDF opslaan in database (alleen Azure Blob)
Nooit AI provider hardcoden — altijd via AI_PROVIDER env
Nooit juridische conclusies genereren — altijd "indicatief" en "voorlopig"
Nooit besluit nemen — behandelaar blijft altijd verantwoordelijk
```

---

## Codestijl

```
Werk in kleine stappen — niet alles tegelijk
Bevestig na elke stap voordat je verder gaat
Geen logica in prompts — businesslogica hoort in packages/core
Elke nieuwe feature: eerst types definiëren, dan implementatie
```

---

## CONCEPTAANVRAGEN — Digitale intake en analyse

RO-flow toetst ook conceptomgevingsvergunningaanvragen (vooroverleg/principeverzoeken).
Dit zijn aanvragen die nog niet formeel zijn ingediend maar al wel beoordeeld moeten worden
op haalbaarheid en procedure.

### Wat wordt getoetst bij intake (zowel formeel als concept):

**STAP 1 — Volledigheidscheck:**
```
- Zijn alle verplichte indieningsvereisten aanwezig? (o.b.v. activiteitstype)
- Welke bijlagen ontbreken? (situatietekening, plattegrond, berekeningen etc.)
- Is de aanvraag voldoende beschreven om te kunnen beoordelen?
- Bij DSO: zijn alle activiteiten correct aangevinkt?
```

**STAP 2 — Activiteitencheck:**
```
- Welke activiteiten zijn aangevraagd?
  → Bouwactiviteit (technisch + omgevingsplanactiviteit)
  → Milieubelastende activiteit
  → Wateractiviteit
  → Sloopactiviteit
  → Aanlegactiviteit
  → Afwijken omgevingsplan (BOPA)
- Vereist de combinatie van activiteiten een gecombineerde aanvraag?
- Is het bevoegd gezag correct bepaald? (gemeente / provincie / Rijk)
```

**STAP 3 — Omgevingsplantoets (kern van de procedure-inschatting):**

```
PAST HET BINNEN HET OMGEVINGSPLAN?

JA → Reguliere procedure (art. 16.62 Omgevingswet)
  → Beslistermijn: 8 weken
  → Eenmalig te verlengen met 6 weken (tot 14 weken)
  → Bij instemming ander bestuursorgaan: 12 weken
  → Rechtsbescherming: bezwaar → beroep rechtbank → hoger beroep RvS

NEE → Buitenplanse Omgevingsplanactiviteit (BOPA)
  → Reguliere procedure is uitgangspunt (art. 16.62 Ow)
  → MAAR uitgebreide procedure van toepassing als:
    1. Wet dit verplicht stelt (art. 10.24 Omgevingsbesluit)
    2. Aanvrager hierom verzoekt of ermee instemt (art. 16.65 lid 1 Ow)
    3. College besluit dit vanwege (art. 16.65 lid 4 Ow):
       a. Aanzienlijke gevolgen voor fysieke leefomgeving, én
       b. Naar verwachting verschillende belanghebbenden bedenkingen
  → Uitgebreide procedure: 26 weken (+ max 6 weken verlenging)
  → Ontwerpbesluit ter inzage + zienswijzen mogelijk
  → Rechtsbescherming: beroep rechtbank → hoger beroep RvS (geen bezwaar)
```

**STAP 4 — Signalering uitgebreide procedure indicatoren:**

```
VERPLICHT UITGEBREID (art. 10.24 Omgevingsbesluit):
- Milieubelastende activiteiten categorie 1 en 2 (IPPC/RIE installaties)
- Bepaalde wateractiviteiten (lozingen)
- MER-plichtige activiteiten
- Activiteiten met verplichte VVGB provincie of waterschap

MOGELIJK UITGEBREID bij BOPA (indicatoren voor behandelaar):
- Grootschalige bouwprojecten (>50 woningen, grootschalige bedrijven)
- Significante ruimtelijke impact (meerdere belanghebbenden te verwachten)
- Afwijking van meer dan ondergeschikte aard
- Activiteiten nabij Natura 2000 of NNN
- Meerdere disciplines/onderzoeken vereist
- Raadsadvies vereist of participatieplicht van toepassing

ALTIJD REGULIER:
- Activiteit past binnen omgevingsplan
- Kleine bouwactiviteiten (dakkapel, aanbouw, schutting)
- Binnenplanse afwijking
- Kruimelgevallen
```

**STAP 5 — Toetsing concept vs. formele aanvraag:**

```
CONCEPTAANVRAAG (vooroverleg/principeverzoek):
- Zelfde toetsing als formele aanvraag
- Geen wettelijke termijnen van toepassing
- Output: haalbaarheidsadvies + indicatieve procedure-inschatting
- Expliciet vermelden:
  "Dit is een indicatief advies op basis van de aangeleverde informatie.
   Aan dit advies kunnen geen rechten worden ontleend."
- Signaleer welke informatie nog ontbreekt voor formele beoordeling

FORMELE AANVRAAG:
- Wettelijke termijnen gaan lopen na ontvangst complete aanvraag
- Bij onvolledige aanvraag: termijn opgeschort tot aanvulling ontvangen
- Ontvangstbevestiging verplicht (art. 4:3a Awb)
```

### Wat RO-flow altijd vermeldt in de output:

```
- "Voorlopige inschatting op basis van ingediende stukken"
- "Kan wijzigen na inhoudelijke beoordeling"
- "De behandelaar blijft verantwoordelijk voor het definitieve oordeel"
- Bij conceptaanvraag: "Indicatief advies — geen rechten aan te ontlenen"
- Artikelverwijzingen: Omgevingswet, Omgevingsbesluit, Awb
```

### Procedure beslisboom in code (packages/core/src/procedure/determineProcedure.ts):

```typescript
type AanvraagType = 'formeel' | 'concept';

type ProcedureIndicatie =
  | 'vergunningvrij'
  | 'regulier_8weken'
  | 'regulier_12weken'       // bij instemming ander bestuursorgaan
  | 'bopa_regulier'          // BOPA maar reguliere procedure
  | 'bopa_uitgebreid'        // BOPA met uitgebreide procedure
  | 'uitgebreid_verplicht';  // art. 10.24 Omgevingsbesluit

interface ProcedureResultaat {
  procedure: ProcedureIndicatie;
  aanvraagType: AanvraagType;
  doorlooptijd: string;
  verlengbaar: boolean;
  verlengingTermijn: string;
  rechtsbescherming: string;
  artikelVerwijzing: string;
  toelichting: string;
  isIndicatief: boolean; // altijd true bij concept
}
```

---

## Locatie resolver — packages/core/src/locatie/resolveLocatie.ts

### Drie invoervormen — altijd parallel resolven:

```typescript
// Stap 1: detecteer alle locaties uit PDF tekst
const locatieInvoeren = detecteerLocaties(pdfTekst, gemeente);

// Stap 2: resolve parallel naar coördinaten
const resolvedLocaties = await resolveAlleLocaties(locatieInvoeren);

// Stap 3: gebruik coördinaten parallel voor bestemmingsplantoets
const toetsen = await Promise.all(
  resolvedLocaties
    .filter(l => l.lat !== 0)
    .map(l => haalBestemmingsplanViaPDOK(l.lat, l.lon))
);
```

### Betrouwbaarheid per methode:

| Invoer | Methode | Betrouwbaarheid |
|--------|---------|-----------------|
| Kadastraal nummer | PDOK perceel lookup | Hoog |
| Adres | PDOK adres geocoding | Hoog |
| Projectnaam | PDOK fuzzy search | Laag |
| Coördinaten direct | Geen API nodig | Hoog |

### Foutafhandeling:
- Als PDOK niet bereikbaar: log waarschuwing, ga door zonder toets
- Als perceel niet gevonden: probeer fallback zonder type filter
- Als alles mislukt: vermeld in behandelrapport "locatie niet automatisch bepaald"
- NOOIT de analyse stoppen vanwege een ontbrekende locatie

### Rijksdriehoek vs WGS84:
- PDOK WFS bestemmingsplannen gebruiken Rijksdriehoek (EPSG:28992)
- PDOK Locatieserver geeft beide terug: centroide_ll (WGS84) en centroide_rd (RD)
- Gebruik centroide_rd voor WFS queries aan PDOK Ruimtelijke Plannen
- Gebruik centroide_ll voor weergave op kaart in frontend

### Env variabelen (geen API key nodig):
```
PDOK_LOCATIESERVER=https://api.pdok.nl/bzk/locatieserver/search/v3_1
PDOK_RUIMTELIJKEPLANNEN=https://service.pdok.nl/rws/ruimtelijkeplannen/wfs/v1_0
```

---

## Gemeente onboarding

Bij aanmelding leveren gemeenten aan:

```
- Gemeentenaam + code
- Afdelingsnaam
- Logo (.svg/.png 300dpi)          → opslaan in Azure Blob
- Huisstijl template (.dotx)        optioneel
- Zaaksysteem                       Djuma / Decos / Squit / anders
- Briefgeneratie                    Templafy endpoint / Word template / geen
- Streeftermijn vooroverleg
- Aanvullende indieningsvereisten
- Lokaal beleid
```

## Pilotgemeenten

```
SED (Stede Broec, Enkhuizen, Drechterland)  →  Djuma (ZGW API)
Hoorn                                        →  Squit XO + Decos JOIN
```

## Brief export module

Pluggable per gemeente:

```
templafy        → StUF-DCR API
word_template   → .dotx invullen
word_standaard  → eigen opmaak RO-flow

Behandelrapport → PDF, geen RO-flow branding
```

---

## Juridische voorbehouden — altijd verplicht in AI output

```
AI genereert NOOIT:
- Definitieve juridische conclusies
- Absolute uitspraken over vergunbaarheid
- Beslissingen namens het bevoegd gezag

AI gebruikt ALTIJD:
- "voorlopige inschatting"
- "op basis van huidige gegevens"
- "kan wijzigen na inhoudelijke beoordeling"
- "de behandelaar blijft verantwoordelijk"
- "aan dit advies kunnen geen rechten worden ontleend" (bij concept)
```

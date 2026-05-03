# API Audit - Omgevingsscan Engine

## Geïnventariseerde API-calls in fetchAllDatasets (22+ calls)

### WERKENDE API's (data komt binnen en wordt verwerkt):

| # | API/Service | Endpoint | Wat het levert | Status |
|---|------------|----------|----------------|--------|
| 1 | PDOK Combined | pdokService.ts | BAG pand, kadaster, BGT, adres | ✅ Werkt |
| 2 | Natura 2000 | natura2000ApiService.ts | Natura 2000 check + afstand | ✅ Werkt |
| 3 | Ruimtelijke Plannen | ruimtelijkeplannenService.ts | Bestemmingen, dubbelbestemmingen, gebiedsaanduidingen | ✅ Werkt |
| 4 | Spoorwegen OGC | PDOK ProRail | Trace + stations | ✅ Werkt |
| 5 | NWB Wegen WFS | PDOK RWS | Wegvakken (rijkswegen detectie) | ✅ Werkt |
| 6 | BRP Gewaspercelen | PDOK RVO | Gewaspercelen (agrarisch) | ✅ Werkt |
| 7 | REV Risicokaart | PDOK RWS | Productie-installaties + faciliteiten | ✅ Werkt |
| 8 | RRGS (RIVM) | RIVM ArcGIS | LPG + Vuurwerk | ✅ Werkt |
| 9 | RCE Erfgoed | PDOK RCE ps-ch | Rijksmonumenten, beschermd gezicht | ✅ Werkt |
| 10 | RCE Beschermde Gebieden | PDOK RCE OGC | IKAW, hist. buitenplaatsen, werelderfgoed | ✅ Werkt |
| 11 | NNN WMS | PDOK | Pixel-based NNN detectie | ✅ Werkt |
| 12 | Stiltegebied WMS | PDOK | GetFeatureInfo stiltegebied | ✅ Werkt |
| 13 | Nationale Parken | PDOK RVO OGC | Nationale parken | ✅ Werkt |
| 14 | Overstromingsrisico | PDOK RWS OGC | Risk zones | ✅ Werkt |
| 15 | Grondwaterbescherming | PDOK WMS | GetFeatureInfo | ✅ Werkt |
| 16 | BGT Waterdeel | PDOK BGT OGC | Watergangen | ✅ Werkt |
| 17 | AHN Hoogte | PDOK AHN WCS | Maaiveldhoogte NAP | ✅ Werkt |
| 18 | BRO Bodemkaart | PDOK BRO WMS | Bodemtype | ✅ Werkt |
| 19 | Funderingsproblematiek | PDOK RVO OGC | Indicatieve aandachtsgebieden | ✅ Werkt |
| 20 | AERIUS | connect.aerius.nl WFS | Stikstofdepositie | ✅ Werkt |
| 21 | DSO Activiteiten | DSO API | Activiteiten + vergunningcheck | ✅ Werkt |
| 22 | DSO Toepasbare Regels | DSO API | Toepasbare regels | ✅ Werkt |
| 23 | Atlas Leefomgeving | RIVM Atlas | Geluid (weg/spoor/industrie), luchtkwaliteit | ✅ Werkt |
| 24 | Aardkundige Waarden | Provincies WMS | Aardkundige waarden | ✅ Werkt |
| 25 | FGR | PDOK RVO WFS | Fysisch-geografische regio's | ✅ Werkt |

### NIET-WERKENDE / STUB API's:

| # | API | Huidige status | Probleem |
|---|-----|---------------|----------|
| S1 | Zwemwater | Promise.resolve([]) | Geen werkend publiek endpoint |
| S2 | Bodemonderzoek (BRO) | Promise.resolve([]) | Geen werkend publiek endpoint |
| S3 | Ontplofbare Oorlogsresten | Promise.resolve([]) | Geen werkend publiek endpoint |

### BESTAANDE SERVICES DIE NIET IN DE ENGINE ZITTEN:

| Service | Bestand | Wat het doet | In engine? |
|---------|---------|-------------|------------|
| Bodemloket | bodemloketService.ts | Omgevingsdienst + bodemkwaliteit | ❌ NEE |
| Geurcontouren | geurcontourenService.ts | GES scores veehouderij | ❌ NEE |
| Externe Veiligheid | externeVeiligheidService.ts | PR/GR analyse | ❌ NEE |
| Vrijstellingen | vrijstellingsService.ts | Archeologie vrijstellingsgrenzen | ❌ NEE |
| Milieuzonering | milieuToetsService.ts | VNG milieuzonering | ❌ NEE |
| Geluidszones | geluidszonesService.ts | Geluidszone berekening | ❌ NEE |

## VERBETERPUNTEN

### HOGE PRIORITEIT:

1. **Bodemloket integreren** - bevraagBodemloket() bestaat al, geeft omgevingsdienst + bodemkwaliteit. Moet in engine.
2. **Zwemwater endpoint zoeken** - PDOK heeft zwemwaterlocaties WFS: https://service.pdok.nl/rws/zwemwater/wfs/v1_0
3. **Ontplofbare Oorlogsresten** - CE-bodembelastingkaart via provinciale WFS endpoints
4. **Externe Veiligheid service integreren** - Gedetailleerde PR/GR analyse ipv alleen feature count
5. **Vrijstellingsservice integreren** - Gemeentelijke vrijstellingsgrenzen ophalen voor archeologie
6. **Geurcontouren integreren** - Echte GES scores ipv alleen BRP proxy

### MEDIUM PRIORITEIT:

7. **Milieuzonering (VNG)** - milieuToetsService.ts bestaat maar niet geïntegreerd
8. **Geluidszones service** - geluidszonesService.ts bestaat maar niet geïntegreerd
9. **Watertoets** - Hardcoded als "altijd relevant" maar zou waterschap-specifiek moeten zijn
10. **Overstromingsrisico duplicaat** - waterkering en overstromingsRisico fetchen dezelfde API (risk_zone)

### LAGE PRIORITEIT:

11. **Hoogspanning** - Hardcoded als "raadpleeg KLIC" - geen publieke API beschikbaar
12. **Gasleiding** - Hardcoded als "raadpleeg KLIC" - geen publieke API beschikbaar
13. **Luchtvaart** - Hardcoded als "raadpleeg LIB" - geen publieke API beschikbaar
14. **Gemeentelijk monument** - Hardcoded als "raadpleeg gemeente" - geen centrale dataset
15. **Defensiezone** - Hardcoded - geen publieke API beschikbaar

## INDICATOR TELLING:

Thema's met indicatoren:
- basis: BAG_PAND, KADASTER, BGT_GRONDGEBRUIK, BESTEMMINGSPLAN, PLANREGELS, BOUWVLAK
- plan: ENKELBESTEMMING, DUBBELBESTEMMING, GEBIEDSAANDUIDING, VOORBEREIDINGSBESLUIT, PARAPLUPLAN
- dso: DSO_ACTIVITEITEN, DSO_VERGUNNINGCHECK, DSO_BEVOEGD_GEZAG
- natuur: NATURA2000, NNN, STILTEGEBIED, NATIONAAL_PARK, BESCHERMD_NATUUR, SOORTENBESCHERMING, STIKSTOF
- landschap: AARDKUNDIGE_WAARDEN, FGR
- water: WATERKERING, GRONDWATERBESCHERMING, WATERGANG, ZWEMWATER, WATERBERGING, WATERTOETS, OVERSTROMINGSRISICO
- bodem: BODEMKWALITEIT, ONTPLOFBARE_OORLOGSRESTEN, FUNDERINGSPROBLEMATIEK, ASBEST_RISICO
- milieu: GELUIDZONE_WEG, GELUIDZONE_SPOOR, GELUIDZONE_INDUSTRIE, GELUIDZONE_LUCHTVAART, LUCHTKWALITEIT, GEURZONE, TRILLINGEN
- veiligheid: BEVI_INRICHTING, BUISLEIDING, RISICOCONTOUR, LPG_TANKSTATION, VUURWERK_OPSLAG
- erfgoed: RIJKSMONUMENT, GEMEENTELIJK_MONUMENT, BESCHERMD_GEZICHT, ARCHEOLOGIE, CULTUURLANDSCHAP, HISTORISCHE_BUITENPLAATS, VERDRAG_MALTA, WERELDERFGOED
- agrarisch: GEWASPERCEEL, GEURCONTOUR_VEEHOUDERIJ, GLASTUINBOUW, LANDBOUWGROND, MESTVERWERKING, SPUITZONE, DIERENWELZIJN
- infra: HOOGSPANNING, GASLEIDING, KLIC_MELDING, SPOORWEG, RIJKSWEG, VAARWEG
- mobiliteit: PARKEERDRUK, OV_BEREIKBAARHEID, FIETSROUTE
- overig: ZORGINSTELLING, SCHOOL_KINDEROPVANG, LUCHTVAART_BEPERKING, DEFENSIE_ZONE

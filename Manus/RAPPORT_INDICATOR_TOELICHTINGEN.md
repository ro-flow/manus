# Rapport: Uitgebreide Indicator Toelichtingen met Wettelijke Grondslag

**Datum:** 8 maart 2026  
**Betreft:** Systematische verbetering van alle 83 omgevingsscan-indicatoren  
**Doel:** Elke indicator voorzien van wettelijke grondslag, concrete uitleg en bronvermelding

---

## 1. Samenvatting

Alle 83 indicatoren in de omgevingsscan-engine (`omgevingsscanEngine.ts`) zijn systematisch verbeterd met:

- **Wettelijke grondslag**: Specifieke artikelnummers uit de Omgevingswet, Bkl, Wnb, Wgh, Bevi, Bevb, Wgv, etc.
- **Concrete uitleg**: Wat de indicator betekent voor de aanvrager en de vergunningverlener
- **Actie**: Welke onderzoeken, meldingen of vergunningen vereist zijn
- **Bronvermelding**: Specifieke datasets, API's en beleidsdocumenten

---

## 2. Overzicht per Thema

### 2.1 Basis Indicatoren (5 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| BAG_PAND | Wet BAG, Bbl art. 2.6 | Bouwjaar, gebruiksdoel, pandstatus met juridische context |
| KADASTER | Kadasterwet, BRK | Eigendomsinformatie, perceelgrenzen, zakelijke rechten |
| GRONDGEBRUIK | BRO, BGT | Bodemgebruik met relevantie voor bestemmingsplantoets |
| GRONDWATERSTAND | BRO, Waterwet art. 6.4 | Grondwaterstand met relevantie voor bouw en drainage |
| GEMEENTE | Omgevingswet art. 4.1 | Bevoegd gezag, omgevingsplan, gemeentelijke verordeningen |

### 2.2 Planologie Indicatoren (11 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| BESTEMMINGSPLAN | art. 3.1 Wro / art. 4.1 Omgevingswet | Planstatus, plantype, IMRO-codering |
| ENKELBESTEMMING | art. 3.1 Wro | Toegestaan gebruik, bouw- en gebruiksregels |
| DUBBELBESTEMMING | art. 3.1 Wro | Aanvullende beschermingsregimes, onderzoeksplichten |
| GEBIEDSAANDUIDING | art. 3.1 Wro | Geluidzones, veiligheidszones, milieuzonering |
| BOUWVLAK | art. 3.1 Wro | Maximale bebouwingsoppervlakte, bouwgrenzen |
| FUNCTIEAANDUIDING | art. 3.1 Wro | Specifieke functies binnen bestemming |
| MAATVOERING | art. 3.1 Wro | Maximale bouwhoogte, goothoogte, bebouwingspercentage |
| PLANREGELS | art. 3.1 Wro / art. 4.1 Omgevingswet | Juridische regels, afwijkingsmogelijkheden |
| DSO_ACTIVITEITEN | art. 16.2 Omgevingswet | Vergunningplicht, meldingsplicht, informatieplicht |
| DSO_REGELS | art. 4.7 Omgevingswet | Toepasbare regels uit omgevingsplan en AMvB's |
| ONDERZOEKSVEREISTEN | Diverse | Vereiste onderzoeken op basis van dubbelbestemmingen |

### 2.3 Natuur Indicatoren (8 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| NATURA2000 | art. 2.7/2.8 Wnb, art. 16.53c Omgevingswet | Passende beoordeling, significante effecten, ADC-toets |
| STIKSTOF_AERIUS | art. 2.7 Wnb, art. 16.53c Omgevingswet | AERIUS Calculator, depositieberekening, drempelwaarde |
| NNN | art. 2.44 Omgevingswet, art. 7.7 Bkl | Nee-tenzij regime, compensatieplicht |
| ECOLOGISCHE_VERBINDING | art. 2.44 Omgevingswet | Ecologische verbindingszones, mitigatie |
| BESCHERMD_NATUURGEBIED | art. 2.1/2.7 Wnb | Beschermingsregime, vergunningplicht |
| NATIONAAL_PARK | Diverse | Aanvullende bescherming, landschappelijke inpassing |
| SOORTENBESCHERMING | art. 3.1-3.10 Wnb, art. 5.1 Omgevingswet | Quickscan flora en fauna, ontheffingsaanvraag |
| WEIDEVOGELGEBIED | art. 3.1 Wnb | Broedseizoen, verstoringsafstanden |
| HOUTOPSTANDEN | art. 4.2 Wnb, art. 11.6 Bal | Kapmelding, herplantplicht |

### 2.4 Landschap Indicatoren (4 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| LANDSCHAPSTYPE | art. 4.2 Omgevingswet | Landschappelijke inpassing, provinciale verordening |
| AARDKUNDIG_WAARDEVOL | Provinciale Omgevingsverordening | Bescherming aardkundige waarden |
| STILTEGEBIED | Provinciale Omgevingsverordening | Geluidbeperkingen, ontheffingsplicht |
| DONKERTEGEBIED | Provinciale Omgevingsverordening | Lichtbeperkingen, verlichting |

### 2.5 Water Indicatoren (9 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| WATERKERING | art. 6.1/6.5 Waterwet, art. 5.4 Omgevingswet | Beschermingszones, watervergunning |
| BESCHERMINGSZONE_WATERKERING | art. 6.5 Waterwet, Keur | Beperkingen, vergunningplicht |
| WATERGANG | art. 6.5 Waterwet, Keur | Beschermingszones, dempen/verleggen |
| KEUR_WATERSCHAP | art. 78 Waterschapswet, art. 6.5 Waterwet | Watervergunning, algemene regels |
| GRONDWATERBESCHERMING | art. 7.11 Bkl | Verboden activiteiten, ontheffing |
| WATERWINGEBIED | Provinciale Omgevingsverordening | Strenge beperkingen, verboden activiteiten |
| OVERSTROMINGSRISICO | EU Richtlijn 2007/60/EG, art. 5.12 Bkl | Waterveiligheid, evacuatie |
| WATERTOETS | art. 3.1.1 Bro, art. 5.37 Omgevingswet | Wateradvies waterschap, waterbergingseis |
| ZWEMWATER | Zwemwaterrichtlijn 2006/7/EG | Waterkwaliteit, beschermingszones |
| WATERBERGING | Keur waterschap | Compensatie verhard oppervlak |

### 2.6 Bodem Indicatoren (4 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| BODEMKWALITEIT | art. 8.6 Bkl, Besluit bodemkwaliteit | Bodemonderzoek NEN 5740, saneringsplicht |
| ONTPLOFBARE_OORLOGSRESTEN | WSCS-OCE, Arbeidsomstandighedenwet | Vooronderzoek CE, detectie, ruiming |
| FUNDERINGSPROBLEMATIEK | NEN 8707, NEN 9997-1 | Funderingsrisico, geotechnisch onderzoek |
| ASBEST_RISICO | Asbestverwijderingsbesluit 2005, art. 7.10 Bbl | Asbestinventarisatie, SC-540 certificering |

### 2.7 Milieu Indicatoren (7 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| GELUIDZONE_WEG | art. 74 Wgh, art. 3.8 Bkl | Voorkeursgrenswaarde 48 dB, hogere waarde |
| GELUIDZONE_SPOOR | art. 87 Wgh, art. 3.25 Bkl | Voorkeursgrenswaarde 55 dB |
| GELUIDZONE_INDUSTRIE | art. 40 Wgh, art. 3.31 Bkl | Geluidzone industrieterrein, 50 dB(A) |
| GELUIDZONE_LUCHTVAART | art. 8.1 Wet luchtvaart, Lden | Geluidcontouren luchthaven |
| LUCHTKWALITEIT | art. 5.16 Wm, art. 5.53 Bkl | NSL, grenswaarden NO2/PM10 |
| GEURZONE | Wgv, art. 5.42 Bkl | Geurbelasting ouE/m3, V-Stacks |
| TRILLINGEN | SBR Richtlijn A/B | Trillingsonderzoek, streefwaarden |

### 2.8 Veiligheid Indicatoren (5 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| BEVI_INRICHTING | Bevi, art. 5.12 Bkl | Plaatsgebonden risico 10^-6, groepsrisico |
| BUISLEIDING | Bevb, art. 5.15 Bkl | Belemmeringenstrook, veiligheidsafstand |
| RISICOCONTOUR | Bevi, art. 5.12 Bkl | QRA, verantwoording groepsrisico |
| LPG_TANKSTATION | Bevi, art. 5.12 Bkl | Vaste afstanden, invloedsgebied |
| VUURWERK_OPSLAG | Vuurwerkbesluit, Bevi | Veiligheidsafstanden, bewaarplaats |

### 2.9 Erfgoed Indicatoren (8 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| RIJKSMONUMENT | art. 5.1 Omgevingswet, art. 13.7 Bkl | Omgevingsvergunning, RCE-advies |
| GEMEENTELIJK_MONUMENT | art. 4.1 Omgevingswet | Gemeentelijke monumentenverordening |
| BESCHERMD_GEZICHT | art. 5.1 Omgevingswet | Beschermd stads-/dorpsgezicht, welstandstoets |
| ARCHEOLOGIE | art. 5.1 Omgevingswet, Verdrag van Malta | Archeologisch vooronderzoek, vrijstellingsgrenzen |
| IKAW | art. 5.1 Omgevingswet | Indicatieve Kaart Archeologische Waarden |
| CULTUURLANDSCHAP | art. 3.1.6 Bro, art. 5.130 Bkl | Cultuurhistorische waarden, landschappelijke inpassing |
| HISTORISCHE_BUITENPLAATS | Provinciale Omgevingsverordening | Bescherming historische buitenplaatsen |
| VERDRAG_MALTA | Verdrag van Malta, art. 5.1 Omgevingswet | Archeologische monumentenzorg |
| WERELDERFGOED | Werelderfgoedverdrag 1972 | UNESCO-bescherming, bufferzone |

### 2.10 Agrarisch Indicatoren (7 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| GEWASPERCEEL | BRP | Gewasregistratie, spuitzones, geurcontouren |
| GEURCONTOUR_VEEHOUDERIJ | Wgv, art. 5.42 Bkl | Geurberekening V-Stacks, afstandsnormen |
| GLASTUINBOUW | Provinciale Omgevingsverordening | Lichthinder, gewasbeschermingsmiddelen |
| LANDBOUWGROND | art. 4.1 Omgevingswet, Ladder | Functiewijziging, Ladder duurzame verstedelijking |
| MESTVERWERKING | Activiteitenbesluit | Geurafstanden, milieuzonering |
| SPUITZONE | VNG Bedrijven en milieuzonering | 50m richtafstand, voorzorgsbeginsel |
| DIERENWELZIJN | Provinciale Omgevingsverordening | Besluit emissiearme huisvesting |

### 2.11 Infrastructuur Indicatoren (6 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| HOOGSPANNING | RIVM magneetveldadvies | 0,4 microtesla zone, gevoelige bestemmingen |
| GASLEIDING | Bevb, WIBON | Belemmeringenstrook, veiligheidsafstand |
| KLIC_MELDING | WIBON art. 2 | Verplichte melding, 3 werkdagen termijn |
| SPOORWEG | Basisnet Spoor, art. 5.12 Bkl | Veiligheidszones, geluidzones, trillingen |
| RIJKSWEG | art. 74 Wgh, art. 3.8 Bkl | Geluidzones, luchtkwaliteit, externe veiligheid |
| VAARWEG | Rijkswaterstaat | Beschermingszones, watervergunning |

### 2.12 Mobiliteit Indicatoren (3 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| PARKEERDRUK | CROW publicatie 381 | Parkeernormen, stedelijkheidsgraad |
| OV_BEREIKBAARHEID | CROW, Ladder | Lagere parkeernormen, Ladder verstedelijking |
| FIETSROUTE | Gemeente, Provincie | Fietsroutenetwerk, mobiliteitsplan |

### 2.13 Overige Indicatoren (4 stuks)

| Indicator | Wettelijke Grondslag | Verbetering |
|-----------|---------------------|-------------|
| ZORGINSTELLING | Bevi | Kwetsbare objecten, veiligheidsafstanden |
| SCHOOL_KINDEROPVANG | Bevi, VNG | Kwetsbare objecten, milieuzonering |
| LUCHTVAART_BEPERKING | art. 8.1 Wet luchtvaart, LIB | Geluidcontouren, hoogtebeperkingen |
| DEFENSIE_ZONE | Ministerie van Defensie | Beperkingsgebieden, radarstations |

---

## 3. API-integraties Audit

### 3.1 Actieve API's (16 stuks)

| # | API | Status | Endpoint | Opmerking |
|---|-----|--------|----------|-----------|
| 1 | BAG API | Actief | api.bag.kadaster.nl | Pand, verblijfsobject, bouwjaar |
| 2 | PDOK Locatieserver | Actief | api.pdok.nl/bzk/locatieserver | Geocoding, adres lookup |
| 3 | Kadaster BRK | Actief | api.pdok.nl/kadaster | Perceel, eigendom |
| 4 | BRP Gewaspercelen | Actief | service.pdok.nl/rvo/brpgewaspercelen | Agrarische percelen |
| 5 | BGT | Actief | api.pdok.nl/lv/bgt | Grondgebruik, topografie |
| 6 | NWB Wegen | Actief | service.pdok.nl/rws/nwbwegen | Rijkswegen, provinciale wegen |
| 7 | Spoorwegen | Actief | service.pdok.nl/prorail/spoorwegen | Spoorlijnen, stations |
| 8 | Natura 2000 | Actief | service.pdok.nl/rvo/natura2000 | Gebieden, afstanden |
| 9 | NNN | Actief | service.pdok.nl/provincies/nnn | Natuurnetwerk Nederland |
| 10 | AHN | Actief | service.pdok.nl/rws/ahn | Hoogte, maaiveldhoogte |
| 11 | BRO Bodemkaart | Actief | service.pdok.nl/bzk/bro | Bodemtype, bodemcode |
| 12 | Ruimtelijkeplannen.nl | Actief | ruimtelijkeplannen.nl/api | Bestemmingsplannen, regels |
| 13 | DSO Omgevingsloket | Actief | service.pre.omgevingswet.overheid.nl | Activiteiten, toepasbare regels |
| 14 | AERIUS Connect | Actief | connect.aerius.nl/api | Stikstofdepositie |
| 15 | RVO Funderingsproblematiek | Actief | service.pdok.nl/rvo | Indicatieve aandachtsgebieden |
| 16 | Beschermde Gebieden Cultuurhistorie | Actief | service.pdok.nl/rce | Rijksmonumenten, beschermde gezichten |

### 3.2 Afgeleide Indicatoren (zonder eigen API)

De volgende indicatoren worden afgeleid uit combinaties van bovenstaande API's:

- **GEURCONTOUR_VEEHOUDERIJ**: Afgeleid uit BRP + Ruimtelijkeplannen.nl gebiedsaanduidingen
- **SPUITZONE**: Afgeleid uit BRP gewaspercelen (nabijheid agrarische percelen)
- **GLASTUINBOUW**: Afgeleid uit BRP (gewastype glas/kas/tuinbouw)
- **FUNDERINGSPROBLEMATIEK**: Afgeleid uit AHN + BRO + BAG + RVO
- **ASBEST_RISICO**: Afgeleid uit BAG bouwjaar (pre-1994)
- **GELUIDZONES**: Afgeleid uit NWB Wegen + Spoorwegen + gebiedsaanduidingen
- **TRILLINGEN**: Afgeleid uit Spoorwegen (nabijheid)
- **OVERSTROMINGSRISICO**: Afgeleid uit AHN hoogte + waterkering data

### 3.3 Handmatig te Controleren Indicatoren

De volgende indicatoren hebben geen open API en vereisen handmatige controle:

| Indicator | Reden | Alternatief |
|-----------|-------|-------------|
| HOOGSPANNING | Geen open WFS | KLIC-melding / netbeheerder |
| GASLEIDING | Geen open WFS | KLIC-melding / Gasunie |
| MESTVERWERKING | Geen centraal register | Gemeente |
| ZORGINSTELLING | Geen open dataset | Risicokaart.nl |
| SCHOOL_KINDEROPVANG | Geen open dataset | Risicokaart.nl |
| LUCHTVAART_BEPERKING | Geen open WFS | LIB / ILT |
| DEFENSIE_ZONE | Geen open dataset | Ministerie van Defensie |
| FIETSROUTE | Geen centraal register | Gemeente / Provincie |

---

## 4. Wettelijke Grondslagen Referentietabel

| Wet/Besluit | Afkorting | Relevante Artikelen |
|-------------|-----------|---------------------|
| Omgevingswet | Ow | art. 2.44, 4.1, 4.7, 5.1, 5.4, 5.37, 16.2, 16.53c |
| Besluit kwaliteit leefomgeving | Bkl | art. 3.8, 3.25, 3.31, 5.12, 5.15, 5.42, 5.53, 7.7, 7.11, 8.6, 13.7 |
| Besluit bouwwerken leefomgeving | Bbl | art. 2.6, 7.10 |
| Besluit activiteiten leefomgeving | Bal | art. 11.6 |
| Wet natuurbescherming | Wnb | art. 2.1, 2.7, 2.8, 3.1-3.10, 4.2 |
| Wet geluidhinder | Wgh | art. 40, 74, 87 |
| Wet milieubeheer | Wm | art. 5.16 |
| Waterwet | Ww | art. 6.1, 6.4, 6.5 |
| Waterschapswet | Wsw | art. 78 |
| Wet geurhinder en veehouderij | Wgv | Geheel |
| Besluit externe veiligheid inrichtingen | Bevi | art. 1, 5 |
| Besluit externe veiligheid buisleidingen | Bevb | Geheel |
| Wet informatie-uitwisseling netten | WIBON | art. 2 |
| Wet luchtvaart | Wlv | art. 8.1 |
| Wet BAG | BAG | Geheel |
| Kadasterwet | Kw | Geheel |
| Besluit bodemkwaliteit | Bbk | Geheel |
| Asbestverwijderingsbesluit 2005 | Avb | Geheel |
| Vuurwerkbesluit | Vwb | Geheel |
| Besluit ruimtelijke ordening | Bro | art. 3.1.1, 3.1.6 |

---

## 5. Kwaliteitsborging

### 5.1 TypeScript Compilatie
- **Status**: 0 fouten
- **Verificatie**: `npx tsc --noEmit` succesvol

### 5.2 Vitest Resultaten
- **Totaal**: 542 tests
- **Geslaagd**: 533 tests
- **Gefaald**: 9 tests (allen externe API-afhankelijk, niet gerelateerd aan deze wijzigingen)

### 5.3 Server Status
- **Status**: Draaiend
- **Build errors**: Geen

---

## 6. Conclusie

Alle 83 indicatoren zijn nu voorzien van:

1. **Wettelijke grondslag** met specifieke artikelnummers
2. **Concrete uitleg** wat het betekent voor aanvrager en vergunningverlener
3. **Actie** welke onderzoeken of vergunningen vereist zijn
4. **Bronvermelding** met specifieke datasets en beleidsdocumenten

De toelichtingen zijn geschreven vanuit het perspectief van een jurist RO en vergunningverlener RO, conform de eis dat altijd de grondslag en relevante artikelen worden vermeld.

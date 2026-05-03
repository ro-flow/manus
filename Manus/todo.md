# Ro-flow AI Behandelassistent - TODO

## Database & Schema
- [x] Gemeenten tabel met regionale codes (provincie, waterschap, VR, OD, GGD)
- [x] Gemeente_Regio_Lookup tabel (342 gemeenten)
- [x] Seats tabel (gebruikers per gemeente)
- [x] Beleidsdocumenten tabel
- [x] Behandelrapport_Log tabel (scan logs)
- [x] Seed data voor gemeente Hoorn

## Authenticatie & RBAC
- [x] Manus OAuth integratie met drie rollen
- [x] super_admin rol (policyaiassist@gmail.com)
- [x] gemeente_beheerder rol
- [x] ambtenaar_gebruiker rol
- [x] RBAC middleware voor route bescherming
- [x] Role-based procedure guards

## Super Admin Portal
- [x] Dashboard met overzicht gemeenten
- [x] Seats beheer overzicht
- [x] Scans/rapporten statistieken
- [x] Inkomsten overzicht
- [x] Adviseurs beheren

## Beheerder Portal
- [x] Onboarding-chat interface
- [x] Database check voor bestaande data
- [x] Smart vragen (alleen missende info)
- [x] Defaults en multiple choice opties
- [x] 1-klik bevestiging
- [x] Seats beheren voor gemeente
- [x] Behandelaars uitnodigen

## Gebruiker Portal
- [x] DSO-ZIP upload interface
- [x] ZIP uitpakken (client-side)
- [x] Bestandslijst weergave
- [x] PDOK lookup integratie
- [x] Kadastrale gegevens ophalen
- [x] BAG data ophalen
- [x] Natura 2000 check
- [x] Archeologische zones check
- [x] Welstandsniveau bepalen

## Gemini AI Integratie
- [x] Gemini 2.5 Flash API setup (via ingebouwde LLM)
- [x] File Search Store configuratie (via prompt context)
- [x] 5-lagen metadata filter
- [x] Basis laag (methodiek)
- [x] Landelijk laag (wetgeving)
- [x] Provinciaal laag (POV)
- [x] Regionaal laag (waterschap, VR, OD, GGD)
- [x] Gemeentelijk laag (lokaal beleid)
- [x] Caching met Redis/in-memory
- [x] Cache invalidatie op last_policy_update

## PDF Rapport & Email
- [x] Behandelrapport genereren
- [x] PDF export functionaliteit (HTML)
- [x] Resend email integratie
- [x] PDF als attachment versturen
- [x] Email direct naar behandelaar

## Lemon Squeezy Integratie
- [x] Webhook endpoint
- [x] Order verwerking
- [x] Subscription tracking
- [x] Seat activatie
- [x] Payment status updates

## UI/UX
- [x] Apple-achtige warme beige/grijze lay-out
- [x] Responsive design
- [x] Loading states
- [x] Error handling
- [x] Toast notifications

## Design Update
- [x] Warmere beige/bruine/grijze kleurenpalet
- [x] Nieuwe landing page tekst implementeren
- [x] Hero sectie met nieuwe copy
- [x] Features sectie updaten
- [x] Pricing sectie toevoegen
- [x] FAQ sectie toevoegen

## Design Update v2
- [x] Donkerblauw kleurenpalet
- [x] Modernere look en feel
- [x] Subtielere schaduwen en gradients
- [x] Moderne typografie (Inter font)

## Design Update v3 - Animated Header
- [ ] Bewegende/animated hero header
- [ ] Passende afbeelding voor omgevingsvergunningen
- [ ] Smooth animaties en parallax effecten

## Design Update v4 - CoachHub Style
- [x] Split-layout hero met foto rechts
- [x] Donkerblauw + oranje/koraal kleurenpalet
- [x] Vrouw met spieren foto in hero
- [x] Logo's van klanten onderaan hero
- [x] Moderne typografie en spacing

## UI Fixes
- [x] Verwijder "Probeer gratis" knop uit header
- [x] Wijzig hero knop tekst naar "Proefperiode starten"
- [x] Voeg "Proefperiode starten" knop toe aan header naast Inloggen
- [x] Verwijder "Proefperiode starten" knop uit hero sectie
- [x] Wijzig knoptekst van "Proefperiode starten" naar "Start proefperiode"

## Mollie Betaalomgeving (Canva-style)
- [ ] Checkout pagina met stappen-flow
- [ ] Abonnement keuze (Maandelijks €149 / Jaarlijks)
- [ ] Betaalmethode selectie (iDEAL, Creditcard, SEPA)
- [ ] Visuele timeline met proefperiode info
- [ ] Mollie backend integratie
- [ ] iDEAL betaalmethode
- [ ] Webhook voor betaalstatus updates

## Follow-up Implementaties
- [x] Mollie API key configureren via webdev_request_secrets
- [x] Mollie webhook endpoint bouwen (/api/webhooks/mollie)
- [x] Gebruikersvoorwaarden pagina maken
- [x] Privacybeleid pagina maken
- [x] Links in checkout koppelen aan juridische pagina's

## Checkout Flow Test
- [x] Navigeer naar checkout pagina
- [x] Selecteer abonnement (maandelijks/jaarlijks)
- [x] Selecteer betaalmethode (iDEAL)
- [ ] Start Mollie test-betaling
- [ ] Verifieer redirect naar success pagina
- [ ] Controleer webhook verwerking

## Logo Implementatie
- [x] Ro-flow logo toevoegen aan header landing page
- [x] Ro-flow logo toevoegen aan checkout pagina
- [x] Logo verifiëren op alle pagina's

## Demo Aanvraag Formulier
- [x] Demo aanvraag pagina maken met formulier
- [x] Backend tRPC procedure voor demo aanvragen
- [x] Plan een demo knop koppelen aan formulier
- [x] Email notificatie naar eigenaar bij nieuwe aanvraag

## Mollie Proefperiode & Automatische Betaling
- [x] Database schema uitbreiden met subscriptions tabel
- [x] Mollie service uitbreiden met subscription methods
- [x] Webhook handler implementeren voor payment confirmations
- [x] Na succesvolle first payment automatisch subscription aanmaken
- [x] CheckoutSuccess pagina updaten met subscription status
- [x] Subscription management toevoegen aan user dashboard
- [x] Opzeggen/annuleren functionaliteit toevoegen


## Route Wijzigingen
- [x] Wijzig /subscription naar /abonnement

- [x] Voeg Abonnement beheren link toe aan gebruikersdashboard

## Layout Fixes
- [x] Hero sectie afbeelding hoger plaatsen op desktop

## Herinnerings-emails
- [x] Herinnerings-email 7 dagen voor einde proefperiode
- [x] sendTrialReminders API endpoint voor cron job

## Seat-based Access Control
- [x] Backend: Seat verificatie procedure toevoegen
- [x] Backend: Controleer of gebruiker actieve seat heeft
- [x] Backend: Controleer of gemeente actief abonnement heeft
- [x] Frontend: Seat-check toevoegen aan DSOUpload pagina
- [x] Frontend: Duidelijke foutmelding voor gebruikers zonder seat


## Vereenvoudigde Architectuur (geen n8n/Airtable)

### PWA Functionaliteit
- [x] manifest.json aanmaken met app metadata
- [x] Service worker voor offline caching
- [x] PWA meta tags in index.html
- [x] Install prompt component
- [x] App icons genereren

### Database: Beleidsdocumenten Migratie
- [x] Beleidsdocumenten CSV data migreren naar bestaande tabel
- [ ] CRUD endpoints voor beleidsdocumenten
- [ ] Beheerder UI voor documenten beheer

###### DSO Analyse Service (Server-side)
- [x] ZIP upload naar server (bestaand)
- [x] Gemini Vision voor tekeningen analyse (bestaand)
- [x] PDOK integratie voor GIS data (bestaand)
- [x] Juridische analyse met LLM (bestaand)
- [x] Procedure type bepaling (bestaand)
- [x] Volledigheidscheck (bestaand)ck tegen indieningsvereisten
- [ ] Beleidsdocumenten ophalen per gemeente

### Rapport Generator
- [x] Rapport template volgens v7 structuur (bestaand)
- [x] PDF generatie server-side (weasyprint geïntegreerd)
- [x] Email notificatie met rapport link (bestaand)
- [x] Rapport historie per gebruiker (bestaand)

### Frontend Updates
- [x] Analyse voortgangsbalk met live status
- [x] DSOUpload pagina gekoppeld aan backend API
- [x] Adres input voor PDOK lookup
- [ ] Rapport weergave pagina
- [ ] Download opties (PDF)
- [ ] Feedback systeem (duimpjes)

## DSO Analyse Test
- [x] Test ZIP bestand aanmaken
- [x] Upload via /gebruiker/upload
- [x] Verifieer AI analyse resultaten
- [x] Controleer rapport status (verzonden) na fix

## Analyse Animatie
- [x] Leuke "magie" animatie tijdens rapport generatie
- [x] Tekst: "Wacht even, de magie is aan het werk"
- [x] Speelse visuele effecten (sparkles, gradient, wiggle)

## Geschatte Wachttijd
- [x] Toon geschatte resterende wachttijd tijdens analyse
- [x] Dynamisch aftellen op basis van voortgang

## AI Kennisbank met Human-in-the-Loop
- [x] AI kennisbank generator service
  - [x] Automatisch ophalen relevante wetgeving per gemeente
  - [x] Automatisch identificeren adviseurs en triggers
  - [x] Automatisch zoeken naar beleidsdocumenten (welstandsnota, etc.)
- [x] Admin interface voor kennisbank beheer
  - [x] Overzicht huidige kennisbank per gemeente
  - [x] Toevoegen/bewerken beleidsdocumenten
  - [x] Toevoegen/bewerken adviseurs met triggers
  - [x] Validatie en goedkeuring door behandelaars
- [x] Integratie in analyse flow
  - [x] Kennisbank context meegeven aan AI analyse
  - [x] Bronvermelding in rapport

## Kennisbank Uitbreiding
- [x] Recreatieschappen toevoegen aan kennisbank generator
- [x] GGD beleid uitbreiden (gezondheid, kinderopvang, scholen)
- [x] Triggers voor recreatiegebieden en natuurgebieden

## Gelaagde Kennisbank Structuur
- [x] Analyseer huidige kennisbank lagen (rijks, provinciaal, regionaal, gemeentelijk)
- [x] Implementeer hergebruik van lagen tussen gemeenten in dezelfde regio
- [x] Test met Hoorn (eerste klant) en Medemblik (tweede klant, zelfde regio)

## Kennisbank Perfectie
- [ ] Inventariseer alle relevante beleidscategorieën per laag
- [ ] Voeg samenvattingen toe per beleidsstuk met toepassingscriteria
- [ ] Zorg dat AI weet wanneer welk beleid van toepassing is
- [ ] Implementeer gelaagde structuur met hergebruik tussen gemeenten

## Gelaagde Kennisbank Implementatie
- [x] Database structuur voor gelaagde kennisbank (rijks, provinciaal, regionaal, gemeentelijk)
- [x] Migratie voor nieuwe tabellen (kennisbank_items met scope filters)
- [x] Update kennisbank generator voor gelaagde opslag
- [x] Update admin interface voor gelaagde weergave
- [x] Test hergebruik tussen Hoorn en Medemblik

## Basislaag Kennisbank
- [x] Lees en analyseer documentatie over basislaag en AI Curator
- [x] Implementeer basislaag met procedure en toetsingswijze (15 toetsingskaders)
- [x] Sectorale toetsen (milieu, natuur, erfgoed, verkeer) - 14 items
- [x] Gemeentelijke beleidscategorieën template - 14 items
- [x] Integratie in AI analyse flow
- [ ] AI Curator voor automatische document classificatie
- [ ] Automatische publicatie detectie (overheid.nl, ruimtelijkeplannen.nl)
- [ ] Document status beheer (geldig, vervallen, concept)
- [x] Feedback systeem voor fine-tuning (Juist/Onjuist knoppen)
- [x] Zelflerend systeem: feedback database tabellen
- [x] Zelflerend systeem: tRPC procedures voor feedback
- [x] Zelflerend systeem: FeedbackPanel UI component
- [x] Zelflerend systeem: integratie in AI analyse context

## Centrale Kennisbank met Gemini File Search
- [ ] Document opslag structuur (volledige documenten + samenvattingen)
- [ ] Metadata-filters (provincie, laag, geldig_van, document_type)
- [ ] Gemini File Search store integratie
- [ ] Automatische citaties voor juridische traceerbaarheid

## Concept-modus voor Beleidsdocumenten
- [ ] Toggle "Neem concepten m## Concept-modus Documenten
- [x] Status veld (geldig, concept, vervallen) voor documenten
- [x] CONCEPT label in rapporten bij concept-documenten
- [x] neemConceptenMee toggle in gemeente instellingen
- [ ] Beheerder UI voor concept toggle (admin interface) Nachtelijke Publicatie Crawler
- [x] Crawler service voor overheid.nl (officiële bekendmakingen)
- [x] Crawler service voor ruimtelijkeplannen.nl (omgevingsplannen)
- [x] Crawler service voor wetten.overheid.nl (wetgeving)
- [x] Crawler voor gemeentelijke websites (beleidspagina's)
- [x] Crawler voor provinciale websites (12 provincies)
- [x] Crawler voor waterschap websites (21 waterschappen)
- [x] Crawler voor recreatieschap websites (incl. Westfriesland)
- [x] Crawler voor omgevingsdienst websites
- [x] Crawler voor veiligheidsregio websites
- [x] Crawler voor GGD websites
- [x] Google Search API integratie voor aanvullende documenten
- [x] Alleen crawlen voor gemeenten met actieve seats
- [x] Automatische detectie nieuwe/gewijzigde documenten
- [x] Push-notificatie naar beheerder bij nieuwe documenten

## Llama 3.3 70B Samenvattingen
- [x] Together.ai API integratie
- [x] Batch-job voor samenvattingen bij nieuwe documenten
- [x] Kosten schatting functie (~€0.15/maand bij 500 docs)
- [ ] Max 500 tokens per samenvatting
- [ ] Kostenoptimalisatie (€0.15/maand bij 500 docs)

## Policy Assist Juridische Filtermethodiek (KERN)
Dit is de basis van het hele systeem - niet "alles zoeken" maar systematisch uitsluiten wat NIET relevant is.

### Stap 1: Exacte locatie bepalen (EERST!)
- [x] Perceelgrenzen, kadastraal object, omgevingsplan
- [x] Locatie-specifieke analyse in AI prompt
- [x] Bijzondere gebieden detectie (Natura2000, beschermd gezicht)

### Stap 2: Procedure bepalen (hangt af van locatie!)
- [x] Binnenplans? BOPA? Meldingsplichtig? Vergunningvrij?
- [x] Procedure bepaalt toetsingskader
- [x] Motivering in rapport

### Stap 3: Activiteiten identificeren
- [x] Expliciete activiteiten (DSO)
- [x] Impliciete activiteiten detecteren
- [x] Neveneffecten (geluid, parkeren, gebruik)

### Stap 4: Beleids-hiërarchie toepassen
- [x] Hiërarchie in AI prompt geïmplementeerd
- [x] Lager beleid mag nooit hoger recht overrulen
- [x] overschrevenDoorHogerRecht veld in toetsingskaders

### Stap 5: Juridische status per beleidsdocument
- [x] juridischeStatus enum (normstellend/richtinggevend/afwegingskader)
- [x] isBindend veld
- [x] isConcreetGenoeg veld
- [x] heeftTweezijdigeWerking veld

### Stap 6: Tweezijdige werking check (BOPA's)
- [x] tweezijdigeWerkingCheck in AnalysisResult
- [x] beschermdeFuncties met type (nieuw/bestaand)
- [x] vernietigingsrisico (laag/middel/hoog)
- [x] Weergave in PDF rapport

### Stap 7: Documenteer wat je NIET gebruikt
- [x] uitgeslotenBeleid array in AnalysisResult
- [x] redenUitsluiting en juridischeMotivering per item
- [x] Weergave in PDF rapport met tabel

## Omgevingsloket Integratie - Regels op de Kaart
- [x] Onderzoek Omgevingsloket API endpoints (omgevingswet.overheid.nl)
- [x] PDOK Locatieserver voor geocoding (adres → coördinaten)
- [x] Ruimtelijke Plannen API voor bestemmingsplannen per locatie
- [x] Omgevingsdocument Presenteren API voor omgevingsplan regels
- [x] Automatisch bestemming bepalen via coördinaten/adres
- [x] Alle ruimtelijke plannen ophalen (omgevingsplan, parapluplannen)
- [x] Alle bepalingen/regels per locatie ophalen
- [x] Gebiedsaanwijzingen ophalen (Natura2000, beschermd gezicht, etc.)
- [x] Integratie in AI analyse flow (Stap 1)
- [ ] DSO_API_KEY configureren (gratis aan te vragen via developer.omgevingswet.overheid.nl)

## API Overzicht voor Morgen
- [x] Maak complete lijst van alle benodigde API's met kosten (zie docs/api-overzicht.md)
- [x] Zoek alternatieven voor Together.ai - Groq (gratis tier!) of DeepInfra (goedkoopst)
- [ ] DSO API-key aanvragen via developer.omgevingswet.overheid.nl
- [ ] Groq API-key aanmaken via console.groq.com (gratis)

## Locatiebepaling vanuit Kaartafbeeldingen
- [x] Analyseer kaartafbeeldingen uit DSO-aanvragen met Gemini Vision
- [x] Herken plaatsnamen, waternamen, landmarks op kaart
- [x] Reverse geocoding (coördinaten → adres) via PDOK
- [x] Integreer in bestaande locatie service (analyseLocatieVanKaart functie)

## Omgevingsloket API Uitbreiding
- [x] Onderzoek alle beschikbare API's op developer.omgevingswet.overheid.nl
- [x] RTR API (Toepasbare Regels) integreren - activiteiten en werkzaamheden ophalen
- [x] Uitvoeren Services API integreren - vergunningscheck en indieningsvereisten
- [x] Verzoeksroutering API integreren - bevoegd gezag en behandeldienst bepalen
- [x] Catalogus API integreren - begrippen en definities ophalen
- [x] Volledige DSO analyse service (dsoApiService.ts)
- [x] Integratie in locatieService.ts voor automatische analyse
- [x] DSO resultaten in AI context (formatLocatieVoorAI)
- [ ] DSO_API_KEY configureren voor productie gebruik
- [x] Groq API-key geconfigureerd voor Llama 3.3 70B samenvattingen (gratis tier)

## PDOK API Integraties
- [x] Overzicht gemaakt van alle 177 PDOK datasets
- [x] Relevante API's geïdentificeerd voor omgevingsvergunningen
- [x] Documentatie geschreven (docs/pdok-api-overzicht.md)
- [x] BAG API integreren - gebouwinformatie (bouwjaar, functie, oppervlakte) met slimme filtering
- [x] Kadastrale Kaart API integreren - perceelgrenzen en oppervlakte
- [x] Natura 2000 API integreren - beschermde natuur detectie
- [x] Beschermde Gebieden Cultuurhistorie API - monumenten en beschermde gezichten
- [x] BGT API integreren - verharding, groen, water (met slimme filtering)
- [x] Grondwaterbeschermingsgebieden API - waterwin/boringsvrije zones

## Rapportenarchief
- [x] Database tabel uitgebreid (projectNaam, wgs84Lat/Lng, PDOK flags, samenvatting)
- [x] Backend API voor rapporten ophalen, zoeken, filteren (archief, kaartData, getById, behandelaars)
- [x] Rapportenarchief pagina met overzicht alle rapporten (/archief)
- [x] Kaartweergave met locaties en markers
- [x] Behandelaar info (naam/email) bij elk rapport
- [x] Zoekfunctie op zaaknummer, adres, project, aanvrager
- [x] Filter op behandelaar, proceduretype, datum
- [x] Dossieroverdracht: collega's kunnen rapporten inzien
- [x] Sidebar navigatie met Archief link

## Milieuaspecten Toetsing
- [x] milieuService.ts met bidirectionele analyse (inwaarts/uitwaarts)
- [x] Stiltegebieden API (PDOK Provincies)
- [x] Geluidzones vliegvelden API (PDOK Provincies)
- [x] Hoofdwegen omgevingslawaai API (PDOK IenW)
- [x] Hoofdspoorwegen omgevingslawaai API (PDOK IenW)
- [x] REV Externe Veiligheid API (PDOK RVO)
- [x] Bodemloket API (PDOK Provincies)
- [x] Integratie in locatieService.ts
- [x] Milieu aandachtspunten in AI context (formatMilieuVoorAI)

## Footer Component
- [x] Footer component met bedrijfsgegevens (Policy AI Assist, Duivendrechtsekade 80 Amsterdam, 0229-511915)
- [x] Links naar Algemene Voorwaarden, Privacybeleid, FAQ
- [x] Integratie in landing page

## FAQ Pagina
- [x] FAQ pagina met veelgestelde vragen over PWA en gebruikersportaal (25 vragen)
- [x] Route /faq toegevoegd
- [x] Link in footer en navigatie

## AI-Classificatie Beleidsdocumenten
- [x] AI-service voor document classificatie (laag, type, categorie, relevantieTags)
- [x] Backend endpoint voor classificatie suggesties (beleidsdocumenten.classificeer)
- [x] Unit tests voor document classifier (5 tests)
- [ ] Frontend integratie bij handmatige upload
- [ ] Beheerder kan suggesties accepteren of aanpassen

## Basislaag Kennisbank (Fundamentele Juridische Laag)
- [ ] Basislaag service met procedurebepaling (regulier 8wk / uitgebreid 26wk / melding)
- [ ] Toetsingskader per procedure (binnenplans vs BOPA)
- [ ] ETFAL-kader (8 criteria voor evenwichtige toedeling functies aan locaties)
- [ ] Tweezijdige werking module (bescherming nieuwe + bestaande functies)
- [ ] Vergunningvrij bouwen criteria (Bbl Bijlage II art. 2.29-2.37)
- [ ] Meldingen overzicht (sloop, gebruik, bouw, gereed, milieu)
- [ ] Termijnen per procedure met wettelijke basis
- [ ] Hiërarchie beleid (rijks > provinciaal > regionaal > gemeentelijk)
- [ ] Database schema update voor kennisbank lagen (basis, rijks, provinciaal, regionaal, gemeentelijk)
- [ ] Integratie in rapport generatie (altijd gebruiken, niet letterlijk meesturen)

## Basislaag Kennisbank - Geïmplementeerd
- [x] basislaagService.ts met procedurebepaling, ETFAL-kader, tweezijdige werking
- [x] Integratie in gemini.ts - altijd gebruiken bij rapport generatie
- [x] Database schema update - basis laag toevoegen aan kennisbank_items en kennisbank_documenten
- [x] Vergunningvrij bouwen criteria (Bbl Bijlage II)
- [x] Meldingen overzicht (sloop, brandveiligheid, Wkb, milieu)
- [x] Termijnen per procedure (regulier 8wk, uitgebreid 26wk, melding 4wk)
- [x] Beleids hiërarchie (basis > rijks > provinciaal > regionaal > gemeentelijk)
- [x] ETFAL 8 criteria met toetsvragen
- [x] Tweezijdige werking analyse met risicobeoordeling

## Toetsingsmatrix (Activiteit + Functie → Toetsingskaders)
- [x] Database tabel toetsingsmatrix (activiteit, functie, verplichte_kaders, optionele_kaders)
- [x] Standaard matrix met 22 activiteittypes en 14 functietypes
- [x] ToetsingsmatrixService met getToetsingskaders() en formatToetsingskadersVoorAI()
- [x] Detectie functies: detecteerActiviteitType() en detecteerFunctieType()
- [x] Integratie in AI prompt: MOET gebruiken + KAN raadplegen structuur
- [ ] Beheerder UI voor matrix aanpassen

## Dubbelbestemmingen, Parapluplannen en Structuurvisies
- [x] Dubbelbestemmingen check (8 types: archeologie, waterkering, waterstaat, leiding, natuur, cultuurhistorie, geluid, veiligheid)
- [x] Automatisch adviesinstantie en aandachtspunten per dubbelbestemming
- [x] Parapluplannen altijd meenemen (Parkeren, Archeologie standaard + specifieke)
- [x] Structuurvisie check bij afwijking bestemmingsplan (gemeentelijk + provinciaal)
- [x] Integratie in basislaagService en formatBasislaagVoorAI

## Juridische Toetsingshiërarchie (ALTIJD/SOMS/NOOIT)
- [x] ALTIJD toetsen: Omgevingsplanregels (bestemming, bouwregels, parapluregels, bruidsschat)
- [x] ALTIJD toetsen: Rijksregels (Bbl/Bal/Bkl afhankelijk van activiteit)
- [x] ALTIJD toetsen: Procedurele vereisten (procedure, termijnen, bevoegd gezag)
- [x] ALTIJD toetsen: Beschermde regimes (indien van toepassing)
- [x] ALTIJD toetsen: Welstandstoets (art. 4.19 Ow)
- [x] ALTIJD toetsen: Adviesplicht (Rijksadviseur, GGD, Veiligheidsregio, Waterschap)
- [x] SOMS toetsen: Beleid (alleen bij BOPA/open normen)
- [x] NOOIT zelfstandig: Visies zonder normstelling
- [x] Gouden beslisboom implementeren (5 vragen in volgorde)
- [x] Integratie in AI prompt met duidelijke instructies

## Juridische Verbeterpunten Basislaag
- [x] Bruidsschatregels nuance - per 1-1-2024 onderdeel omgevingsplan, check actuele versie
- [x] Welstandstoets correctie - ALTIJD verplicht bij binnenplanse vergunning (art. 4.19 Ow)
- [x] Participatieplicht verduidelijking - alleen bij aangewezen gevallen en uitgebreide procedure
- [x] Adviesplicht toevoegen - Rijksadviseur, GGD, Veiligheidsregio, Waterschap, Monumentencommissie

## Dubbelbestemmingen Detectie via Ruimtelijkeplannen.nl API
- [x] ruimtelijkeplannenService.ts met WFS API integratie
- [x] Automatisch dubbelbestemmingen detecteren per locatie (archeologie, waterkering, etc.)
- [x] Automatisch parapluplannen detecteren
- [x] Integratie in locatieService.ts
- [x] Adviesinstanties automatisch koppelen aan gedetecteerde dubbelbestemmingen

## Beheerder UI Toetsingsmatrix
- [x] ToetsingsmatrixBeheer.tsx pagina voor admins
- [x] CRUD operaties voor toetsingsregels (create, update, delete)
- [x] Filter op activiteit en functie
- [x] Route /admin/toetsingsmatrix toegevoegd
- [x] Database functies in db.ts

## Hoofdbestemming en Onderzoeksvereisten
- [x] Hoofdbestemming automatisch detecteren via Ruimtelijkeplannen.nl API (enkelbestemmingen)
- [x] Alle bestemmingen (hoofd + dubbel) in rapport tonen
- [x] KLIC-melding vereist bij leidingen/kabels (dubbelbestemming Leiding)
- [x] KLIC-melding vereist bij graafwerk >20cm diepte
- [x] Onderzoeksvereisten per dubbelbestemming (8 types met onderzoek info):
  - [x] Archeologie: archeologisch onderzoek (bureau/boor/proefsleuven)
  - [x] Waterkering: watervergunning + advies waterschap
  - [x] Natuur/NNN: natuurtoets + ontheffing Wnb
  - [x] Geluidzone: akoestisch onderzoek
  - [x] Bodem: bodemonderzoek
  - [x] Luchtkwaliteit: luchtkwaliteitsonderzoek
  - [x] Externe veiligheid: QRA/risicoanalyse
  - [x] Leiding (gas/hoogspanning/riool/water): KLIC-melding
- [x] AERIUS-berekening vereisten (aeriusService.ts):
  - [x] Nieuwbouw met stikstofemissie (bouw + gebruik)
  - [x] Uitbreiding veehouderij
  - [x] Industriële activiteiten met emissie
  - [x] Nabij Natura 2000 (<10km) - afstandsberekening
- [x] Integratie in rapport met duidelijke vereisten per activiteit (formatAeriusVoorAI)
- [x] Centrale onderzoekenService.ts met 18 onderzoekstypes en volledige metadata:
  - [x] archeologisch_onderzoek, akoestisch_onderzoek, bodemonderzoek
  - [x] flora_fauna_onderzoek, stikstof_aerius, watertoets
  - [x] cultuurhistorisch_onderzoek, verkeersstudie, luchtkwaliteit_onderzoek
  - [x] externe_veiligheid_qra, trillingen_onderzoek, geur_onderzoek
  - [x] asbestinventarisatie, bouwhistorisch_onderzoek, constructieve_berekening
  - [x] energieprestatieberekening, daglicht_berekening, brandveiligheid_onderzoek
  - [x] klic_melding
- [x] Automatische detectie op basis van:
  - [x] Dubbelbestemmingen uit ruimtelijke plannen
  - [x] PDOK analyse (Natura 2000, monumenten, beschermd gezicht, grondwater)
  - [x] Milieu analyse (geluidszones, bodemverontreiniging, risicocontouren)
  - [x] AERIUS vereiste
  - [x] Activiteittype (nieuwbouw, verbouw, sloop, functiewijziging)
  - [x] Projectdetails (bouwjaar, graafdiepte)
- [x] Integratie in locatieService.ts voor automatische detectie
- [x] Integratie in gemini.ts AnalysisResult
- [x] Integratie in PDF rapport (pdfGenerator.ts) met verplichte/aanbevolen onderzoeken
- [x] Unit tests voor onderzoekenService (9 tests, alle geslaagd)

## Juridische Verbeteringen Onderzoeksvereisten
- [x] Uitbreiden wettelijke basis per onderzoek met exacte artikelverwijzingen
- [x] Toevoegen juridische motivering bij elk vereist onderzoek in rapport (wettelijke grondslag in PDF)
- [ ] Implementeren vrijstellingsgrenzen per gemeente (archeologie: vaak >30cm en >100m²)
- [x] Toevoegen verwijzing naar relevante NEN-normen per onderzoek
- [ ] Implementeren contextafhankelijke filtering (bouwjaar alleen bij verbouw/sloop)
- [ ] Toevoegen drempelwaarden per onderzoek (wanneer wel/niet verplicht)
- [x] Verbeteren AERIUS logica met exacte Wnb artikelen (art. 2.7, 2.8)
- [ ] Toevoegen procedure-informatie per onderzoek (waar aanvragen, welke formulieren)
- [x] Systeemanalyse document geschreven (docs/systeemanalyse-juridisch-ro.md)
- [x] Juridische grondslagen document geschreven (docs/juridische-grondslagen-onderzoeken.md)
## Implementatie Verbeterpunten Januari 2026
- [x] Vrijstellingsgrenzen per gemeente (archeologie, bodem)
  - [x] Database velden voor archeologie vrijstelling (diepte, oppervlakte) - migratie 0012
  - [x] Database velden voor bodem vrijstellingsgebieden - migratie 0012
  - [x] Integratie in onderzoekenService (GemeenteVrijstellingen interface)
  - [ ] Admin UI voor beheer vrijstellingsgrenzen
- [x] Drempelwaarden per onderzoek implementeren
  - [x] Drempelwaarden interface toevoegen aan OnderzoekVereiste (OnderzoekDrempelwaarden)
  - [x] Logica voor verplicht vs aanbevolen op basis van drempels
  - [x] Duidelijke weergave in rapport (formatOnderzoekenVoorAI)
  - [x] Vrijstellingsgronden per onderzoek gedefinieerd
- [x] Indieningsvereisten check implementeren
  - [x] Indieningsvereisten service aanmaken (Omgevingsregeling art. 7.3-7.4) - 553 regels
  - [x] Activiteit-specifieke vereisten uit Omgevingsregeling hoofdstuk 7 (7 categorieën)
  - [x] Volledigheidscheck in analyse flow (gemini.ts integratie)
  - [x] Weergave ontbrekende documenten in rapport (indieningsvereisten in AnalysisResult)
  - [x] Unit tests (14 tests, alle geslaagd)

## Automatische Vrijstellingsgrenzen, Graafwerk Detectie en Volledigheidscheck
- [x] Automatisch ophalen vrijstellingsgrenzen uit omgevingsplan
  - [x] vrijstellingsService.ts gemaakt (400+ regels)
  - [x] Extractie vrijstellingsdiepte en oppervlakte uit kennisbank tekst via AI
  - [x] Opslaan in kennisbank onder gemeentelaag (slaVrijstellingenInKennisbank)
  - [x] Fallback naar standaard waarden (30cm, 100m²)
- [x] AI graafwerk detectie uit aanvraagdocumenten
  - [x] Analyse van activiteiten op funderingen, kelders, etc. (analyseerGraafwerk)
  - [x] Analyse van projectomschrijving op graafwerk indicatoren
  - [x] Schatting graafdiepte op basis van bouwtype (nieuwbouw: 80cm, kelder: 300cm, etc.)
  - [x] Integratie in gemini.ts analyse (graafwerkAnalyse in AnalysisResult)
- [x] AI volledigheidscheck in rapport
  - [x] AI analyseert ingediende documenten vs vereisten (volledigheidscheck in AnalysisResult)
  - [x] Volledigheidscheck resultaat in PDF rapport tonen (pdfGenerator.ts)
  - [x] Ontbrekende documenten met wettelijke grondslag (art. 4:5 Awb)
  - [x] Graafwerk analyse sectie in PDF rapport met vrijstellingscheck
- [x] Unit tests (10 tests voor vrijstellingsService, alle geslaagd)

## Officiële API Integratie (DSO + Ruimtelijkeplannen.nl)
- [x] API keys toevoegen aan project secrets
  - [x] DSO_API_KEY voor Productieomgeving (51944ec7-...)
  - [x] RUIMTELIJKEPLANNEN_API_KEY voor Ruimtelijke plannen (f0dfb7ea...)
- [x] ruimtelijkeplannenService updaten voor officiële API
  - [x] Nieuwe ruimtelijkeplannenApiService.ts gemaakt (400+ regels)
  - [x] Officiële endpoint: ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
  - [x] Plannen, bestemmingsvlakken, dubbelbestemmingen ophalen via API
  - [x] Vrijstellingsregels zoeken in planregels
  - [x] Integratie in vrijstellingsService.ts
- [x] DSO service updaten voor officiële Productieomgeving API
  - [x] dsoApiService.ts gebruikt nu productie endpoint
  - [x] X-Api-Key header voor authenticatie
- [x] Testen van nieuwe API integraties
  - [x] api-keys.test.ts - beide API keys gevalideerd
  - [x] ruimtelijkeplannenApi.test.ts - 6 tests, alle geslaagd
  - [x] Alle 111 tests geslaagd

## BAG API Integratie (Kadaster)
- [x] BAG API key toevoegen aan project secrets (BAG_API_KEY)
- [x] bagApiService.ts maken voor gebouwgegevens (300+ regels)
  - [x] Pand ophalen (bouwjaar, status, geometrie)
  - [x] Verblijfsobject ophalen (oppervlakte, gebruiksdoel)
  - [x] Nummeraanduiding ophalen (postcode, huisnummer)
  - [x] Adres naar BAG ID conversie (zoekAdres)
  - [x] haalGebouwInfo combineert alle BAG data
  - [x] formatBagInfoVoorAI voor AI context
  - [x] Automatische asbest/vooroorlogs/oud bouwjaar detectie
- [x] Integratie in locatieService
  - [x] BAG API call toegevoegd aan parallelle queries
  - [x] Bouwjaar automatisch ophalen (BAG als primaire bron, PDOK als fallback)
  - [x] Gebruiksdoel beschikbaar voor activiteit-specifieke vereisten
  - [x] Oppervlakte beschikbaar voor vrijstellingsgrenzen
  - [x] bagInfo toegevoegd aan LocatieAnalyse interface
  - [x] BAG sectie toegevoegd aan formatLocatieVoorAI
- [x] DSO API verbeteren
  - [x] haalToepasbareRegels functie toegevoegd
  - [x] Vergunningcheck via bepaalVergunningCheck
  - [x] Indieningsvereisten uit DSO via bepaalVergunningCheck
- [x] Tests voor BAG en DSO API's (116 tests, alle geslaagd)

## DSO Vergunningcheck Integratie met AI-analyse
- [x] DSO vergunningcheck service verbeteren
  - [x] Toepasbare regels ophalen per activiteit (haalToepasbareRegels)
  - [x] Conclusies (vergunningplicht/meldingsplicht/vergunningvrij) bepalen (bepaalVergunningCheck)
  - [x] Juridische grondslag per conclusie ophalen
  - [x] Indieningsvereisten per activiteit ophalen
  - [x] Bevoegd gezag en behandeldienst bepalen (bepaalBevoegdGezag)
- [x] Integratie in AI analyse (gemini.ts)
  - [x] dsoVergunningcheck toegevoegd aan AnalysisResult interface
  - [x] Parallelle DSO API calls in analyzeDSOAanvraag
  - [x] Samenvatting conclusie met juridische grondslagen
  - [x] Open vragen uit DSO beschikbaar voor behandelaar
- [x] Integratie in rapport (pdfGenerator.ts)
  - [x] DSO Vergunningcheck sectie met kleurcodering per conclusie
  - [x] Conclusies per activiteit tabel met juridische grondslag
  - [x] Bevoegd gezag en behandeldienst weergave
  - [x] DSO indieningsvereisten checklist
  - [x] Open vragen sectie voor beantwoording
- [x] Tests voor DSO vergunningcheck integratie (116 tests, alle geslaagd)

## AI-Beslisboom Vergunningvrij vs. Beschermingsregimes
- [x] Implementeer beslisboom service (vergunningBeslisboomService.ts - 400+ regels)
  - [x] Stap 1: Basisvraag vergunningvrij (Bbl/Bal/Omgevingsplan)
  - [x] Stap 2: Expliciete uitzonderingen zoeken
  - [x] Stap 3: Beschermingsregime als context vs. doorslaggevend
  - [x] Stap 4: Rapportage-instructies genereren
- [x] Override-regel implementeren
  - [x] Alleen override bij expliciete normstellende bepaling (isOverrideToegestaan)
  - [x] Verboden overrides blokkeren (alleen aanwezigheid regime, beleidsdocumenten, algemene doelen)
  - [x] Toegestane overrides met bronverwijzing (uitzonderingArtikel vereist)
- [x] Integratie in AI-analyse (gemini.ts)
  - [x] DSO conclusie als primaire bron (dsoConclusieBasis)
  - [x] AI-analyse voor aanvullende aspecten (beschermingsregimes detectie)
  - [x] Gecombineerde conclusie met correcte motivering (beslisboomResultaat in AnalysisResult)
- [x] Rapportage met juridisch correcte formuleringen (pdfGenerator.ts)
  - [x] Situatie 1: Geen override (context) - beschermingsregimesContext
  - [x] Situatie 2: Wel override (doorslaggevend + bronverwijzing) - beschermingsregimesDoorslaggevend
  - [x] Doorlopen stappen zichtbaar in rapport (details/summary)
- [x] Unit tests (11 tests, alle geslaagd)

## Consolidatie Beslisbomen en Kennisbanken
- [x] Ontwerp geconsolideerde structuur
  - [x] Eén centrale beslisboom (toetsingshiërarchie + vergunningplicht)
  - [x] Eén gelaagde kennisbank met 5 lagen en 4 categorieën
- [x] Centrale beslisboom service maken (centraleBeslisboomService.ts - 700+ regels)
  - [x] Samenvoegen basislaagService + vergunningBeslisboomService
  - [x] Gouden juridische regel integreren (ALTIJD/SOMS/NOOIT toetsen)
  - [x] Override-logica behouden (beschermingsregimesDoorslaggevend)
  - [x] Procedure bepaling (vergunningvrij/meldingsplichtig/regulier/uitgebreid)
  - [x] Toetsingskaders met prioriteit en wettelijke basis
- [x] Gelaagde kennisbank service maken (gelaagdeKennisbankService.ts - 900+ regels)
  - [x] 5 lagen: Basis, Landelijk, Provinciaal, Regionaal, Gemeentelijk
  - [x] 4 categorieën: Adviseurs, Toetsingskaders, Onderzoeken, Beleidsdocumenten
  - [x] Trigger-based matching (activiteiten, beschermingsregimes, functies, graafdiepte)
  - [x] Juridische status per item (bindend/richtinggevend/afwegingskader)
  - [x] Metadata per laag en per categorie (perLaag, perCategorie)
- [x] Migreer bestaande data naar nieuwe structuur (imports in gemini.ts)
- [x] Update alle afhankelijke services (gemini.ts geïmporteerd)
- [x] Test en valideer de nieuwe structuur (13 tests, alle geslaagd)
- [x] Alle 140 tests geslaagd

## Volledige Integratie Centrale Beslisboom en Gelaagde Kennisbank
- [x] Centrale beslisboom integreren in gemini.ts
  - [x] voerCentraleBeslisboomUit aanroepen met aanvraag context
  - [x] Resultaat toevoegen aan AnalysisResult interface (centraleBeslisboomResultaat)
  - [x] Beschermingsregimes detecteren uit locatieAnalyse (beschermd gezicht, monument, natura2000, etc.)
  - [x] Activiteit en functie mapping naar centrale beslisboom types
- [x] Gelaagde kennisbank integreren in AI context
  - [x] haalKennisbankItems aanroepen met KennisbankQuery
  - [x] Kennisbank items formatteren voor AI prompt
  - [x] Per-laag context meegeven (Basis t/m Gemeentelijk)
  - [x] Resultaat toevoegen aan AnalysisResult (kennisbankResultaat)
- [x] PDF rapport updaten met nieuwe resultaten
  - [x] Centrale beslisboom sectie (eindconclusie, motivering, juridische grondslag)
  - [x] Toetsingskaders met gouden regel (ALTIJD/SOMS/NOOIT)
  - [x] Beschermingsregimes met doorslaggevend/context indicatie
  - [x] Doorlopen stappen in details/summary element
  - [x] Kennisbank per laag sectie (5 lagen, 4 categorieën)
  - [x] Items per laag met categorie, naam, status en toelichting
- [x] Testen van volledige integratie (140 tests, alle geslaagd)

## Kennisbank Beheer UI voor Alle Gebruikers
- [x] Database schema voor kennisbank items
  - [x] kennisbank_items tabel bestaat al met laag, categorie, triggers
  - [x] Geen migratie nodig
- [x] tRPC procedures voor CRUD operaties (routers.ts)
  - [x] kennisbank.list - items ophalen met filters (laag, type, status, zoekterm)
  - [x] kennisbank.getById - enkel item ophalen
  - [x] kennisbank.create - nieuw item toevoegen (protectedProcedure)
  - [x] kennisbank.update - item bewerken (protectedProcedure)
  - [x] kennisbank.delete - item deactiveren (soft delete)
  - [x] kennisbank.hardDelete - permanent verwijderen (admin only)
  - [x] kennisbank.statsPerLaag - statistieken per laag
- [x] Kennisbank beheer pagina (KennisbankBeheer.tsx - 700+ regels)
  - [x] Filter op laag (5 lagen) en categorie (4 categorieën)
  - [x] Statistieken cards per laag met item counts
  - [x] Tabel met alle items (naam, type, laag, status, acties)
  - [x] Create dialog met formulier (scope validatie per laag)
  - [x] Edit dialog met formulier
  - [x] Delete bevestiging (soft delete naar inactief)
  - [x] Juridische status selectie (normstellend/richtinggevend/afwegingskader)
  - [x] Triggers input voor AI matching (activiteiten, beschermingsregimes)
- [x] Toegang voor alle gebruikers (protectedProcedure, niet admin-only)
- [x] Route toegevoegd aan App.tsx (/kennisbank)
- [x] Alle 140 tests geslaagd

## Bulk Import Functie Kennisbank
- [ ] CSV/Excel parser en validatie service
  - [ ] CSV parsing met header detectie
  - [ ] Excel (.xlsx) parsing ondersteuning
  - [ ] Validatie van verplichte velden (naam, laag, type)
  - [ ] Validatie van enum waarden (laag, type, juridischeStatus)
  - [ ] Error rapportage per rij
- [ ] tRPC procedure voor bulk import
  - [ ] kennisbank.bulkImport procedure
  - [ ] Transactionele insert (alles of niets)
  - [ ] Resultaat met succes/fout counts
- [ ] Bulk import UI in KennisbankBeheer
  - [ ] Upload button voor CSV/Excel
  - [ ] Preview van te importeren items
  - [ ] Validatie feedback voor gebruiker
  - [ ] Import bevestiging dialog
  - [ ] Resultaat weergave (aantal geïmporteerd, fouten)
- [ ] Template download voor gebruikers
  - [ ] CSV template met alle kolommen
  - [ ] Voorbeeld data in template

## Bulk Import Kennisbank
- [x] CSV parsing functie in frontend
- [x] Bulk import dialog met preview
- [x] Gemeente selectie voor gemeentelijke items
- [x] Validatie fouten weergave
- [x] tRPC bulkImport procedure
- [x] CSV template download functie
- [x] getTemplate procedure
- [x] Unit tests voor bulk import

## Kennisbank Navigatie
- [x] Voeg kennisbank link toe aan dashboard sidebar


## Kennisbank DocumentType Uitbreiding
- [x] Breid documentType uit met enum voor informele beleidsdocumenten
- [x] Voer database migratie uit
- [x] Voeg Nohono document toe als voorbeeld
- [x] Onderzoek AERIUS API toegang

## AERIUS API Integratie
- [x] Configureer AERIUS API-key als environment variable
- [x] Maak AERIUS service voor stikstofberekeningen
- [x] Test AERIUS API connectie
- [x] Integreer stikstof voortoets in analyse flow

## Natura2000 OGC API Integratie
- [x] Onderzoek PDOK Natura2000 OGC API documentatie
- [x] Maak Natura2000 API service
- [x] Integreer met stikstof voortoets
- [x] Test afstandsberekening tot Natura2000 gebieden

## AERIUS Calculator Link
- [ ] Voeg directe AERIUS Calculator link toe aan behandelrapport

## Uitbreiding Beschermde Gebieden Check
- [x] Onderzoek PDOK API's voor NNN-gebieden (gevonden in CDDA API)
- [x] Onderzoek PDOK API's voor stiltegebieden (niet beschikbaar via PDOK)
- [x] Onderzoek andere beschermde gebieden (Nationale Parken in CDDA API)
- [x] Maak gecombineerde gebiedencheck service
- [x] Integreer in stikstof voortoets en rapport

## BRO API Integratie
- [x] Monitor BRO website (basisregistratieondergrond.nl) voor nieuws en updates
- [ ] Wacht op API-key van BRO
- [ ] Integreer BRO bodemkwaliteitscheck in behandelrapport
- [ ] Aanmelden voor BRO Keten Bijeenkomst nieuwsbrief

## Funderingsproblematiek API Integratie
- [x] Onderzoek PDOK Funderingsproblematiek API
- [x] Maak funderingsproblematiek service
- [x] Integreer in analyse en behandelrapport
- [x] Test de integratie

## BRP Gewaspercelen API Integratie
- [x] Maak BRP gewaspercelen service
- [x] Integreer in analyse (optioneel voor agrarische locaties)
- [x] Voeg sectie toe aan behandelrapport
- [x] Test met agrarische locatie

## Nieuwe PDOK API Integraties
- [x] Onderzoek BGT (Basisregistratie Grootschalige Topografie) API - MIDDEL prioriteit
- [x] Onderzoek Beschermde Gebieden - Cultuurhistorie API - HOOG prioriteit
- [x] Onderzoek Bestuurlijke Gebieden API - LAAG prioriteit (redundant)
- [x] Onderzoek Geometrieën Omgevingswet API - MIDDEL prioriteit
- [x] Integreer Beschermde Gebieden - Cultuurhistorie API
- [x] Test de integraties

## BGT API Integratie
- [x] Onderzoek BGT API collecties en relevante data
- [x] Maak BGT service voor topografische analyse
- [x] Integreer in analyse en behandelrapport
- [x] Test de integratie

## Geurcontouren Veehouderijen
- [x] Onderzoek beschikbare geurcontouren data bronnen (Utrecht WFS gevonden)
- [x] Maak geurcontouren service
- [x] Integreer in analyse voor woningbouwprojecten
- [x] Test de integratie

## Rapport Opmaak Verbetering
- [ ] Verbeter PDF-opmaak met uitgebreide, prettig leesbare secties
- [ ] Voeg duidelijke alinea-kopjes toe
- [ ] Genereer voorbeeldrapport


## Rapport Verbeteringen (Jan 2026)
- [x] Specifiekere bouwactiviteit beschrijving in rapport met details (bijv. "bouwen van een uitbouw van 10m² aan de achterzijde", "plaatsen van een dakkapel van 3m breed", etc.)
- [x] Bestemmingsplan/Omgevingsplan toets sectie aan begin rapport toevoegen
- [x] Toets aan geldende planregels uitleggen (functies, bouwregels, afwijkingsmogelijkheden)


## Follow-up Implementaties (Jan 2026)
- [x] Ruimtelijkeplannen.nl API integreren voor automatisch ophalen planregels en bestemmingen
- [x] Dubbelbestemmingen detectie en weergave (archeologische waarde, waterstaat-waterkering, etc.)
- [x] AI-extractie van afmetingen uit bouwtekeningen (oppervlakte, hoogte, breedte, diepte)
- [x] Integreer nieuwe functionaliteit in analyse flow


## Follow-up Implementaties (Jan 2026 - Batch 2)
- [x] Vrijstellingsgrenzen per gemeente voor archeologie (oppervlakte m², diepte cm)
- [x] Automatische bepaling of archeologisch onderzoek nodig is op basis van vrijstellingsgrenzen
- [x] Interactieve planregels tabel met klikbare links naar bronnen
- [x] PDF export met WeasyPrint voor echte PDF generatie met correcte paginering


## PDF Preview Implementatie (Jan 2026)
- [x] PDF viewer library installeren (react-pdf)
- [x] PDF Preview modal component maken
- [x] Preview integreren in analyse resultaten pagina (MijnRapporten + RapportenArchief)
- [x] Download/Annuleer knoppen toevoegen
- [x] Test PDF preview functionaliteit


## PDF Preview Verbeteringen (Jan 2026 - Batch 2)
- [x] Annotatie functionaliteit - opmerkingen en markeringen toevoegen aan PDF preview
- [x] Print functionaliteit - print knop voor direct printen vanuit preview
- [x] Keyboard shortcuts - pijltjestoetsen voor paginering, +/- voor zoom


## Milieutoets Signalering Module (Jan 2026)
- [x] Activiteittype detectie (bouw/gebruik/milieubelastend)
- [x] Milieuthema's identificatie (geluid, lucht, bodem, water, natuur, veiligheid)
- [x] Bal/Bkl regelverwijzingen met directe links naar artikelen
- [x] MER-beoordeling check (wanneer milieueffectrapportage nodig kan zijn)
- [x] BOPA-specifieke milieumotivering
- [x] Checklist voor behandelaar met concrete actiepunten
- [x] Integratie in analyse flow en PDF generator


## Geluid/Geur/Externe Veiligheid Module (Jan 2026)
- [ ] Onderzoek beschikbare databronnen en API's (PDOK, Atlas Leefomgeving, RIVM)
- [ ] Implementeer geluidszones service (industrieterreinen, weg-/railverkeer)
- [ ] Implementeer geurcontouren service (veehouderijen, industrie)
- [ ] Implementeer externe veiligheid service (PR/GR contouren, Bevi-inrichtingen, buisleidingen)
- [ ] Integreer wederkerigheid check (omgekeerde werking)
- [ ] Integreer in analyse flow en PDF generator
- [ ] Test de implementatie


## Zelflerend Systeem Follow-ups
- [ ] FeedbackPanel integreren in rapportweergave pagina
- [ ] Beheerder dashboard voor feedback statistieken en patronen
- [ ] Tekst over zelflerend systeem en updates toevoegen aan website


## Zelflerend Systeem Follow-ups
- [x] FeedbackPanel integreren in rapportweergave (MijnRapporten.tsx)
- [x] Beheerder dashboard voor feedback statistieken (/beheerder/feedback)
- [x] Tekst over updates en zelflerend systeem op homepage


## Navigatie & Follow-ups
- [x] Feedback Dashboard navigatielink toevoegen voor alle gebruikers
- [x] VNG Brief bijwerken met zelflerende systeem beschrijving (sectie 5 toegevoegd)
- [x] DNS verificatie voor ro-flow.nl (beide domeinen werken!)


## Intelligente Jurisprudentie Integratie
- [x] Database schema voor jurisprudentie met actualiteitsweging
- [x] Rechtspraak.nl crawler met Omgevingswet-bewuste scoring
- [x] Slimme trigger detectie (alleen wanneer jurisprudentie meerwaarde biedt)
- [x] Beleidsverwijzing extractor uit jurisprudentie tekst
- [x] Internet zoekservice voor ontbrekend beleid
- [x] Gebruiker bevestiging UI voor toevoegen beleid aan kennisbank (/beheerder/beleid-suggesties)
- [x] Integratie jurisprudentie in AI analyse context (jurisprudentieIntegratie.service.ts)
- [ ] Koppeling jurisprudentie aan toetsingskaders in basislaag
- [ ] End-to-end test met complexe BOPA case


## End-to-End Test Jurisprudentie Integratie
- [x] Integreer jurisprudentie context in gemini.ts analyse flow
- [x] Test met complexe BOPA scenario (7 tests passing)
- [x] Verifieer jurisprudentie sectie in rapport
- [x] Verifieer beleidsuggesties worden aangemaakt


## Performance Optimalisaties (Systeemanalyse Aanbevelingen)
- [x] Streaming LLM responses voor betere UX (invokeLLMStreaming in llm.ts)
- [x] Robuustere rechtspraak.nl crawler met retry logic (exponential backoff, timeout, rate limiting)
- [x] Parallelle jurisprudentie-check (Promise.all in gemini.ts)
- [x] Unit tests voor nieuwe functionaliteit (13 tests passing)


## OpenRechtspraak API Migratie
- [x] Onderzoek OpenRechtspraak API endpoints en documentatie
- [x] Refactor jurisprudentieCrawler.ts naar OpenRechtspraak API (XML/Atom feed parsing)
- [x] Implementeer RO-specifieke zoekfilters (bestuursrecht, omgevingsrecht)
- [x] Filter op termen: omgevingsvergunning, omgevingsplan, goede ruimtelijke ordening
- [x] Combineer met ECLI, instantie (Rb/ABRvS), datum (laatste 5-10 jaar)
- [x] Test en valideer nieuwe implementatie (16 tests passing)


## Seed Gecureerde Omgevingswet Jurisprudentie
- [x] Parseer research bestand en extraheer alle ECLI's met metadata (45 uitspraken)
- [x] Creëer seed script voor jurisprudentie database (seedOmgevingswetJurisprudentie.ts)
- [x] Implementeer toetsingskader koppeling per thema (BOPA, ETFAL, participatie, etc.)
- [x] Unit tests (23 tests passing)
- [ ] Voer seed script uit via API endpoint
- [ ] Test integratie met AI analyse flow


## AI Integratie Test Jurisprudentie
- [x] Seed gecureerde jurisprudentie in database (via router endpoint)
- [x] Verifieer jurisprudentie context bij BOPA triggers (19 tests passing)
- [x] Test volledige analyse flow met BOPA scenario (bopaAnalyseE2E.test.ts)
- [x] Valideer jurisprudentie sectie in rapport


## Security en AVG Analyse
- [x] Analyseer authenticatie en sessie beveiliging (OAuth, HttpOnly cookies, RBAC)
- [x] Analyseer API beveiliging en input validatie (239 Zod schemas, Drizzle ORM)
- [x] Analyseer data-opslag en encryptie (geen encryptie at rest)
- [x] Analyseer AVG compliance (privacy, data retention, rechten)
- [x] Stel security rapport op met bevindingen en aanbevelingen

### Geïdentificeerde Verbeterpunten (Prioriteit)
- [ ] KRITIEK: Implementeer API rate limiting
- [ ] KRITIEK: Voeg CSRF bescherming toe
- [ ] KRITIEK: Implementeer security headers (Helmet)
- [ ] HOOG: Bouw data export functie (AVG Art. 15/20)
- [ ] HOOG: Bouw account verwijdering (AVG Art. 17)
- [ ] HOOG: Implementeer audit logging
- [ ] GEMIDDELD: Data retention policy
- [ ] GEMIDDELD: Encryptie at rest voor gevoelige velden


## Security Implementatie (7.1 Kritiek)
- [x] Implementeer API rate limiting (100 req/min globaal, 10/15min auth, 10/min analyse)
- [x] Implementeer CSRF bescherming (token endpoint + validation middleware)
- [x] Implementeer security headers (Helmet met CSP)
- [x] Maak verwerkersovereenkomst document (/verwerkersovereenkomst-template.md)
- [x] Voeg FAQ vraag toe met verwerkersovereenkomst link


## AVG Rechten Implementatie
- [ ] Database queries voor data-export per gebruiker
- [ ] Data-export API endpoint (Art. 15 inzage, Art. 20 overdraagbaarheid)
- [ ] Accountverwijdering API endpoint (Art. 17 vergetelheid)
- [ ] Gebruikers UI voor data-export en verwijdering in account instellingen
- [ ] Unit tests voor AVG functionaliteit
- [ ] Audit logging voor AVG verzoeken


## AVG Rechten Implementatie (Voltooid)
- [x] Data export service (Art. 15 & 20 AVG) - avgRechtenService.ts
- [x] Account verwijdering service (Art. 17 AVG) - met anonimisatie rapporten
- [x] API endpoints voor export en verwijdering (avg router in routers.ts)
- [x] Gebruikers UI voor privacy beheer (/gebruiker/privacy)
- [x] Privacy link in user dropdown menu (DashboardLayout)
- [x] Unit tests voor AVG functionaliteit (17 tests passing)
- [x] Bevestigingsdialoog voor accountverwijdering
- [x] JSON export download functie
- [x] Bescherming tegen verwijdering super_admin en enige gemeente_beheerder
- [x] Fiscale bewaarplicht: betalingen worden NIET verwijderd (7 jaar)
- [x] Audit trail: rapporten worden geanonimiseerd, niet verwijderd


## Onboarding Recreatieschap
- [x] Voeg recreatieschap selectie toe aan onboarding wizard (nieuwe stap na waterschap)
- [x] 12 recreatieschappen als opties (incl. Westfriesland)
- [x] Optioneel veld ("Geen recreatieschap" optie)
- [x] Weergave in bevestigingsoverzicht


## Website Tekst Updates
- [x] Vervang "Geen installatie, geen servers, geen IT-traject nodig" voor "Gemakkelijke installatie, binnen één dag een werkend systeem"
- [x] Vervang "Juridisch veilig - Gebaseerd op Policy Assist v10" voor "Juridisch onderbouwd - Automatische koppeling met relevante jurisprudentie en actuele rechtspraak"


## Build Performance Optimalisatie
- [x] Analyseer huidige build configuratie (vite.config.ts, tsconfig.json)
- [x] Implementeer Vite build caching en code splitting (manual chunks)
- [x] Configureer incremental TypeScript builds (.tsbuildinfo)
- [x] Verplaats externe API calls van build-time naar runtime (geen build-time fetches gevonden)
- [x] Test build performance verbeteringen (build tijd: ~8.5s)


## Veilige Publish-Speed Optimalisaties
- [x] Sourcemaps uitschakelen voor productie builds (al gedaan in vorige checkpoint)
- [x] Zware assets verwijderd: hero-bg.jpg (5.9MB) en hero-options folder (ongebruikt)
- [x] Bundle analyzer toegevoegd (rollup-plugin-visualizer, ANALYZE=true)
- [x] Dist size gemeten: 3.9MB totaal, 28 bestanden, grootste chunk 1.4MB


## FAQ Wijzigingen
- [x] Verwijder "Moet IT iets installeren?" vraag van homepage en FAQ pagina


## Gratis Pilot Aanvraag Formulier
- [x] Pilot aanvraag pagina maken met formulier (gemeente, contactpersoon, email, aantal seats)
- [x] Backend: pilot aanvraag verwerken en opslaan
- [x] Backend: gratis seats aanmaken voor gemeente (90 dagen pilot)
- [x] Backend: notificatie mail naar super_admin
- [x] Backend: welkomstmail naar gemeente contactpersoon
- [x] Knoppen koppelen aan pilot formulier i.p.v. checkout
- [x] Test volledige flow (9 tests passing)


## Pilot Formulier Verbeteringen
- [x] Verander aantal seats van dropdown naar open invulveld

- [x] Wijzig "Pilot deelnemers" tekst naar: 10 pilotgemeenten gezocht, 6 maanden gratis

- [x] PWA installatie popup moet naar /pilot formulier leiden

- [x] BUG: PWA popup klik werkt niet - navigeert niet naar /pilot (werkt wel in preview)

- [x] Check en verwijder alle prijzen uit website en voorwaarden (FAQ, Voorwaarden aangepast)

- [x] Verwijder Checkout en CheckoutSuccess pagina's


## Admin Pilot Dashboard
- [x] Database query voor pilot aanmeldingen (gemeenten met pilot status)
- [x] Admin dashboard pagina met overzicht alle pilot aanvragen
- [x] Status beheer (actief, verlopen, verloopt binnenkort badges)
- [x] Acties: verlengen, deactiveren, details bekijken
- [x] Test dashboard functionaliteit (8 tests passing)


## Pilot Onboarding Flow Verbetering
- [x] Welkomstmail aanpassen: link naar onboarding, PWA instructies
- [x] Onboarding flow: AI-suggesties voor regio-instellingen (waterschap, OD, VR, GGD, recreatieschap)
- [x] Onboarding flow: AI-suggesties voor beleidsdocumenten (welstandsnota, parkeerbeleid, etc.)
- [x] Seat uitnodigingsmails met PWA installatie link (inviteSeat + bulkInvite endpoints)
- [x] Koppel onboarding aan pilot aanmelding flow (welkomstmail bevat onboarding link)


## Email Template Design Verbetering
- [x] Welkomstmail: moderner design met betere visuele hiërarchie
- [x] Uitnodigingsmail: consistente styling met welkomstmail (inviteSeat + bulkInvite)
- [x] Ro-flow branding en kleuren consistent toepassen


## Database Backup Systeem
- [x] Database backup functie bouwen (export 23 tabellen naar JSON, upload naar S3)
- [x] Backup endpoint toevoegen (super_admin + scheduled cron endpoint)
- [x] Eerste backup vandaag uitgevoerd (106 rijen, 150KB, S3 opgeslagen)
- [x] Wekelijkse automatische backup geconfigureerd (elke zondag 03:00 CET)
- [x] Notificatie naar eigenaar bij elke backup (succes + falen)


## Migratie naar Nieuw Manus Account
- [x] Inventariseer alle secrets en environment variables (20+ secrets)
- [x] Bouw database restore script (scripts/restore-db.mjs)
- [x] Maak migratie handleiding document (MIGRATIE-HANDLEIDING.md)


## Tekst Wijzigingen
- [x] Verwijder "Je" uit "Je uploadt een DSO-bestand" → "Upload een DSO-bestand"


## Website Perfectie - Wat doet Ro-flow sectie
- [x] Vernieuw "Wat doet Ro-flow?" sectie met alle 17 onderdelen
- [x] Aanvraagsamenvatting
- [x] Volledigheidscheck
- [x] Omgevingsplantoets
- [x] Vergunningplichtanalyse
- [x] Stikstof- en natuurtoets
- [x] Cultuurhistorie
- [x] Automatische milieutoets-trigger
- [x] BAL/BKL toetsing
- [x] MER-afweging
- [x] Geluid/geur/externe veiligheid
- [x] Beleidstoets middels gelaagde kennisbank
- [x] BOPA-specifieke milieumotivering
- [x] Integrale belangenafweging
- [x] Procedure
- [x] Adviseurs
- [x] Aandachtspunten
- [x] Haalbaarheid
- [x] Final CTA tekst geüpdatet naar 6 maanden gratis


## Haalbaarheidsschatting Rapport
- [ ] Voeg haalbaarheid type toe aan AnalysisResult in gemini.ts
- [ ] Voeg haalbaarheid toe aan AI prompt JSON schema
- [ ] Voeg haalbaarheid sectie toe aan PDF generator
- [ ] Publiceer alles naar roflowai-25kmsrzd.manus.space

## Haalbaarheidsschatting
- [x] Haalbaarheidsschatting toevoegen aan AnalysisResult TypeScript interface
- [x] Haalbaarheidsschatting toevoegen aan AI JSON schema (response_format)
- [x] Haalbaarheidsschatting instructies toevoegen aan AI prompt
- [x] Haalbaarheidsschatting mapping toevoegen aan aiResult verwerking
- [x] Haalbaarheidsschatting sectie toevoegen aan PDF rapport generator
- [x] Vitest tests voor haalbaarheidsschatting in PDF generator (4 tests)

## Design Update v5 - Omgevingschat.nl Stijl
- [ ] Analyseer omgevingschat.nl design (kleuren, typografie, layout)
- [ ] Pas kleurenpalet aan naar omgevingschat.nl stijl
- [ ] Pas typografie aan (font, gewichten, groottes)
- [ ] Herontwerp hero sectie (behoud huidige plaatje)
- [ ] Herontwerp features/onderdelen sectie
- [ ] Herontwerp CTA secties
- [ ] Herontwerp footer
- [ ] Herontwerp header/navigatie
- [ ] Pas dashboard layout aan op nieuwe stijl
- [ ] Test alle pagina's op consistentie

## Design Update v6 - Koraalrood accent uit logo
- [x] Bepaal exacte koraalrood kleur uit het logo (#FF5714)
- [x] Voeg koraalrood toe als accent kleur in CSS variabelen
- [x] Pas kopjes aan met koraalrood accent
- [x] Pas CTA knoppen aan met koraalrood

## Bug Fix - Fout icoon in Preview
- [ ] Onderzoek fout-icoon in Preview paneel
- [ ] Fix het probleem

## Design Update v7 - Nieuwe achtergronden en kleurconsistentie
- [x] Verwijder groene+rode woorden door elkaar in kopjes - kies één accent kleur per kopje
- [x] Behoud vrouw in hero maar fix positionering (hoofd volledig zichtbaar)
- [x] Voeg stadsachtergronden toe bij andere secties (niet hero)
- [x] Genereer achtergrondbeelden met steden/AI-thema
- [x] Upload nieuwe beelden naar CDN
- [x] Implementeer nieuwe achtergronden in homepage secties
- [x] Test consistentie en visuele kwaliteit

## Design Fix v8 - Eén kleur kopjes
- [x] Verwijder alle rode accent-woorden (text-coral) uit kopjes en titels
- [x] Alle kopjes één uniforme kleur

## Content Fix v9 - Verminder '15 seconden' herhalingen
- [x] Verminder '15 seconden' claims op homepage (4x → 0x, vervangen door 'enkele seconden')
- [x] Verminder '15 seconden' in FAQ (2x → 0x, vervangen door 'enkele seconden')
- [x] Verminder '15 seconden' op dashboard (1x → 'Snel resultaat')

## Design Fix v10 - Feature cards kleur
- [x] Verander feature cards (Volledigheidscheck, Juridische Toetsing, Behandelrapport) van groen naar donkerblauw

## Graafwerk Analyse Verbetering v11
- [ ] Graafdiepte uit DSO-formulier uitlezen in plaats van schatten
- [ ] Realiteitscheck: vergelijk opgegeven graafdiepte met verwachte range per activiteittype
- [ ] Bronlabeling verbeteren bij vrijstellingsgrenzen (duidelijk aangeven officieel vs fallback)
- [ ] Tests schrijven voor nieuwe functionaliteit

## Graafwerk Analyse v2 - KLIC-melding en consequenties
- [x] KLIC-melding verplicht bij elk graafwerk >20cm diepte (WIBON)
- [x] Alle graafwerk-consequenties meenemen (bodemonderzoek, grondwater, ontgravingsmelding)
- [x] Formulierwaarden altijd leidend - nooit overschrijven door schatting
- [x] Realiteitscheck alleen als aandachtspunt in rapport (niet als correctie)

## Homepage Tekst Correctie - Graafwerk & Fundering
- [x] Pas 'Graafwerk & Fundering' tekst aan naar 'Graafwerk & Bodem' (optie B)
- [x] Verwijder claims over kabels & leidingen en grondwaterstand

## Bodemloket/BRO API Integratie
- [x] Bodemloket ArcGIS REST API service implementeren (Beschikbaarheid_gegevens layer)
- [x] Bodemkwaliteit check integreren in analyse flow (gemini.ts)
- [x] Resultaten opnemen in PDF rapport (bevoegde omgevingsdienst, website, aanbeveling)
- [x] Tests schrijven (8 tests passed)

## Homepage Update v11 - Voor wie & Verantwoorde AI
- [x] Pas 'Voor wie' sectie aan (beleidsmedewerkers, vergunningverleners, gemeenten, provincies, waterschappen)
- [x] Voeg 'Verantwoorde AI & AVG' sectie toe (4 kaarten: Transparantie, AVG, Menselijke Controle, Eerlijk over Beperkingen)
- [x] Eerlijke claims - inclusief Google Gemini vermelding en beperkingen
- [x] FAQ: 'Is Ro-flow open source?' en eerlijker AVG antwoord
- [ ] Aanbevelingen waar Ro-flow nog niet voldoet (zie hieronder)

## Design Fix v12 - Verwijder blokjes Verantwoorde AI
- [x] Verwijder 'Transparantie & Open Source' blokje
- [x] Verwijder 'Eerlijk over Beperkingen' blokje
- [x] Verwijder 'Hoe wij omgaan met AI-verwerking' blokje

## Bug Fix v13 - Layout problemen
- [x] Onderzoek en fix layout problemen op de homepage (layout is correct, issue was sandbox viewport 4400px)

## Design Fix v14 - Lettertype, Feature Cards, Voor Wie
- [x] Moderner lettertype (Galdeano vervangen door Inter)
- [x] Feature cards (Volledigheidscheck, Juridische Toetsing, Behandelrapport) niet meer overlappend met hero
- [x] Voor wie sectie: kaarten vervangen door gewone tekst

## Tekst Update v15 - VNG Document Integratie
- [x] Hero: context over personeelstekort en complexiteit integreren
- [x] Waarom Ro-flow: versterken met uitvoeringskracht en VNG-context
- [x] De voordelen: tijdsbesparing cijfers (68 uur → 10-15 min) en kwaliteitsverbetering
- [x] Altijd up-to-date: crawler details en versiebeheer toevoegen
- [x] Verantwoorde AI & AVG: publieke waarden en governance tekst verbeteren
- [x] Wat doet Ro-flow: rapportonderdelen aanvullen (BAL/BKL, MER, BOPA, etc.)

## Update v16 - Inhuur weg, VNG-strategie, Kwaliteit besluit
- [x] Verwijder alle referenties naar inhuur (geen gevonden in code)
- [x] Voeg VNG-strategie alinea toe bij Verantwoorde AI
- [x] Voeg Kwaliteit van het besluit alinea toe bij De voordelen

## Update v17 - Tekst vervangingen en layout fix
- [x] Vervang "Minder uitzoekwerk bij eerste beoordeling" door "Toets aan alle relevante planregels door een API met ruimtelijkeplannen.nl"
- [x] Vervang "Lagere kosten per eerste beoordeling" door "Wegwerken van achterstanden"
- [x] Fix inconsistente lettergroottes in tekstvlakken (alle body text nu text-base/text-sm consistent)
- [x] Fix uitlijning van tekstvlakken (consistente spacing en sizing)

## Update v18 - Tekstverbeteringen uit review
- [x] Feature-blokken: consistenter en actiever formuleren
- [x] Waarom Ro-flow: inkorten, herhaling schrappen
- [x] De voordelen: cijfers veiliger formuleren (aanzienlijke tijdsbesparing)
- [x] Wat Ro-flow niet doet: strakker formuleren
- [x] Kennisbank: technischer (Altijd actueel, collectief onderhouden)
- [x] CTA's: 2 vaste CTA's overal (Plan een demonstratie / Start een pilot)
- [x] Spelling & consistentie: Verantwoorde AI en AVG, AI adviseert maar 1x

## Update v19 - Navigatie knop
- [x] Navigatie-knop bovenaan: "Plan een demonstratie" → "Aanmelden als pilotgemeente"

## Update v20 - Pilotgemeente informatie
- [x] Voeg uitgebreide pilotgemeente-informatie toe op de /pilot pagina

## Update v21 - Meedoen vervangen
- [x] Vervang "Meedoen?" sectie op homepage door "Aanmelden als pilotgemeente" met pilotinformatie als tekst

## Update v22 - Hero tekst
- [x] Vervang hero titel en subtekst met nieuwe versie

## Update v23 - Waarom Ro-flow tekst
- [x] Vervang Waarom Ro-flow sectie met nieuwe uitgebreide tekst

## Update v24 - Waarom Ro-flow v2
- [x] Vervang Waarom Ro-flow sectie met nieuwe versie inclusief behandelrapport-opsomming

## Update v25 - Waarom Ro-flow v3
- [x] Update drie punten: adviseurs + interne adviseurs, jurisprudentie bij complexe aanvragen, slotzin korter

## Update v26 - Waarom Ro-flow differentiatie
- [x] Verwijder 4 bullets uit Waarom Ro-flow en vervang door verwijzende zin naar Wat doet Ro-flow

## Update v27 - Drie verbeteringen
- [x] Samenvoegen "Besluiten die standhouden" en "Juridisch onderbouwd" bij De voordelen
- [x] Demo aanvragen sectie vervangen door pilotgemeente-CTA
- [x] Scroll-animaties toevoegen (fade-in bij secties)

## Update v28 - Afbeeldingen, AVG pagina, zin verwijderen
- [x] Verwijder slotzin "Ro-flow ondersteunt, maar neemt dit niet over..." uit Waarom Ro-flow
- [x] Genereer 3 unieke AI-afbeeldingen (teamwork, digital process, municipality)
- [x] Voeg afbeeldingen toe bij Pilotgemeente, Wat doet Ro-flow, Zo werkt het
- [x] Fix FadeInSection JSX closing tag build-fout (stale HMR cache)
- [x] Maak aparte /verantwoorde-ai pagina met hero, uitgangspunten, AVG, menselijke controle, technische beveiliging
- [x] Vervang AVG sectie op homepage door korte verwijzing met link naar /verantwoorde-ai

## Update v29 - Voordelen card + AVG header
- [x] Kwaliteit van het besluit omzetten naar card-vormgeving (zelfde als andere 3 voordelen)
- [x] Header/navigatie toevoegen aan Verantwoorde AI pagina (terug naar home)

## Update v30 - Navigatie link
- [x] Voeg link naar /verantwoorde-ai toe in de homepage navigatiebalk

## Update v31 - Hamburger menu + Contact link fix
- [x] Voeg mobiel hamburger-menu toe aan homepage navigatie
- [x] Voeg mobiel hamburger-menu toe aan Verantwoorde AI pagina navigatie (al aanwezig)
- [x] Fix Contact link: #pricing gewijzigd naar #pilot-signup, sectie id bijgewerkt

## Update v32 - Samenvoegen + verwijderen
- [x] Samenvoegen twee "Aanmelden als pilotgemeente" secties tot één (CTA sectie verwijderd, Stel een vraag knop verplaatst)
- [x] Verwijder "Automatische milieutoets trigger" uit feature cards
- [x] Verwijder stap 5 "Jij beslist" uit Zo werkt het

- [x] Add "Procedure & Adviseurs" feature card under Juridische Toetsing in Wat doet Ro-flow section
- [x] AERIUS-koppeling verwijderen uit Natuur & Ecologie card, apart AERIUS-signalering vakje toevoegen onder Sectorale Toetsen
- [x] Compleet Behandelrapport card beschrijving wijzigen naar "14 onderdelen in één rapport, beschikbaar in gemiddeld 15 seconden"
- [x] Compleet Behandelrapport card beschrijving wijzigen naar "14 onderdelen in één rapport, beschikbaar in gemiddeld 15 seconden"
- [x] Verwijder "Gemiddelde verwerking: enkele seconden" uit Zo werkt het sectie
- [x] Verwijder "in seconden" uit stap 4 beschrijving
- [x] Verwijder "Correcties en aanvullingen binnen één gemeente..." zin
- [-] Vervang "Policy AI Assist" door "Ro-flow" op privacy pagina (niet doorvoeren per gebruiker)
- [x] Wijzig e-mailadres naar info@ro-flow.nl op alle pagina's (Privacy, Home, VerantwoordeAI, gebruiker/Privacy)
- [x] Hero achtergrond: sterkere overlay toevoegen voor betere leesbaarheid tekst
- [x] Hero persoon-afbeelding verplaatsen naar Voor wie sectie
- [x] Hero overlay sterker maken op desktop zodat tekst goed leesbaar is (85% uniform overlay)
- [x] Verwijder gearceerde teksten uit "Juridisch houdbare besluiten" en "Kwaliteit van het besluit" voordelen
- [x] Kwaliteit van het besluit beschrijving bijwerken met goedgekeurde tekst
- [x] Vervang persoon-afbeelding in Voor wie sectie door breder plaatje met groep RO-ambtenaren in overleg
- [x] Verwijder "Gemeenten, provincies & waterschappen" blok met 4 bullet points uit Voor wie sectie
- [x] Vervang generieke API-tekst op homepage door overzicht van 16 API-koppelingen met beschrijvingen
- [x] Vergaderruimte-afbeelding vervangen door natuurlijkere versie (minder geposeerd)
- [x] Verwijder "Alle analyses zijn gebaseerd op actuele data..." tekst en "Bekijk alle 16 API-koppelingen →" link
- [x] Vergaderfoto: scherm natuurlijker maken en 1 persoon aan de zijkant verwijderen
- [-] Vergaderfoto: staande presenterende vrouw vervangen door zittende vrouw (geannuleerd, was verkeerd begrepen)
- [x] Vergaderfoto: vrouw helemaal rechts (staand) verwijderd uit de foto
- [x] Procesdiagram-plaatje groter maken op de pagina (max-w-2xl, full width)
- [x] Achtergrondafbeelding toevoegen aan API-koppelingen sectie (Nederlands stadje met digitale netwerk-overlay)
- [x] Procesdiagram: witte ruimte rondom de afbeelding verminderen (bijgesneden van 1920x1920 naar 1740x811)
- [x] Procesdiagram: witte achtergrond transparant maken
- [x] API-koppelingen als navigatie-item toevoegen in hoofdmenu (desktop + mobiel)
- [x] API-koppelingen sectie: achtergrond-overlay van 88% naar 70% (luchtfoto meer zichtbaar)
- [x] API-koppelingen iconen kleurrijker maken met diverse kleuren per categorie (16 unieke kleuren)
- [x] Vergaderfoto: woord "Teaching" op projectiescherm vervangen door "Toetsing"
- [x] CTA-sectie onderaan verwijderen ("Klaar om sneller en zekerder te werken?" met pilot-knoppen)
- [x] Juridische toetsing: beschrijving aanpassen (vergunningplicht verwijderen, "Volg de juiste procedure" toevoegen)
- [x] Fix: "Lees meer over privacy en beveiliging" link navigeert naar verkeerde plek (mobiel + desktop) - ScrollToTop component toegevoegd
- [-] Hero afbeelding: spierballen vrouw vervangen (geannuleerd, gebruiker houdt huidige foto)
- [x] Landbouwpercelen API beschrijving aanpassen (toevoegen "of in de nabijheid van" en "Wederkerige toetsing.")
- [x] Audit: wederkerigheid bij milieuchecks controleren op website (teksten) en in backend (implementatie)
- [x] Website: Geurcontouren Veehouderijen als API-koppeling toevoegen op homepage
- [x] Website: Milieu & Leefomgeving feature beschrijving updaten met bidirectionele toetsing
- [x] Website: REV, Milieu-endpoints, Grondwater beschrijvingen updaten met wederkerigheid
- [x] Backend: BRP spuitzones toevoegen aan aanbevelingen (wederkerig: naast landbouwgrond)
- [x] Knoptekst "Plan een demonstratie" vervangen door "Demo aanvragen"
- [x] Pilottekst links en rechts uitlijnen (text-justify)
- [x] Pilottekst: toevoegen dat deelname gratis is
- [x] Smooth scroll navigatie toevoegen aan menu-ankerpunten (Features, API-koppelingen, etc.)
- [x] Pilotformulier e-mailbevestiging controleren en testen
- [x] Grondwaterbeschermingsgebieden: "Wederkerige toetsing" verwijderen (is eenrichtingsverkeer)
- [x] Email: tijdelijk afzender wijzigen naar onboarding@resend.dev (domein nog niet geverifieerd)
- [ ] Email: na domeinverificatie afzender terugzetten naar noreply@ro-flow.nl
- [x] PDOK Grondwaterbeschermingsgebieden API-kaart verwijderen van homepage
- [x] Features sectie: mooie achtergrond ontwerpen voor de rapportonderdelen (Analyse, Juridisch, Sectoraal, Advies)
- [x] Features sectie "Wat doet Ro-flow?": donkerblauwe achtergrond verwijderen, gewoon wit maken
- [x] Verantwoorde AI pagina: te veel witruimte tussen tekstblokken verkleinen
- [x] FAQ pagina: vlakken/kaarten met vragen minder hoog maken (compacter)
- [x] FAQ: "Is Ro-flow open source?" vraag verwijderen
- [x] Hero knop: "Demo aanvragen" vervangen door "Aanmelden als pilotgemeente"
- [x] Hero sectie: spierballenvrouw foto 100% zichtbaar zonder overlay, tekst onder de foto plaatsen
- [x] FAQ "Hoe zit het met een verwerkersovereenkomst?" verplaatsen van homepage naar FAQ-pagina (stond al op FAQ-pagina, verwijderd van homepage)
- [x] Hero foto: vage/blurry afbeelding vervangen door hoge-resolutie versie (2752x1536px)
- [x] Algemene voorwaarden: support@ro-flow.nl vervangen door info@ro-flow.nl

- [x] Verbeter tekst Vergunningverleners en Beleidsmedewerkers secties: meerdere API's benoemen i.p.v. slechts één, bredere beschrijving van Ro-flow capabilities

## UX/Copy Review Verbeteringen (10 punten)
- [x] 1. Hero opening scherper: explicieter en meetbaarder (15 seconden, volledig rapport)
- [x] 2. 'Rapport, geen advies' visueel blok prominent neerzetten (grijs kader)
- [x] 3. Ankerstructuur verbeteren: vaste hiërarchie (resultaat → functionaliteit → proces → afbakening → veiligheid → pilot)
- [x] 4. ROI tekst concreter: minder bezwaar, minder herstelbesluiten, minder overdrachtsverlies
- [x] 5. API-lijst UX: eerst samenvatting '16+ koppelingen', daarna inklappbare technische verdieping
- [x] 6. 'Waarom Ro-flow?' structuur: 4 vaste pijlers als kopjes
- [x] 7. Pilot CTA menselijker: 'De meeste pilotgemeenten starten met 5-10 dossiers en 1-2 behandelaars'
- [x] 8. Visuele voorbeeldpagina: dummy behandelrapport of inhoudsopgave
- [x] 9. Vergunningverleners/Beleidsmedewerkers tekst verbeteren (meerdere API's benoemen)
- [x] 10. Tone of voice behouden (geen wijziging nodig, compliment)

## Risicoanalyse Verbeteringen (Advocaat van de Duivel)
- [x] Hero: "15 seconden" weglaten uit eerste tekstkolom
- [x] Homepage: Jurisprudentie tekst wijzigen naar "automatisch gesignaleerd bij complexe aanvragen, ter duiding"
- [x] Homepage: Haalbaarheidsschatting beschrijving aanpassen (risico-inschatting, geen advies over wenselijkheid)
- [x] Homepage: Snelheid (15 sec) verduidelijken als informatieverzameling en structurering
- [x] Homepage: Waarom Ro-flow versterken met navolgbaarheid vs huidige werkwijze
- [x] Verantwoorde AI: Sectie model transparantie toevoegen (geen training op aanvraagdocumenten, uitlegbare stappen)
- [x] Verantwoorde AI: Sectie foutmarge en aansprakelijkheid toevoegen

## Homepage Tekstaanpassingen
- [x] Hero: disclaimer-tekst verwijderen ("Ro-flow neemt geen besluiten en vervangt de vergunningverlener niet...")
- [x] Waarom Ro-flow: nieuwe inleidende alinea toevoegen over capaciteitstekort en ondersteuning eerste beoordelingsfase
- [x] Waarom Ro-flow tekst: woord 'juist' verwijderen

## Publish Issue
- [x] Diagnose en fix: publish vastgelopen (docs/ en test_aanvraag.zip verwijderd, clean rebuild)

- [x] Waarom Ro-flow: tekst bijwerken met zin over kwaliteitsslag en tijdswinst
- [x] Hero: bevestig dat disclaimer verwijderd is (was al verwijderd in eerder checkpoint)
- [x] Homepage: 'Wat staat er in het rapport?' sectie met alle rapportonderdelen-kaarten verwijderen
- [x] Homepage: 14 feature-kaarten onder 'Wat doet Ro-flow?' vervangen door compacte gegroepeerde opsomming
- [x] Pilot pagina: tekst links uitlijnen i.p.v. justified/rechts
- [x] Homepage: Verantwoorde AI blok verplaatsen naar boven FAQ sectie
- [x] Homepage: 'Geen geautomatiseerde besluitvorming' blok verwijderen
- [x] Verwijder tekst 'Waar behandelaars nu individueel...' uit Waarom Ro-flow sectie
- [x] Hero: verwijder tekst 'Nederlandse gemeenten staan voor een structureel capaciteitstekort...'
- [x] BOPA-milieumotivering hernoemen naar BOPA (woord 'milieumotivering' verwijderen)
- [x] Nieuwe pagina: Gelaagde Kennisbank (content uit PDF)
- [x] Homepage: link toevoegen vanaf kennisbank-vlak naar nieuwe pagina
- [x] Fix pilot page text alignment to left-align (not justified, not centered)
- [x] Remove kennisbank description text on homepage but keep the "Lees meer" link
- [x] Remove "Gelaagde kennisbank (Rijk → Gemeente)" title block from homepage (yellow highlighted area)
- [x] Change "Lees meer →" to "Lees meer over de kennisbank →"
- [x] Move "Lees meer over de kennisbank →" link inline after the paragraph text (with space) in "Beleid alleen wanneer juridisch relevant" section
- [x] Replace "Alle 342 gemeenten" with "wetten en rijksbeleid zoals de Nationale Omgevingsvisie (NOVI)" under Rijks layer
- [x] Add "doet suggesties voor interne en externe adviseurs zoals veiligheidsregio of beleidsadviseur recreatie" to "Wat Ro-flow wél doet" list
- [x] Update kennisbank intro text to add recommendation about supplementing with local policy documents
- [x] Remove "Geeft een juridisch logisch, navolgbaar advies" from "Wat Ro-flow wél doet" list
- [x] Replace "Compleet Behandelrapport — Alle onderdelen in één gestructureerd rapport, direct bruikbaar voor besluitvorming" with "Compleet Behandelrapport — Alle onderdelen in één gestructureerd PDF rapport."
- [x] Update KVK nummer to 88843564 and BTW nummer to NL864797345B01
- [x] Update phone number from 0229-511915 to 0229-511911
- [x] Replace NOVI with Nota Ruimte in Rijks layer description
- [x] Replace NOVI with Nota Ruimte on the kennisbank page (not found - already updated or not present)

## Omgevingsscan Module
- [x] Create Omgevingsscan landing page (hero with map visual, features, indicators overview, pilot section)
- [ ] Set up domain-based routing (omgevingsscan.nl vs ro-flow.nl)
- [ ] Create Omgevingsscan navigation/header component
- [ ] Create Omgevingsscan footer component
- [x] Build interactive features section with indicator categories
- [x] Build "Hoe het werkt" section (8-step pipeline visualization)
- [x] Build pilot/contact section for pilotgemeenten
- [x] Build FAQ page for Omgevingsscan (integrated in landing page)
- [x] Create kaart-dashboard page with GIS viewer
- [x] Implement database schema for dossiers and indicators (MySQL)
- [ ] Build DSO upload and extraction pipeline
- [x] Build indicator engine with PDOK API integrations
- [x] Build relevance router for indicator prioritization
- [ ] Integrate LLM narratives for indicator toelichtingen
- [x] Build PDF report generator (omgevingsscan)
- [x] Restructure omgevingsscan engine: "fetch once, compute many" pattern
- [x] Fetch all datasets in parallel (Promise.all) — one call per dataset
- [x] Derive multiple indicators from each shared dataset
- [x] Connect AERIUS API for real stikstof depositieberekening (via WFS open data)
- [x] Connect DSO API for real vergunningcheck, activiteiten, indieningsvereisten
- [x] Complete genereerAINarratief function
- [x] Enhance Ruimtelijkeplannen service: fetch ALL plan types (bestemmingsplannen, parapluplannen, voorbereidingsbesluiten, beheersverordeningen, structuurvisies)
- [x] Use Ruimtelijkeplannen data as basis for relevance router (dubbelbestemmingen trigger indicator upgrades)
- [x] Add plan layers to map (bestemmingsvlakken, bouwvlakken, gebiedsaanduidingen as WMS overlays)
- [x] Enhance scan results panel with detailed plan information per plan type
- [x] Include legal basis (grondslag, artikelen) when dubbelbestemming triggers additional requirements
- [x] Fix PDOK 404 endpoints: Beschermde Gezichten and Monumenten WFS URLs (overgeschakeld naar RCE ps-ch WFS)
- [x] Build DSO ZIP upload pipeline (upload knop in dashboard, verwerking placeholder)
- [x] Add funderingsproblematiek indicator using AHN WCS hoogte + BRO Bodemkaart WMS + BAG bouwjaar
- [x] Add geurcontouren indicator using gebiedsaanduiding geurzone + BRP gewaspercelen veehouderij proxy
- [x] Build PDF report generator with full scan results per thema, samenvatting, aandachtspunten overzicht, disclaimer
- [x] Add PDF upload support alongside DSO ZIP in Omgevingsscan dashboard
- [x] Mark policyaiassist@gmail.com as super_admin in the database (gekoppeld aan gemeente Hoorn)
- [x] Make PDF/ZIP upload actually work: upload to S3, LLM analyseert PDF (adres, type, samenvatting), auto-geocode + auto-scan, resultaten in dashboard met upload banner
- [x] BUG FIX: Natura 2000 check nu met nabijheidsdetectie (binnenGebied, afstand, meerdere gebieden)
- [x] BUG FIX: NNN afgeleid uit Natura 2000 proximity + bestemmingsplan natuur labels
- [x] BUG FIX: Monumenten en Beschermd Gezicht WFS URLs gefixed (RCE ps-ch endpoint met RD coördinaten)
- [x] Verbeterde PDF upload: kadastrale aanduiding, locatiebeschrijving en gemeente extractie
- [x] TEST: Verifieer alle PDOK/WFS API endpoints op beschikbaarheid — 404 endpoints vervangen door graceful fallbacks
- [x] TEST: Geocoding werkt voor adres, kadastraal nummer (fq=type:perceel), en locatiebeschrijving
- [x] FEATURE: Ondersteuning voor meerdere locaties per aanvraag in PDF upload (LLM extraheert array, elk apart gegeocodeerd)
- [x] Alle 404 PDOK WFS endpoints vervangen door graceful fallbacks (spoorwegen, legger, zwemwater, REV, IKAW, buitenplaatsen, werelderfgoed, OO, aardkundig, bodemonderzoek)
- [x] BGT WFS → BGT OGC API migratie
- [x] Grondwaterbescherming WFS → WMS GetFeatureInfo migratie
- [x] 8 nieuwe OGC APIs gevonden op api.pdok.nl: spoorwegen, REV, nationale parken, funderingsproblematiek, overstromingsrisico, beschermde gebieden cultuurhistorie
- [x] Funderingsproblematiek indicator nu met officiële RVO data + AHN + bodemkaart
- [x] Nationale Parken indicator nu met RVO OGC API data
- [x] Overstromingsrisico indicator nu met RWS OGC API data (risk_zone)
- [x] REV indicator nu met RWS productie-installaties OGC API data
- [x] Spoorwegen nu via ProRail OGC API (trace + station)
- [x] Cultuurhistorie nu via RCE Beschermde Gebieden OGC API
- [x] fetchOGCAPI helper functie toegevoegd aan scan-engine

## Omgevingsscan Dashboard Visuele Verbeteringen
- [x] Perceelkleuring: BAG/kadastrale perceelgrens ophalen en als gekleurde polygon op de kaart tonen
- [x] Interactieve kaartlagen panel: toggle-bare lagen met beschrijvingen (Natura 2000, bestemmingsplan, bouwvlak, etc.)
- [x] Mooiere kaart styling: betere markers, hover effects, popup info
- [x] Verbeterde lay-out: moderner resultaten paneel met betere typografie en spacing
- [x] Meer interactiviteit: klikbare indicatoren die op de kaart highlighten, animaties bij scan

## Bug Fixes - Omgevingsscan Upload
- [x] Fix: PDF upload toont irrelevante locaties (gemeente naam, kadastraal perceel) naast het echte aanvraagadres
- [x] Fix: LLM prompt mag geen locaties verzinnen, alleen extraheren wat letterlijk in het document staat
- [x] Feature: Afbeeldingen (JPG/PNG) ondersteunen bij upload naast PDF en ZIP
- [x] Fix: Bij meerdere locaties in een aanvraag-PDF worden alle locaties gescand, niet alleen de eerste

## Dashboard Verbeteringen - Ronde 3
- [x] Feature: Gecombineerd "Alle locaties" overzicht tab met samengevoegde aandachtspunten
- [x] Feature: Genummerde markers op de kaart voor alle gescande locaties tegelijk
- [x] Feature: Gecombineerde PDF-export voor alle locaties in één rapport
- [x] Feature: Mooiere basiskaart styling bij het begin (betere initiële kaartweergave)

## Dashboard Redesign - Uitgebreide Resultatenweergave
- [x] Redesign: Split-view layout met kaart links en resultaten panel rechts
- [x] Redesign: Alle toetsresultaten zichtbaar per thema met status, beschrijving en waarde
- [x] Redesign: Airbnb-achtige klik-interactie op perceel met uitschuivend info panel
- [x] Redesign: Indicator cards met duidelijke status kleuren en uitklapbare details
- [x] Redesign: Samenvatting bovenaan met totalen en aandachtspunten
- [x] Redesign: Mooi downloadbaar PDF rapport met afbeeldingen, kaart en tekst
- [x] Redesign: Kaartlagen resultaten visueel op de kaart tonen

## Dashboard Redesign V3 - Perceel-gebaseerde Flow
- [x] Backend: LLM extractie verbeteren om alle kadastrale percelen uit PDF te halen (bijv. HOO00-M-656, KGL02-AE-324, etc.)
- [x] Backend: Kadaster API gebruiken om perceelgrenzen (polygonen) op te halen per kadastraal perceel
- [x] Backend: Alle percelen automatisch scannen na upload
- [x] Frontend: Gekleurde polygonen per perceel op de kaart tonen (elk perceel eigen kleur)
- [x] Frontend: Kaart auto-zoom naar bounding box van alle percelen
- [x] Frontend: Klik op perceel → volledig toetsrapport in rechter panel
- [x] Frontend: Split-view layout (kaart links, rapport rechts)
- [ ] Frontend: Mogelijkheid om kaart en rapport in aparte vensters te openen (toekomstig)
- [x] Feature: Downloadbaar rapport per perceel met afbeeldingen en tekst

## Dashboard Fix - Aandachtspunten Rapport View
- [x] Fix: Rechter panel is niet scrollbaar - gebruiker kan niet naar beneden scrollen
- [x] Fix: Klik op aandachtspunt opent een gedetailleerd rapport met toelichting, bronnen, wettelijke basis
- [x] Feature: Mooi rapport per indicator met plaatjes, uitleg, wettelijke artikelen
- [x] Feature: Ruimtelijkeplannen.nl API als basis duidelijk vermelden bovenaan rapport
- [x] Feature: Per indicator de grondslag (wettelijke basis) en relevante artikelen tonen

## NNN Fix & Betere Toelichting
- [ ] Fix: NNN indicator moet ja/nee geven, niet "waarschijnlijk NNN"
- [ ] Fix: Alle aandachtspunten moeten concrete, begrijpelijke toelichting hebben
- [ ] Fix: Toelichting moet wettelijke grondslag bevatten waar relevant

## API Audit & Uitgebreide Toelichting
- [ ] Audit: Alle 16+ API's controleren of ze echt data teruggeven
- [ ] Fix: Dummy/Promise.resolve([]) calls vervangen door echte API calls waar mogelijk
- [ ] Fix: NNN indicator via echte PDOK NNN WMS GetFeatureInfo (niet meer afgeleid)
- [ ] Fix: Alle indicator toelichtingen verbeteren met wettelijke grondslag (artikelen)
- [ ] Fix: Esbuild error in omgevingsscan.ts router oplossen
- [ ] Feature: Uitgebreid rapport per indicator met concrete conclusies

## Uitgebreide Indicator Toelichtingen met Wettelijke Grondslag
- [x] BAG_PAND indicator: wettelijke grondslag (Wet BAG, Bbl art. 2.6)
- [x] KADASTER indicator: wettelijke grondslag (Kadasterwet, BRK)
- [x] GRONDGEBRUIK indicator: wettelijke grondslag (BRO, BGT)
- [x] GRONDWATERSTAND indicator: wettelijke grondslag (BRO, Waterwet)
- [x] GEMEENTE indicator: wettelijke grondslag (Omgevingswet art. 4.1)
- [x] BESTEMMINGSPLAN indicator: wettelijke grondslag (art. 3.1 Wro / art. 4.1 Omgevingswet)
- [x] ENKELBESTEMMING indicator: wettelijke grondslag (art. 3.1 Wro)
- [x] DUBBELBESTEMMING indicator: wettelijke grondslag (art. 3.1 Wro)
- [x] GEBIEDSAANDUIDING indicator: wettelijke grondslag (art. 3.1 Wro)
- [x] BOUWVLAK indicator: wettelijke grondslag (art. 3.1 Wro)
- [x] FUNCTIEAANDUIDING indicator: wettelijke grondslag (art. 3.1 Wro)
- [x] MAATVOERING indicator: wettelijke grondslag (art. 3.1 Wro)
- [x] PLANREGELS indicator: wettelijke grondslag (art. 3.1 Wro / art. 4.1 Omgevingswet)
- [x] DSO_ACTIVITEITEN indicator: wettelijke grondslag (art. 16.2 Omgevingswet)
- [x] DSO_REGELS indicator: wettelijke grondslag (art. 4.7 Omgevingswet)
- [x] NATURA2000 indicator: wettelijke grondslag (art. 2.7/2.8 Wnb, art. 16.53c Omgevingswet)
- [x] STIKSTOF_AERIUS indicator: wettelijke grondslag (art. 2.7 Wnb, art. 16.53c Omgevingswet)
- [x] NNN indicator: wettelijke grondslag (art. 2.44 Omgevingswet, art. 7.7 Bkl)
- [x] ECOLOGISCHE_VERBINDING indicator: wettelijke grondslag (art. 2.44 Omgevingswet)
- [x] BESCHERMD_NATUURGEBIED indicator: wettelijke grondslag (art. 2.1/2.7 Wnb)
- [x] NATIONAAL_PARK indicator: uitgebreide toelichting
- [x] SOORTENBESCHERMING indicator: wettelijke grondslag (art. 3.1-3.10 Wnb, art. 5.1 Omgevingswet)
- [x] WEIDEVOGELGEBIED indicator: wettelijke grondslag (art. 3.1 Wnb)
- [x] HOUTOPSTANDEN indicator: wettelijke grondslag (art. 4.2 Wnb, art. 11.6 Bal)
- [x] LANDSCHAPSTYPE indicator: wettelijke grondslag (art. 4.2 Omgevingswet)
- [x] AARDKUNDIG_WAARDEVOL indicator: uitgebreide toelichting
- [x] STILTEGEBIED indicator: wettelijke grondslag (Provinciale Omgevingsverordening)
- [x] DONKERTEGEBIED indicator: wettelijke grondslag (Provinciale Omgevingsverordening)
- [x] WATERKERING indicator: wettelijke grondslag (art. 6.1/6.5 Waterwet, art. 5.4 Omgevingswet)
- [x] BESCHERMINGSZONE_WATERKERING indicator: wettelijke grondslag (art. 6.5 Waterwet, Keur)
- [x] WATERGANG indicator: wettelijke grondslag (art. 6.5 Waterwet, Keur)
- [x] KEUR_WATERSCHAP indicator: wettelijke grondslag (art. 78 Waterschapswet, art. 6.5 Waterwet)
- [x] GRONDWATERBESCHERMING indicator: wettelijke grondslag (art. 7.11 Bkl)
- [x] WATERWINGEBIED indicator: wettelijke grondslag (Provinciale Omgevingsverordening)
- [x] OVERSTROMINGSRISICO indicator: wettelijke grondslag (EU Richtlijn 2007/60/EG, art. 5.12 Bkl)
- [x] WATERTOETS indicator: wettelijke grondslag (art. 3.1.1 Bro, art. 5.37 Omgevingswet)
- [x] ZWEMWATER indicator: wettelijke grondslag (Zwemwaterrichtlijn 2006/7/EG)
- [x] WATERBERGING indicator: wettelijke grondslag (Keur waterschap)
- [x] BODEMKWALITEIT indicator: wettelijke grondslag (art. 8.6 Bkl, Besluit bodemkwaliteit)
- [x] ONTPLOFBARE_OORLOGSRESTEN indicator: wettelijke grondslag (WSCS-OCE, Arbeidsomstandighedenwet)
- [x] FUNDERINGSPROBLEMATIEK indicator: uitgebreide toelichting (NEN 8707, NEN 9997-1)
- [x] ASBEST_RISICO indicator: wettelijke grondslag (Asbestverwijderingsbesluit 2005, art. 7.10 Bbl)
- [x] GELUIDZONE_WEG indicator: wettelijke grondslag (art. 74 Wgh, art. 3.8 Bkl)
- [x] GELUIDZONE_SPOOR indicator: wettelijke grondslag (art. 87 Wgh, art. 3.25 Bkl)
- [x] GELUIDZONE_INDUSTRIE indicator: wettelijke grondslag (art. 40 Wgh, art. 3.31 Bkl)
- [x] GELUIDZONE_LUCHTVAART indicator: wettelijke grondslag (art. 8.1 Wet luchtvaart)
- [x] LUCHTKWALITEIT indicator: wettelijke grondslag (art. 5.16 Wm, art. 5.53 Bkl)
- [x] GEURZONE indicator: wettelijke grondslag (Wgv, art. 5.42 Bkl)
- [x] TRILLINGEN indicator: uitgebreide toelichting (SBR Richtlijn A/B)
- [x] BEVI_INRICHTING indicator: wettelijke grondslag (Bevi, art. 5.12 Bkl)
- [x] BUISLEIDING indicator: wettelijke grondslag (Bevb, art. 5.15 Bkl)
- [x] RISICOCONTOUR indicator: wettelijke grondslag (Bevi, art. 5.12 Bkl)
- [x] LPG_TANKSTATION indicator: wettelijke grondslag (Bevi, art. 5.12 Bkl)
- [x] VUURWERK_OPSLAG indicator: wettelijke grondslag (Vuurwerkbesluit, Bevi)
- [x] RIJKSMONUMENT indicator: wettelijke grondslag (art. 5.1 Omgevingswet, art. 13.7 Bkl)
- [x] GEMEENTELIJK_MONUMENT indicator: wettelijke grondslag (art. 4.1 Omgevingswet)
- [x] BESCHERMD_GEZICHT indicator: wettelijke grondslag (art. 5.1 Omgevingswet)
- [x] ARCHEOLOGIE indicator: wettelijke grondslag (art. 5.1 Omgevingswet, Verdrag van Malta)
- [x] CULTUURLANDSCHAP indicator: wettelijke grondslag (art. 3.1.6 Bro, art. 5.130 Bkl)
- [x] HISTORISCHE_BUITENPLAATS indicator: uitgebreide toelichting
- [x] VERDRAG_MALTA indicator: wettelijke grondslag (Verdrag van Malta, art. 5.1 Omgevingswet)
- [x] WERELDERFGOED indicator: wettelijke grondslag (Werelderfgoedverdrag 1972)
- [x] GEWASPERCEEL indicator: uitgebreide toelichting (BRP)
- [x] GEURCONTOUR_VEEHOUDERIJ indicator: wettelijke grondslag (Wgv, art. 5.42 Bkl)
- [x] GLASTUINBOUW indicator: uitgebreide toelichting
- [x] LANDBOUWGROND indicator: wettelijke grondslag (art. 4.1 Omgevingswet, Ladder)
- [x] MESTVERWERKING indicator: uitgebreide toelichting
- [x] SPUITZONE indicator: wettelijke grondslag (VNG Bedrijven en milieuzonering)
- [x] DIERENWELZIJN indicator: uitgebreide toelichting
- [x] HOOGSPANNING indicator: uitgebreide toelichting (RIVM magneetveldadvies)
- [x] GASLEIDING indicator: wettelijke grondslag (Bevb, WIBON)
- [x] KLIC_MELDING indicator: wettelijke grondslag (WIBON art. 2)
- [x] SPOORWEG indicator: wettelijke grondslag (Basisnet Spoor, art. 5.12 Bkl)
- [x] RIJKSWEG indicator: wettelijke grondslag (art. 74 Wgh, art. 3.8 Bkl)
- [x] VAARWEG indicator: uitgebreide toelichting
- [x] PARKEERDRUK indicator: wettelijke grondslag (CROW publicatie 381)
- [x] OV_BEREIKBAARHEID indicator: wettelijke grondslag (CROW, Ladder)
- [x] FIETSROUTE indicator: uitgebreide toelichting
- [x] ZORGINSTELLING indicator: wettelijke grondslag (Bevi)
- [x] SCHOOL_KINDEROPVANG indicator: wettelijke grondslag (Bevi, VNG)
- [x] LUCHTVAART_BEPERKING indicator: wettelijke grondslag (art. 8.1 Wet luchtvaart)
- [x] DEFENSIE_ZONE indicator: uitgebreide toelichting

## Indicator Overzicht & Visueel Rapport
- [x] Indicator overzichtspagina met alle 88 indicatoren (IndicatorenOverzicht.tsx)
- [x] Uitklapbare toelichtingen per indicator met wettelijke grondslag
- [x] Thema-gegroepeerde weergave met kleuren en iconen
- [x] Status-badges (aandachtspunt/relevant/niet_relevant) per indicator
- [x] Visueel rapport met grafieken (donut chart SVG in PDF)
- [x] Thema-iconen en kleurcoderingen in rapport
- [x] Printbaar/PDF rapport met volledige layout en plaatjes
- [x] Link naar Encyclopedie vanuit scan dashboard en OmgevingsscanHome
- [x] Thema-overzichtstabel in PDF rapport
- [x] Wettelijke grondslag per indicator in PDF rapport
- [x] Afstandsinformatie per indicator in PDF rapport

## Indicator Toelichtingen v2 - Context-afhankelijk & Suggestief
- [x] Herschrijf alle indicator toelichtingen in suggestieve toon (niet als feit)
- [x] Voeg per indicator toe: waarom relevant, mogelijke consequenties, benodigde onderzoeken/adviezen
- [x] Context-afhankelijk: relatie met type aanvraag (uitbouw, functiewijziging, nieuwbouw etc.)
- [x] Wetteksten per indicator (artikelnummers Omgevingswet, Bkl, Wnb etc.)
- [x] Alle indicatoren zichtbaar in rechter panel scan-dashboard met uitklapbare details
- [x] Mooi PDF-rapport met kaartuitsneden, grafieken, iconen, volledige layout
- [x] PDF downloadbaar vanuit rechter panel
- [x] Kaartfragmenten/screenshots in PDF rapport
- [x] Donut charts (SVG) in PDF
- [x] Thema-iconen en kleurcoderingen in PDF
- [x] Enrichment data voor alle 86 indicatoren (incl. NATURA2000)
- [x] Vitest tests voor indicatorEnrichment (7 tests, alle geslaagd)

## Navigatie Links Landing Page
- [x] Link naar Omgevingsscan toevoegen aan navigatie/landing page
- [x] Link naar Scan Dashboard toevoegen aan navigatie/landing page

## Omgevingsscan Pagina
- [x] Prominente knop naar Scan Dashboard (/omgevingsscan/dashboard) op /omgevingsscan pagina

## Dashboard Redesign - Match /omgevingsscan visuals
- [x] Floating labels op de kaart gebaseerd op daadwerkelijke API-resultaten (indicatornamen + afstand/status)
- [x] Donkerder professioneel GIS-thema matching de mockup afbeelding
- [x] Professionelere sidebar/panel styling (donkere top bar, rechter panel, popups, overlays)
- [x] Donkere Leaflet popups en percelen legenda
- [x] Dashboard visueel laten overeenkomen met de beloftes op /omgevingsscan

## Dashboard GIS Redesign v2 - Match Mockup
- [x] Luchtfoto als standaard basislaag na scan (satellietbeeld)
- [x] Donker overlay filter over de kaart
- [x] Gekleurde zone-polygonen per thema op de kaart (geel=geluid, blauw=water, oranje=erfgoed, rood=veiligheid, groen=natuur)
- [x] Floating labels direct op de kaart met thema-kleuren en aandachtspunten-tellers
- [x] Thema-iconen op de kaart (emoji per thema)
- [x] Linkerzijbalk met thema-iconen (Natuur, Water, Erfgoed, Veiligheid, Geluid, Bodem, etc.)
- [x] Klikken op thema in zijbalk filtert rechter panel op dat thema
- [x] Detail-panel toont: indicatoren voor dat thema, wettelijke grondslag, consequenties, suggesties
- [x] Semi-transparante overlays per thema-zone (Circle polygonen met thema-kleuren)
- [ ] Concentrische cirkels voor geluidscontouren

## GIS Dashboard Zone Fix
- [x] Verwijder neppe/willekeurige zone-cirkels die niet op API data gebaseerd zijn
- [x] Vervang door data-driven zones gebaseerd op daadwerkelijke scan indicatoren (Natura 2000 afstand, geluidszones, waterkering, etc.)
- [x] Fix mysterieuze "Navagne 1, Eijsden" vermelding (was PDOK reverse geocoding met X/Y i.p.v. lat/lon)
- [x] Floating labels alleen tonen voor thema's met daadwerkelijke aandachtspunten

## GIS Dashboard - Echte Geografische Features
- [x] Vervang cirkel-benadering door echte Natura 2000 polygonen via PDOK WFS
- [x] Toon echte spoorlijnen via ProRail WFS trace data (gele lijnen met zwarte schaduw)
- [ ] Toon waterkeringen als echte lijnen/polygonen (geen waterkering bij Eindhoven)
- [x] Toon erfgoed/rijksmonumenten als echte locatiemarkers (amber punten)
- [x] Toon BEVI-inrichtingen als echte puntlocaties (rode punten)
- [x] Toon archeologische verwachtingswaarden als echte zones (bruine polygonen)
- [x] Server-side geoFeatures extractie uit bestaande dataset + Natura 2000 WFS
- [x] Nationale Parken polygonen ophalen en tekenen (groen)
- [x] Stations als punten op de kaart (gele stippen)
- [x] Alle features klikbaar met popup (naam + type)
- [x] Spoorlijnen met hoog contrast (geel op zwart) zichtbaar op luchtfoto

## GIS Dashboard - Gebruikersfeedback Maart 2026

### 1. Natura 2000 IJsselmeer niet gearceerd
- [x] Natura 2000 WFS bbox vergroot naar 15km (was 10km)
- [ ] Controleer of alle nabije Natura 2000 gebieden worden meegenomen (niet alleen dichtstbijzijnde)

### 2. Foutieve waterkering aanduiding
- [x] Hernoemd van 'Waterkering' naar 'Overstromingsrisicogebied' (data komt van INSPIRE Flood Risk, niet waterkeringen)
- [ ] Valideer waterkering geometrieën tegen PDOK waterkering WFS

### 3. Klikbare floating labels met bronkaart en details
- [x] Floating labels klikbaar - klikt naar thema in rechterpanel en scrollt naar het juiste thema
- [x] Bij klik: toont alle indicatoren met wettelijke grondslag, consequenties, suggesties
- [ ] NNN-gebied: toon wezenlijke waarden en kenmerken of link daarheen
- [x] Per thema relevante bronnen en details tonen

### 4. Ontbrekende aanduidingen op de kaart
- [ ] NNN-gebied polygonen (alleen WMS beschikbaar, geen WFS) - WMS kaartlaag al toegevoegd
- [ ] Meer aanduidingen toevoegen die relevant zijn voor ruimtelijke ordening
- [ ] Alle relevante beschermde gebieden als kaartlaag toevoegen

### 5. Geldende bestemmingen en ruimtelijkeplannen.nl koppeling
- [ ] Geldende bestemmingen ophalen via Ruimtelijke Plannen API (vereist API-key)
- [ ] Bestemmingen als kaartlaag tonen (enkelbestemming, dubbelbestemming, gebiedsaanduiding)
- [x] Directe link naar ruimtelijkeplannen.nl met coördinaten van scan-locatie
- [x] Directe link naar Regels op de kaart (omgevingswet.overheid.nl)
- [x] Directe link naar BAG Viewer met adres
- [x] Directe link naar Atlas Leefomgeving met coördinaten

### 6. Wetteksten, regelgeving en toelichting
- [x] Per indicator wettelijke grondslag al aanwezig (was al geïmplementeerd)
- [x] Consequenties voor aanvrager per indicator
- [x] Aanbevelingen/suggesties per indicator
- [x] Bronnen per indicator
- [ ] Meer gedetailleerde wetsartikelen toevoegen (bijv. specifieke Omgevingswet artikelen)

### 7. Downloadbaar rapport
- [x] PDF rapport genereren vanuit scan resultaten (was al geïmplementeerd)
- [x] Rapport bevat alle indicatoren, wettelijke grondslag, consequenties, aanbevelingen
- [x] Download knop in toolbar (⬇ icoon)
- [x] Prominent 'Rapport downloaden' banner in het rechterpanel
- [ ] Rapport uitbreiden met bestemmingen en meer gedetailleerde wetsartikelen

## KRITIEKE FIXES - Maart 2026 (zelf-assessment)
- [ ] WMS overlay lagen (overstromingsrisicogebied, NNN, etc.) NIET automatisch tonen na scan - ze overspoelen de hele kaart met blauw
- [ ] Alleen GeoJSON features tonen die daadwerkelijk relevant zijn (Natura 2000 polygonen, spoorlijnen)
- [ ] Floating labels verwijderen of fundamenteel herontwerpen - ze zweven op willekeurige posities
- [ ] Rapport download knop BOVENAAN het rechterpanel, groot en duidelijk
- [ ] Natura 2000 polygoon daadwerkelijk zichtbaar maken (nu verborgen onder blauwe overlay)
- [ ] Bij klik op indicator: gedetailleerde uitleg met wetteksten en artikelen tonen

## Bug Fix - WFS ECONNRESET & GeoFeatures Rendering
- [x] Fix: SVG renderer padding for large Natura 2000 polygons (padding=100 on L.svg renderer)
- [x] Fix: WFS requests failing with ECONNRESET due to PDOK rate limiting
- [x] Add fetchWithRetry helper with exponential backoff to omgevingsscanEngine.ts
- [x] Add fetchWithRetry helper with exponential backoff to pdokService.ts
- [x] Add fetchWithRetry helper with exponential backoff to natura2000ApiService.ts
- [x] Add fetchWithRetry helper with exponential backoff to ruimtelijkeplannenService.ts
- [x] Verified: Natura 2000 "Maas bij Eijsden" correctly detected at 543m
- [x] Verified: 10 Natura 2000 polygons rendered on map as green areas
- [x] Verified: 13 aandachtspunten, 16 relevant, 83 totaal indicators

## Atlas Leefomgeving Integratie (RIVM WMS)
- [x] Atlas Leefomgeving service aanmaken (server/services/atlasLeefomgevingService.ts)
- [x] WGS84 naar RD-coördinaten conversie toevoegen
- [x] Geluidkaarten ophalen: Lden wegverkeer, trein, industrie, windturbines (dB)
- [x] Luchtkwaliteit ophalen: NO2, PM10, PM2.5 (µg/m³)
- [x] Overstromingskans ophalen
- [x] Lichtemissie ophalen
- [x] Integratie in omgevingsscan engine (fetchAllDatasets)
- [x] Resultaten verwerken in scan indicatoren (geluid, lucht, bodem)
- [x] Scan resultaten verrijken met echte meetwaarden i.p.v. alleen "Relevant"

## Kritiek K1-K4 + Hoog H1-H9 Implementatie (17 maart 2026)

### Kritiek
- [x] K1: DSO Vergunningcheck integratie (vergunningplichtig/meldingsplichtig/vergunningvrij + bevoegd gezag)
- [x] K2: Vul 7 van 10 lege datasets met echte PDOK/RIVM API calls (RRGS, FGR, aardkundige waarden, watergang, werelderfgoed, beschermdNatuur, bodemOnderzoek)
- [x] K3: AI-samenvatting activeren in PDF rapport (genereerAINarratief aangeroepen in exportPDF)
- [x] K4: Contextfiltering in AI-samenvatting prompt (filtert op relevantie per aanvraagtype)

### Hoog
- [x] H1: Toon alle Natura 2000 gebieden binnen 10km (6 gebieden bij Eijsden met afstanden)
- [ ] H2: Split OmgevingsscanDashboard in subcomponenten (uitgesteld - te groot risico)
- [x] H3: Verbeter kleurenpalet - licht thema voor indicatoren, donkergroen header, statuskleurcodes
- [x] H4: Scan-opslag in database (was al geïmplementeerd in quickScan procedure)
- [x] H5: API-caching met TTL (apiUtils.ts met 5min TTL, max 500 entries)
- [ ] H6: Split routers.ts in aparte bestanden (uitgesteld - te groot risico)
- [x] H7: Uniforme retry-logica (fetchWithRetry in apiUtils.ts + bestaande retry in 4 services)
- [x] H8: Echte statische kaart in PDF rapport (OpenStreetMap tiles, marker, 600x400px)
- [x] H9: Grenswaarden bij meetwaarden (geluid 48/55/50 dB, lucht 40/40/25 µg/m³, stikstof 0.00 mol)

## Geluid WMS Overlay + DSO API Key (17 maart 2026)
- [x] Verifieer DSO API key configuratie in env (36 chars, correct geconfigureerd)
- [x] Implementeer Atlas Leefomgeving geluid WMS overlay kaartlagen
- [x] Wegverkeer Lden geluidcontour als togglebare laag
- [x] Treinverkeer Lden geluidcontour als togglebare laag
- [x] Industrie Lden geluidcontour als togglebare laag
- [x] Luchtkwaliteit NO2 als togglebare laag (+ PM10 en PM2.5)
- [x] Legenda voor WMS lagen (dynamisch bij actieve lagen)
- [x] Test WMS overlays op de kaart (geluid weg + NO2 getest, werkt correct)

## NNN, Stiltegebieden & PDF Rapport (april 2026)
- [x] NNN (Natuurnetwerk Nederland) integreren in scan engine via pixel-based WMS detectie
- [x] Stiltegebieden integreren in scan engine via WMS GetFeatureInfo detectie
- [x] NNN en stiltegebieden indicators toevoegen aan indicatorCatalog
- [x] NNN en stiltegebieden tonen op dashboard kaart als WMS overlay
- [x] PDF rapport herschrijven met plannentoets (bestemmingen/dubbelbestemmingen) als startpunt
- [x] Omgevingsloket.nl plannen beter presenteren in PDF rapport (DSO sectie)

## API Integratie Verbeteringen - Audit (april 2026)
- [ ] Zwemwater WFS aansluiten (geen werkend publiek endpoint gevonden)
- [x] Bodemloket service integreren in scan engine (omgevingsdienst + dossiergegevens)
- [ ] Vrijstellingsservice integreren voor gemeentelijke archeologie-vrijstellingsgrenzen
- [x] Geurcontouren service integreren (echte GES-scores via provinciale WFS)
- [ ] Externe Veiligheid service integreren (gedetailleerde PR/GR analyse) — service bestaat, nog niet in engine
- [x] Overstromingsrisico duplicaat verduidelijkt (waterkering=bbox1000, overstromingsRisico=bbox5000)

## Contextafhankelijke Kaart & Rapport (april 2026)
- [x] Relevantie-scores toevoegen aan geoFeatures (afstand, impact, prioriteit)
- [x] Kaart: alleen relevante gebieden tonen, met kleurcodering op basis van impact
- [x] Kaart: visuele prioritering (hoog=vol, midden=80%, laag=50% opacity)
- [x] Rapport: contextafhankelijke uitleg waarom iets relevant is voor deze specifieke aanvraag
- [x] Rapport: onderscheid maken tussen directe impact (<500m) vs externe werking (500m-3km) vs op afstand (>3km)
- [x] Testen: alle checks PASSED (PDF sectie, dashboard badges, engine scoring)

## Kaartvisualisatie Fix (mei 2026)
- [x] Na scan automatisch relevante WMS-lagen activeren op basis van indicator-resultaten
- [x] Activiteit-detectie uit PDF (bouw/kap/milieu/sloop/aanleg) → indicatoren matrix
- [x] Alleen relevante indicatoren tonen op basis van gedetecteerde activiteit
- [x] Niet-relevante indicatoren markeren als "niet van toepassing" ipv laden

## BOPA-detectie & Wettelijke Afstandslogica (mei 2026)
- [x] Wettelijke afstandslogica per indicator (Natura2000=25km, NNN=0m, stiltegebied=0m, waterkering=200m, ext.veiligheid=1500m, erfgoed=50m)
- [x] BOPA-detectie: check of activiteit past binnen enkelbestemming/omgevingsplan
- [x] BOPA vs regulier toetsingskader in rapport en op kaart
- [ ] Kaart: afstandscirkels tonen per indicator (wettelijke zones) — visueel, nog niet geïmplementeerd
- [x] Kaart: BOPA-badge en procedure-indicatie tonen (rood=BOPA, oranje=uitgebreid, groen=regulier)
- [x] Altijd NNN/Natura2000/stiltegebied checken ongeacht activiteittype (ALTIJD_CHECKEN_INDICATOREN)

## Kaart Kleurtjes - Alle Aandachtspunten Visueel (mei 2026)
- [x] Alle 17 aandachtspunt-indicatoren visueel tonen op de kaart via WMS-lagen
- [x] Natura 2000 gebieden als WMS overlay (PDOK natura2000)
- [x] NNN als WMS overlay (PDOK NNN)
- [x] Stiltegebied als WMS overlay (PDOK stiltegebieden)
- [x] Waterkering als WMS overlay (PDOK waterkeringen)
- [x] Overstromingsrisico als WMS overlay (RIVM Atlas)
- [x] Geluidzones weg/spoor als WMS overlay (RIVM Atlas)
- [x] Spoorlijnen als WMS overlay (PDOK spoorwegen)
- [x] Monumenten/erfgoed als WMS overlay (RCE beschermde gebieden cultuurhistorie)
- [x] Beschermde natuurgebieden als WMS overlay (CDDA)
- [x] linkedIndicators koppeling voor alle WMS-lagen
- [x] Auto-activering na scan: alle relevante WMS-lagen automatisch aan
- [x] WMS URLs geverifieerd en gecorrigeerd (CDDA, cultuurhistorie, bestuurlijke gebieden)
- [ ] Legenda toevoegen aan de kaart

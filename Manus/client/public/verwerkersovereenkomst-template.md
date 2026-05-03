# Verwerkersovereenkomst

**Overeenkomst inzake de verwerking van persoonsgegevens**

---

## Partijen

**Verwerkingsverantwoordelijke:**  
[NAAM GEMEENTE]  
[ADRES]  
[POSTCODE EN PLAATS]  
Hierna te noemen: "de Gemeente"

**Verwerker:**  
Policy AI Assist (handelend onder de naam Ro-flow)  
Gevestigd te Nederland  
Hierna te noemen: "de Verwerker"

Gezamenlijk te noemen: "Partijen"

---

## Artikel 1 - Definities

In deze overeenkomst wordt verstaan onder:

**1.1 Persoonsgegevens:** Alle informatie over een geïdentificeerde of identificeerbare natuurlijke persoon, zoals bedoeld in artikel 4 lid 1 AVG.

**1.2 Verwerking:** Elke bewerking of geheel van bewerkingen met betrekking tot persoonsgegevens, zoals bedoeld in artikel 4 lid 2 AVG.

**1.3 AVG:** De Algemene Verordening Gegevensbescherming (Verordening (EU) 2016/679).

**1.4 Dienst:** De Ro-flow AI-behandelassistent voor de analyse van omgevingsvergunningaanvragen.

**1.5 Betrokkene:** De natuurlijke persoon op wie de persoonsgegevens betrekking hebben.

---

## Artikel 2 - Onderwerp en duur

**2.1** Deze verwerkersovereenkomst maakt onlosmakelijk deel uit van de hoofdovereenkomst tussen Partijen voor het gebruik van de Dienst.

**2.2** De Verwerker verwerkt persoonsgegevens uitsluitend ten behoeve van de uitvoering van de Dienst, te weten:
- Het analyseren van DSO-aanvraagbestanden
- Het genereren van behandelrapporten
- Het bijhouden van een archief van behandelde aanvragen

**2.3** Deze overeenkomst is van kracht gedurende de looptijd van de hoofdovereenkomst.

---

## Artikel 3 - Categorieën persoonsgegevens

**3.1** De Verwerker verwerkt de volgende categorieën persoonsgegevens:

| Categorie | Voorbeelden | Bewaartermijn |
|-----------|-------------|---------------|
| Identificatiegegevens | Naam aanvrager, zaaknummer | 10 jaar |
| Contactgegevens | E-mailadres behandelaar | Duur dienstverband |
| Locatiegegevens | Adres, kadastrale gegevens | 10 jaar |
| Projectgegevens | Omschrijving bouwplan, tekeningen | 10 jaar |

**3.2** Er worden geen bijzondere categorieën persoonsgegevens verwerkt in de zin van artikel 9 AVG.

---

## Artikel 4 - Verplichtingen van de Verwerker

**4.1** De Verwerker verwerkt persoonsgegevens uitsluitend op basis van schriftelijke instructies van de Gemeente, tenzij een wettelijke verplichting anders vereist.

**4.2** De Verwerker waarborgt dat personen die toegang hebben tot persoonsgegevens:
- Gebonden zijn aan geheimhouding
- Alleen toegang hebben voor zover noodzakelijk

**4.3** De Verwerker treft passende technische en organisatorische maatregelen, waaronder:
- Versleutelde verbindingen (TLS/HTTPS)
- Toegangscontrole op basis van rollen (RBAC)
- Logboekregistratie van verwerkingsactiviteiten
- Regelmatige beveiligingsupdates

**4.4** De Verwerker schakelt geen sub-verwerkers in zonder voorafgaande schriftelijke toestemming van de Gemeente.

**4.5** Huidige sub-verwerkers waarvoor toestemming wordt verleend:

| Sub-verwerker | Dienst | Locatie |
|---------------|--------|---------|
| Manus AI | Hosting infrastructuur | EU |
| TiDB Cloud | Database hosting | EU |
| Cloudflare | CDN en DDoS bescherming | EU/VS* |

*Met Standard Contractual Clauses (SCC) voor VS-transfers.

---

## Artikel 5 - Beveiligingsmaatregelen

**5.1** De Verwerker heeft de volgende beveiligingsmaatregelen geïmplementeerd:

**Technisch:**
- OAuth 2.0 authenticatie (geen wachtwoorden opgeslagen)
- HTTPS/TLS voor alle verbindingen
- Rate limiting ter voorkoming van misbruik
- Security headers (Helmet.js)
- Input validatie op alle API endpoints
- SQL injection bescherming via ORM

**Organisatorisch:**
- Toegang beperkt tot geautoriseerde medewerkers
- Logging van alle verwerkingsactiviteiten
- Incidentresponsplan aanwezig
- Jaarlijkse security review

---

## Artikel 6 - Datalekken

**6.1** De Verwerker meldt een datalek aan de Gemeente zonder onredelijke vertraging en waar mogelijk binnen 24 uur na ontdekking.

**6.2** De melding bevat minimaal:
- Aard van het datalek
- Categorieën en aantal betrokkenen
- Waarschijnlijke gevolgen
- Genomen en voorgestelde maatregelen

**6.3** De Verwerker verleent alle medewerking aan de Gemeente bij het voldoen aan meldplichten richting de Autoriteit Persoonsgegevens en betrokkenen.

---

## Artikel 7 - Rechten van betrokkenen

**7.1** De Verwerker ondersteunt de Gemeente bij het voldoen aan verzoeken van betrokkenen met betrekking tot:
- Recht op inzage (artikel 15 AVG)
- Recht op rectificatie (artikel 16 AVG)
- Recht op gegevenswissing (artikel 17 AVG)
- Recht op beperking (artikel 18 AVG)
- Recht op overdraagbaarheid (artikel 20 AVG)

**7.2** De Verwerker stelt de Gemeente in staat om binnen de wettelijke termijnen te reageren op verzoeken.

---

## Artikel 8 - Audits

**8.1** De Verwerker stelt de Gemeente in staat om audits uit te voeren of te laten uitvoeren door een onafhankelijke auditor.

**8.2** De Verwerker verleent medewerking aan audits en verstrekt alle benodigde informatie.

**8.3** De kosten van audits komen voor rekening van de Gemeente, tenzij uit de audit blijkt dat de Verwerker niet aan zijn verplichtingen voldoet.

---

## Artikel 9 - Beëindiging

**9.1** Bij beëindiging van de hoofdovereenkomst zal de Verwerker, naar keuze van de Gemeente:
- Alle persoonsgegevens retourneren in een gangbaar formaat, en/of
- Alle persoonsgegevens wissen en dit schriftelijk bevestigen

**9.2** De Verwerker bewaart geen kopieën van persoonsgegevens na beëindiging, tenzij wettelijk verplicht.

---

## Artikel 10 - Aansprakelijkheid

**10.1** De Verwerker is aansprakelijk voor schade veroorzaakt door verwerking in strijd met deze overeenkomst of de AVG.

**10.2** De aansprakelijkheid is beperkt tot het bedrag dat de Gemeente in de 12 maanden voorafgaand aan de schadeveroorzakende gebeurtenis aan de Verwerker heeft betaald.

---

## Artikel 11 - Slotbepalingen

**11.1** Op deze overeenkomst is Nederlands recht van toepassing.

**11.2** Geschillen worden voorgelegd aan de bevoegde rechter te Amsterdam.

**11.3** Wijzigingen in deze overeenkomst zijn slechts geldig indien schriftelijk overeengekomen.

---

## Ondertekening

**Namens de Gemeente:**

Naam: _______________________  
Functie: _______________________  
Datum: _______________________  
Handtekening: _______________________

**Namens Policy AI Assist:**

Naam: _______________________  
Functie: _______________________  
Datum: _______________________  
Handtekening: _______________________

---

*Dit is een standaard verwerkersovereenkomst. Gemeenten kunnen aanvullende bepalingen toevoegen op basis van hun specifieke eisen en beleid.*

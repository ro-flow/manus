# Testscan Zaandam Gasfabriekterrein — Resultaten

**Locatie:** Zaandam Gasfabriekterrein (52.4389, 4.8264)
**Gemeente:** Zaanstad
**Scanduur:** ~55 seconden
**Totaal indicatoren:** 60+
**GeoFeatures op kaart:** 62

## Bodemloket Integratie — GESLAAGD ✅

| Veld | Waarde |
|------|--------|
| Gevonden | Ja |
| Omgevingsdienst | Gemeente Zaanstad |
| Website beschikbaar | Ja |
| Dossier beschikbaar | Nee |
| URL | https://bodem.zaanstad.nl/ |
| Aanbeveling | Raadpleeg de bodemgegevens bij Gemeente Zaanstad via https://bodem.zaanstad.nl/ |

**BODEMKWALITEIT indicator:** status=relevant, waarde="Bevoegd gezag: Gemeente Zaanstad"
**rawData bevat:** volledige bodemloket response met omgevingsdienstNaam, URL, etc.

## Andere Bodem Indicatoren

| Indicator | Status | Waarde |
|-----------|--------|--------|
| BODEMKWALITEIT | relevant | Bevoegd gezag: Gemeente Zaanstad |
| OO | niet_relevant | Geen OO-verdacht gebied |
| FUNDERINGSPROBLEMATIEK | relevant | Beperkt risico: 100% panden vóór 1970 |
| ASBEST_RISICO | onbekend | Bouwjaar onbekend |

## Natuur Indicatoren

| Indicator | Status | Waarde |
|-----------|--------|--------|
| NATURA2000 | aandachtspunt | 7 gebieden binnen 10km, dichtstbij Polder Westzaan (1765m) |
| STIKSTOF_AERIUS | aandachtspunt | 1930.2 mol/ha/jr |
| NNN | niet_relevant | Niet binnen NNN |
| STILTEGEBIED | niet_relevant | Niet in stiltegebied |

## Veiligheid Indicatoren

| Indicator | Status | Waarde |
|-----------|--------|--------|
| BEVI_INRICHTING | aandachtspunt | 1 risicovolle inrichting binnen 1.5km |
| LPG_TANKSTATION | aandachtspunt | LPG-tankstation binnen 150m |
| RISICOCONTOUR | aandachtspunt | Risicocontouren mogelijk van toepassing |
| BUISLEIDING | niet_relevant | Geen buisleidingen binnen 200m |

## Milieu Indicatoren

| Indicator | Status | Waarde |
|-----------|--------|--------|
| GELUIDZONE_WEG | aandachtspunt | 59 dB Lden (grens: 48 dB) |
| GELUIDZONE_SPOOR | aandachtspunt | 32 dB Lden, spoorlijn binnen 200m |
| GEURZONE | niet_relevant | Geen geurzone (correct voor stedelijk gebied) |
| LUCHTKWALITEIT | relevant | NO₂: 16.8, PM10: 16.3, PM2.5: 8 µg/m³ |

## Geurcontouren — Correct negatief ✅

Zaandam is geen veehouderijgebied, dus terecht geen geurcontour gedetecteerd.
rawData bevestigt: binnenGeurcontour=false, gesScore=null

## Conclusie

De Bodemloket-integratie werkt correct:
1. ✅ API retourneert bevoegd gezag (Gemeente Zaanstad)
2. ✅ Website URL wordt meegegeven (https://bodem.zaanstad.nl/)
3. ✅ rawData bevat volledige response voor PDF rapport
4. ✅ Indicator status is "relevant" (niet "niet_relevant")
5. ✅ Toelichting bevat concrete aanbeveling met URL

# Ontvangstbevestiging Template v3 — RO-flow

## Varianten

| Variant | Aanvraagtype | Volledig | Procedure    |
|---------|-------------|----------|--------------|
| A       | Formeel     | Ja       | Regulier     |
| B       | Formeel     | Ja       | Uitgebreid   |
| C       | Formeel     | Nee      | Regulier     |
| D       | Formeel     | Nee      | Uitgebreid   |
| E       | Concept/vooroverleg | — | —          |

## Placeholders (nooit hardcoded NAW)

- `[AANVRAGER]` — naam aanvrager (via restoreTemplateFields)
- `[ADRES_VERWIJDERD]` — adres activiteit (via restoreTemplateFields)
- `[AFDELING_NAAM]` — nooit "Afdeling Vergunningen" hardcoden

## Vaste briefstructuur

### Sectie 1 — Wat heeft u aangevraagd
- Activiteiten
- Omschrijving
- Locatie (gebiedstype / [ADRES_VERWIJDERD])
- Zaaknummer
- Ontvangstdatum

### Sectie 2 — Procedure en termijn
- Variant A/C regulier: 8 weken + optioneel 6 weken verlenging
- Variant B/D uitgebreid: 26 weken + optioneel 6 weken verlenging + ter inzage
- Variant E concept: geen wettelijke termijn, indicatief advies

### Sectie 3 — Volledigheid
- Variant A/B: aanvraag is volledig
- Variant C/D: termijn opgeschort, ontbrekende stukken per perceel met grondslag + aanvuldeadline
- Variant E: overzicht wat nog ontbreekt voor formele indiening

### Sectie 4 — Contact
- Contactpersoon [AFDELING_NAAM]
- Reactietermijn

### Juridische voetnoten
- Voorbehoud bij concept: "Indicatief advies — aan dit advies kunnen geen rechten worden ontleend"
- Verwijzing Omgevingswet, Awb art. 4:3a

## Termijnen

| Situatie                  | Termijn                    |
|---------------------------|----------------------------|
| Regulier beslistermijn    | ontvangstdatum + 8 weken   |
| Uitgebreid beslistermijn  | ontvangstdatum + 26 weken  |
| Aanvulling onvolledig     | ontvangstdatum + 4 weken   |
| Verlenging (beide)        | + 6 weken mogelijk         |

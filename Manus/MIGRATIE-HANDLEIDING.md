# Ro-flow Migratie Handleiding

## Overzicht

Deze handleiding beschrijft hoe je Ro-flow migreert van je huidige Manus account naar een nieuw Manus account. De migratie bestaat uit 5 stappen.

---

## Stap 1: Nieuw Manus Account + Project Aanmaken

1. Maak een nieuw Manus account aan op https://manus.im
2. Kies het Pro plan ($22/maand)
3. Maak een nieuw project aan met de naam "ro-flow"
4. Koppel de GitHub repository: `roflowfemke-art/ro-flow`
5. Kies features: **db, server, user**

---

## Stap 2: Secrets Instellen

Na het aanmaken van het project moeten alle secrets opnieuw worden ingesteld. Hieronder de complete lijst:

### Automatisch door Manus (hoef je NIET zelf te doen):

| Secret | Beschrijving |
|--------|-------------|
| `DATABASE_URL` | Nieuwe database connectie string |
| `JWT_SECRET` | Session cookie signing |
| `VITE_APP_ID` | Manus OAuth app ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL |
| `OWNER_OPEN_ID` | Jouw Manus user ID (nieuw account) |
| `OWNER_NAME` | Jouw naam |
| `BUILT_IN_FORGE_API_URL` | Manus LLM API URL |
| `BUILT_IN_FORGE_API_KEY` | Manus LLM API key |
| `VITE_FRONTEND_FORGE_API_URL` | Manus frontend API URL |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus frontend API key |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `VITE_ANALYTICS_ENDPOINT` | Analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID |

### Handmatig instellen (via Settings → Secrets):

| Secret | Beschrijving | Waar te vinden |
|--------|-------------|----------------|
| `DSO_API_KEY` | Digitaal Stelsel Omgevingswet API | https://aandeslagmetdeomgevingswet.nl |
| `BAG_API_KEY` | BAG (Basisregistratie Adressen) API | https://www.kadaster.nl/zakelijk/producten/adressen-en-gebouwen |
| `RUIMTELIJKEPLANNEN_API_KEY` | Ruimtelijkeplannen.nl API | https://www.ruimtelijkeplannen.nl |
| `GROQ_API_KEY` | Groq LLM API (voor Llama summarizer) | https://console.groq.com |
| `AERIUS_API_KEY` | AERIUS stikstof berekening API | https://www.aerius.nl |
| `MOLLIE_API_KEY` | Mollie betalingen (niet nodig voor pilot) | https://www.mollie.com/dashboard |
| `RESEND_API_KEY` | Resend email service | https://resend.com/api-keys |
| `VITE_APP_TITLE` | Website titel | Waarde: `Ro-flow` |
| `VITE_APP_LOGO` | Website logo URL | Upload logo en gebruik CDN URL |

### Optioneel (alleen als je ze gebruikt):

| Secret | Beschrijving |
|--------|-------------|
| `TOGETHER_API_KEY` | Together.ai API (backup LLM) |
| `CRON_SECRET_KEY` | Geheime sleutel voor cron jobs (default: `ro-flow-cron-secret`) |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | LemonSqueezy webhook (niet actief) |

---

## Stap 3: Database Migraties Uitvoeren

Na het aanmaken van het project moet de database schema worden aangemaakt:

```bash
pnpm drizzle-kit generate
```

Voer daarna alle gegenereerde SQL migraties uit via de Manus `webdev_execute_sql` tool of het Database panel in de Management UI.

---

## Stap 4: Database Backup Herstellen

### Optie A: Via het restore script (aanbevolen)

De backup staat op S3:
```
https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/backups/db-backup-2026-02-28T08-55-23-448Z.json
```

Voer het restore script uit:
```bash
node scripts/restore-db.mjs https://d2xsxph8kpxj0f.cloudfront.net/310519663303159483/25kmsrzdTzXv9MeGNQcJZ9/backups/db-backup-2026-02-28T08-55-23-448Z.json
```

### Optie B: Vraag de Manus agent

Zeg tegen de agent in je nieuwe project:
> "Herstel de database backup van deze URL: [backup URL]"

De agent kan het restore script voor je uitvoeren.

---

## Stap 5: Domein Koppelen

1. Ga naar Management UI → Settings → Domains
2. Voeg `ro-flow.nl` en `www.ro-flow.nl` toe
3. Update de DNS records bij Hostinger:
   - A record: `ro-flow.nl` → IP van nieuw Manus project
   - CNAME record: `www.ro-flow.nl` → Manus domein

---

## Stap 6: Verificatie Checklist

Na de migratie, controleer:

- [ ] Website laadt op preview URL
- [ ] Login werkt (Manus OAuth)
- [ ] Database bevat alle gemeenten en seats
- [ ] DSO API werkt (test een analyse)
- [ ] Emails worden verstuurd (test pilot aanvraag)
- [ ] Kennisbank items zijn aanwezig
- [ ] Admin dashboard toont correcte data
- [ ] Domein ro-flow.nl werkt

---

## Belangrijk: Wat NIET mee migreert

| Item | Actie nodig |
|------|-------------|
| S3 bestanden (uploads, PDF's) | Opnieuw genereren of apart downloaden |
| Gebruiker sessies | Iedereen moet opnieuw inloggen |
| Wekelijkse backup cron | Opnieuw instellen in nieuw account |
| Resend DNS records | Opnieuw toevoegen bij Hostinger |

---

## Noodplan

Als iets misgaat:
1. Je oude account blijft bestaan (alleen creditcard is gestopt)
2. GitHub repo bevat alle code
3. Database backup bevat alle data
4. Deze handleiding bevat alle secrets die je nodig hebt

Bewaar deze handleiding en je API keys op een veilige plek (bijv. 1Password, Bitwarden).

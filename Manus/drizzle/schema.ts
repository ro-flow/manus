import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json, longtext } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role for RBAC (super_admin, gemeente_beheerder, ambtenaar_gebruiker)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "super_admin", "gemeente_beheerder", "ambtenaar_gebruiker"]).default("user").notNull(),
  gemeenteId: int("gemeenteId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Gemeenten - Main municipality table with regional codes for 5-layer knowledge base
 */
export const gemeenten = mysqlTable("gemeenten", {
  id: int("id").autoincrement().primaryKey(),
  gemeenteNaam: varchar("gemeenteNaam", { length: 100 }).notNull().unique(),
  gemeenteCode: varchar("gemeenteCode", { length: 10 }).notNull(), // CBS code (4 digits)
  provincie: mysqlEnum("provincie", [
    "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen",
    "Limburg", "Noord-Brabant", "Noord-Holland", "Overijssel",
    "Utrecht", "Zeeland", "Zuid-Holland"
  ]).notNull(),
  
  // Regional organization names
  waterschapNaam: varchar("waterschapNaam", { length: 100 }),
  waterschapCode: varchar("waterschapCode", { length: 50 }), // e.g., "hhnk"
  vrNaam: varchar("vrNaam", { length: 100 }), // Veiligheidsregio
  vrCode: varchar("vrCode", { length: 50 }), // e.g., "vr-nhn"
  odNaam: varchar("odNaam", { length: 100 }), // Omgevingsdienst
  odCode: varchar("odCode", { length: 50 }), // e.g., "od-nhn"
  ggdNaam: varchar("ggdNaam", { length: 100 }),
  ggdCode: varchar("ggdCode", { length: 50 }), // e.g., "ggd-hollands-noorden"
  recreatieschapNaam: varchar("recreatieschapNaam", { length: 100 }), // e.g., "Recreatieschap Westfriesland"
  recreatieschapCode: varchar("recreatieschapCode", { length: 50 }), // e.g., "westfriesland"
  
  // Municipality settings
  welstandsniveauDefault: mysqlEnum("welstandsniveauDefault", ["Regulier", "Bijzonder", "Soepel"]).default("Regulier"),
  heeftBeschermdGezicht: boolean("heeftBeschermdGezicht").default(false),
  contactBeheerder: varchar("contactBeheerder", { length: 320 }),
  
  // Concept-modus toggle - neem concept documenten mee in RAG
  neemConceptenMee: boolean("neemConceptenMee").default(false),
  
  // Vrijstellingsgrenzen per gemeente (configureerbaar per omgevingsplan)
  archeologieVrijstellingDiepteCm: int("archeologieVrijstellingDiepteCm").default(30), // Default 30cm
  archeologieVrijstellingOppervlakteM2: int("archeologieVrijstellingOppervlakteM2").default(100), // Default 100m²
  bodemonderzoekVrijstellingGebieden: text("bodemonderzoekVrijstellingGebieden"), // JSON array van gebiedsnamen
  bodemonderzoekVrijstellingPostcodes: text("bodemonderzoekVrijstellingPostcodes"), // JSON array van postcodes zonder onderzoeksplicht
  
  // Lemon Squeezy integration
  lemonOrderId: varchar("lemonOrderId", { length: 100 }),
  lemonSubscriptionId: varchar("lemonSubscriptionId", { length: 100 }),
  seatsGekocht: int("seatsGekocht").default(0),
  
  // Status
  status: mysqlEnum("status", ["pending_activation", "actief", "inactief", "geannuleerd"]).default("pending_activation"),
  lastPolicyUpdate: timestamp("lastPolicyUpdate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Gemeente = typeof gemeenten.$inferSelect;
export type InsertGemeente = typeof gemeenten.$inferInsert;

/**
 * Gemeente_Regio_Lookup - Lookup table for automatic regional config (342 municipalities)
 */
export const gemeenteRegioLookup = mysqlTable("gemeente_regio_lookup", {
  id: int("id").autoincrement().primaryKey(),
  gemeenteNaam: varchar("gemeenteNaam", { length: 100 }).notNull().unique(),
  cbsCode: varchar("cbsCode", { length: 10 }).notNull(),
  provincie: varchar("provincie", { length: 50 }).notNull(),
  waterschapCode: varchar("waterschapCode", { length: 50 }),
  vrCode: varchar("vrCode", { length: 50 }),
  odCode: varchar("odCode", { length: 50 }),
  ggdCode: varchar("ggdCode", { length: 50 }),
});

export type GemeenteRegioLookup = typeof gemeenteRegioLookup.$inferSelect;
export type InsertGemeenteRegioLookup = typeof gemeenteRegioLookup.$inferInsert;

/**
 * Seats - Users per municipality
 */
export const seats = mysqlTable("seats", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  naam: varchar("naam", { length: 200 }),
  gemeenteId: int("gemeenteId").notNull(),
  rol: mysqlEnum("rol", ["behandelaar", "beheerder"]).default("behandelaar").notNull(),
  status: mysqlEnum("status", ["actief", "inactief", "uitgenodigd"]).default("uitgenodigd").notNull(),
  userId: int("userId"), // Link to users table when activated
  mollieCustomerId: varchar("mollieCustomerId", { length: 100 }),
  mollieSubscriptionId: varchar("mollieSubscriptionId", { length: 100 }),
  trialEndsAt: timestamp("trialEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  laatsteLogin: timestamp("laatsteLogin"),
});

export type Seat = typeof seats.$inferSelect;
export type InsertSeat = typeof seats.$inferInsert;

/**
 * Beleidsdocumenten - Policy documents per municipality
 */
export const beleidsdocumenten = mysqlTable("beleidsdocumenten", {
  id: int("id").autoincrement().primaryKey(),
  documentNaam: varchar("documentNaam", { length: 255 }).notNull(),
  documentType: mysqlEnum("documentType", [
    "welstandsnota", "parkeerbeleid", "erfgoedbeleid", 
    "beleidsregels_afwijken", "gezondheidsbeleid", "groenbeleid", "overig"
  ]).notNull(),
  gemeenteId: int("gemeenteId").notNull(),
  url: text("url"),
  relevantieTags: text("relevantieTags"), // Comma-separated tags
  altijdOphalen: boolean("altijdOphalen").default(false),
  geminiFileId: varchar("geminiFileId", { length: 255 }), // Reference to Gemini File Search
  laatstGecontroleerd: timestamp("laatstGecontroleerd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Beleidsdocument = typeof beleidsdocumenten.$inferSelect;
export type InsertBeleidsdocument = typeof beleidsdocumenten.$inferInsert;

/**
 * Behandelrapport_Log - Scan/report logs with archive functionality
 */
export const behandelrapportLog = mysqlTable("behandelrapport_log", {
  id: int("id").autoincrement().primaryKey(),
  zaaknummer: varchar("zaaknummer", { length: 100 }).notNull(),
  gemeenteId: int("gemeenteId").notNull(),
  behandelaarNaam: varchar("behandelaarNaam", { length: 200 }),
  behandelaarEmail: varchar("behandelaarEmail", { length: 320 }),
  seatId: int("seatId"),
  
  // Project info for archive
  projectNaam: varchar("projectNaam", { length: 255 }),
  projectOmschrijving: text("projectOmschrijving"),
  aanvragerNaam: varchar("aanvragerNaam", { length: 200 }),
  
  // Analysis results
  procedureType: mysqlEnum("procedureType", [
    "VERGUNNINGVRIJ", "REGULIER", "BOPA_REGULIER", "BOPA_UITGEBREID"
  ]),
  isVergunningvrij: boolean("isVergunningvrij").default(false),
  
  // Location data from PDOK (for map view)
  adres: varchar("adres", { length: 500 }),
  woonplaats: varchar("woonplaats", { length: 100 }),
  kadastraalNummer: varchar("kadastraalNummer", { length: 100 }),
  rdX: decimal("rdX", { precision: 12, scale: 2 }),
  rdY: decimal("rdY", { precision: 12, scale: 2 }),
  wgs84Lat: decimal("wgs84Lat", { precision: 10, scale: 7 }),
  wgs84Lng: decimal("wgs84Lng", { precision: 10, scale: 7 }),
  
  // PDOK gebiedsinfo (for quick display)
  isNatura2000: boolean("isNatura2000").default(false),
  isRijksmonument: boolean("isRijksmonument").default(false),
  isBeschermdGezicht: boolean("isBeschermdGezicht").default(false),
  isGrondwaterbescherming: boolean("isGrondwaterbescherming").default(false),
  
  // Report
  pdfUrl: text("pdfUrl"),
  rapportData: json("rapportData"), // Full analysis JSON
  rapportSamenvatting: text("rapportSamenvatting"), // AI summary for quick view
  
  // Metadata
  status: mysqlEnum("status", ["verwerking", "verzonden", "mislukt", "gearchiveerd"]).default("verwerking"),
  verwerkingDuurSec: decimal("verwerkingDuurSec", { precision: 6, scale: 1 }),
  aiKostenEur: decimal("aiKostenEur", { precision: 8, scale: 4 }),
  kennisbankBronnen: text("kennisbankBronnen"), // Used sources from File Search
  
  datumRapport: timestamp("datumRapport").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BehandelrapportLog = typeof behandelrapportLog.$inferSelect;
export type InsertBehandelrapportLog = typeof behandelrapportLog.$inferInsert;

/**
 * Adviseurs - External and internal advisers with triggers
 */
export const adviseurs = mysqlTable("adviseurs", {
  id: int("id").autoincrement().primaryKey(),
  naam: varchar("naam", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["extern", "intern"]).notNull(),
  categorie: varchar("categorie", { length: 100 }), // e.g., "waterschap", "veiligheidsregio"
  
  // Trigger conditions
  triggers: json("triggers"), // JSON array of trigger conditions
  termijnWeken: int("termijnWeken"),
  grondslag: text("grondslag"),
  
  // Contact
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactTelefoon: varchar("contactTelefoon", { length: 50 }),
  
  // Regional scope
  regioCode: varchar("regioCode", { length: 50 }), // Links to regional codes
  isLandelijk: boolean("isLandelijk").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Adviseur = typeof adviseurs.$inferSelect;
export type InsertAdviseur = typeof adviseurs.$inferInsert;

/**
 * Cache table for Gemini results
 */
export const geminiCache = mysqlTable("gemini_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 255 }).notNull().unique(),
  gemeenteId: int("gemeenteId").notNull(),
  queryHash: varchar("queryHash", { length: 64 }).notNull(),
  response: json("response"),
  policyUpdateAt: timestamp("policyUpdateAt"), // For invalidation
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeminiCache = typeof geminiCache.$inferSelect;
export type InsertGeminiCache = typeof geminiCache.$inferInsert;


/**
 * Subscriptions - Mollie subscription tracking for users
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Mollie IDs
  mollieCustomerId: varchar("mollieCustomerId", { length: 100 }).notNull(),
  mollieSubscriptionId: varchar("mollieSubscriptionId", { length: 100 }),
  mollieMandateId: varchar("mollieMandateId", { length: 100 }),
  
  // Plan details
  plan: mysqlEnum("plan", ["monthly", "yearly"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // 149.00 or 1490.00
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  
  // Trial period
  trialStartDate: timestamp("trialStartDate").notNull(),
  trialEndDate: timestamp("trialEndDate").notNull(),
  
  // Subscription status
  status: mysqlEnum("status", [
    "trial",           // In proefperiode
    "active",          // Actief betalend
    "past_due",        // Betaling mislukt
    "canceled",        // Opgezegd
    "expired"          // Verlopen
  ]).default("trial").notNull(),
  
  // Billing dates
  nextBillingDate: timestamp("nextBillingDate"),
  lastPaymentDate: timestamp("lastPaymentDate"),
  canceledAt: timestamp("canceledAt"),
  
  // Metadata
  metadata: json("metadata"), // Extra info like payment method, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Payment history - Track all Mollie payments
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId"),
  userId: int("userId").notNull(),
  
  // Mollie payment details
  molliePaymentId: varchar("molliePaymentId", { length: 100 }).notNull().unique(),
  mollieCustomerId: varchar("mollieCustomerId", { length: 100 }).notNull(),
  
  // Payment info
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  description: varchar("description", { length: 255 }),
  
  // Status
  status: mysqlEnum("status", [
    "open",
    "pending",
    "authorized",
    "paid",
    "failed",
    "canceled",
    "expired",
    "refunded"
  ]).notNull(),
  
  // Payment method
  method: varchar("method", { length: 50 }), // ideal, creditcard, bancontact, etc.
  
  // Timestamps
  paidAt: timestamp("paidAt"),
  failedAt: timestamp("failedAt"),
  
  // Metadata from Mollie
  metadata: json("metadata"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Kennisbank_Items - Gelaagde kennisbank met hergebruik per laag
 * 
 * Lagen:
 * - rijks: Landelijke wetgeving (Omgevingswet, Bbl, Bal, etc.) - gedeeld door alle gemeenten
 * - provinciaal: Provinciale verordeningen - gedeeld per provincie
 * - regionaal: Regionale organisaties - gedeeld per regio-code (waterschap, VR, OD, GGD)
 * - gemeentelijk: Lokaal beleid - uniek per gemeente
 */
export const kennisbankItems = mysqlTable("kennisbank_items", {
  id: int("id").autoincrement().primaryKey(),
  
  // Item type
  itemType: mysqlEnum("itemType", ["adviseur", "beleidsdocument", "toetsingskader"]).notNull(),
  
  // Laag bepaalt scope van hergebruik
  // basis: Fundamenteel juridisch kader (Omgevingswet, Bbl, Bal) - ALTIJD gebruiken
  // rijks: Nationale regelgeving en instructieregels
  // provinciaal: Provinciale omgevingsverordening
  // regionaal: Waterschap, VR, OD, GGD
  // gemeentelijk: Lokaal beleid
  laag: mysqlEnum("laag", ["basis", "rijks", "provinciaal", "regionaal", "gemeentelijk"]).notNull(),
  
  // Scope identifiers (afhankelijk van laag)
  // basis: null (geldt voor iedereen, altijd gebruiken)
  // rijks: null (geldt voor iedereen)
  // provinciaal: provincieNaam
  // regionaal: regioCode (bijv. "hhnk", "vr-nhn", "od-nhn", "ggd-hollands-noorden")
  // gemeentelijk: gemeenteId
  scopeProvincie: varchar("scopeProvincie", { length: 50 }),
  scopeRegioCode: varchar("scopeRegioCode", { length: 50 }),
  scopeGemeenteId: int("scopeGemeenteId"),
  
  // Content
  naam: varchar("naam", { length: 255 }).notNull(),
  
  // Samenvatting voor AI om te bepalen wanneer van toepassing
  samenvatting: text("samenvatting"),
  
  // Toepassingscriteria - wanneer is dit item relevant?
  toepassingscriteria: text("toepassingscriteria"), // Beschrijving wanneer van toepassing
  triggers: json("triggers"), // JSON array van trigger keywords/condities
  
  // Adviseur-specifieke velden
  adviseurType: mysqlEnum("adviseurType", ["intern", "extern"]),
  adviseurCategorie: varchar("adviseurCategorie", { length: 100 }),
  adviseurTermijnWeken: int("adviseurTermijnWeken"),
  adviseurGrondslag: text("adviseurGrondslag"),
  adviseurIsVerplicht: boolean("adviseurIsVerplicht").default(false),
  adviseurContactEmail: varchar("adviseurContactEmail", { length: 320 }),
  
  // Beleidsdocument-specifieke velden
  // Uitgebreide documentType enum voor formele en informele beleidsdocumenten
  documentType: mysqlEnum("documentType", [
    // Formele documenten
    "verordening",           // Juridisch bindend (POV, APV)
    "omgevingsplan",         // Gemeentelijk omgevingsplan
    "bestemmingsplan",       // Oude bestemmingsplannen (nog geldig)
    "beleidsregel",          // Formele beleidsregel
    "nota",                  // Welstandsnota, erfgoednota
    
    // Informele/strategische documenten
    "visie",                 // Omgevingsvisie, woonvisie, mobiliteitsvisie
    "propositie",            // Nohono, NOVEX-proposities
    "kader",                 // Investeringskader, afwegingskader
    "programma",             // Woningbouwprogramma, duurzaamheidsprogramma
    "afspraak",              // Woondeal, Regiodeal, bestuursafspraken
    "handreiking",           // Uitvoeringsrichtlijnen, handreikingen
    "richtlijn",             // Interne richtlijnen
    
    // Overig
    "rapport",               // Onderzoeksrapporten
    "overig"                 // Catch-all
  ]),
  documentUrl: text("documentUrl"),
  documentZoekterm: varchar("documentZoekterm", { length: 255 }),
  relevantieTags: text("relevantieTags"),
  
  // Toetsingskader-specifieke velden
  toetsingskaderBeschrijving: text("toetsingskaderBeschrijving"),
  
  // Juridische status (Policy Assist Stap 5)
  juridischeStatus: mysqlEnum("juridischeStatus", ["normstellend", "richtinggevend", "afwegingskader"]),
  isBindend: boolean("isBindend").default(false),
  isConcreetGenoeg: boolean("isConcreetGenoeg").default(true), // Om rechten aan te ontlenen
  heeftTweezijdigeWerking: boolean("heeftTweezijdigeWerking").default(false), // Beschermt ook bestaande functies
  
  // Status
  status: mysqlEnum("status", ["concept", "actief", "inactief"]).default("actief"),
  bron: mysqlEnum("bron", ["ai_gegenereerd", "handmatig", "import"]).default("handmatig"),
  
  // Audit
  createdBy: int("createdBy"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KennisbankItem = typeof kennisbankItems.$inferSelect;
export type InsertKennisbankItem = typeof kennisbankItems.$inferInsert;

/**
 * Kennisbank_Rijks_Wetgeving - Rijkslaag met samenvattingen van wetgeving
 * Pre-populated met alle relevante Omgevingswet regelgeving
 */
export const kennisbankRijksWetgeving = mysqlTable("kennisbank_rijks_wetgeving", {
  id: int("id").autoincrement().primaryKey(),
  
  // Wetgeving identificatie
  wetNaam: varchar("wetNaam", { length: 255 }).notNull(),
  wetAfkorting: varchar("wetAfkorting", { length: 50 }), // bijv. "Bbl", "Bal", "Bkl"
  
  // Samenvatting voor AI
  samenvatting: text("samenvatting").notNull(),
  
  // Wanneer van toepassing
  toepassingscriteria: text("toepassingscriteria").notNull(),
  relevanteActiviteiten: json("relevanteActiviteiten"), // JSON array van activiteit-types
  
  // Bron
  bronUrl: text("bronUrl"),
  versie: varchar("versie", { length: 50 }),
  
  status: mysqlEnum("status", ["actief", "inactief"]).default("actief"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KennisbankRijksWetgeving = typeof kennisbankRijksWetgeving.$inferSelect;
export type InsertKennisbankRijksWetgeving = typeof kennisbankRijksWetgeving.$inferInsert;

/**
 * Kennisbank_Documenten - Volledige documenten met Gemini File Search integratie
 * Voor documenten die volledig moeten worden getoetst (Omgevingswet, Welstandsnota, etc.)
 */
export const kennisbankDocumenten = mysqlTable("kennisbank_documenten", {
  id: int("id").autoincrement().primaryKey(),
  
  // Document identificatie
  documentNaam: varchar("documentNaam", { length: 255 }).notNull(),
  documentType: mysqlEnum("documentType", [
    "omgevingswet", "bbl", "bal", "bkl", "omgevingsbesluit", "omgevingsregeling",
    "pov", "welstandsnota", "parkeerbeleid", "woonvisie", "horecabeleid",
    "erfgoedvisie", "groenvisie", "duurzaamheidsvisie", "apv", "keur",
    "beleidsregels_bopa", "archeologiebeleid", "overig"
  ]).notNull(),
  
  // Laag en scope (zelfde structuur als kennisbankItems)
  laag: mysqlEnum("laag", ["basis", "rijks", "provinciaal", "regionaal", "gemeentelijk"]).notNull(),
  scopeProvincie: varchar("scopeProvincie", { length: 50 }),
  scopeRegioCode: varchar("scopeRegioCode", { length: 50 }),
  scopeGemeenteId: int("scopeGemeenteId"),
  
  // Samenvatting voor RAG (max 500 tokens, gegenereerd door Llama 3.3)
  samenvatting: text("samenvatting"),
  samenvattingGeneratedAt: timestamp("samenvattingGeneratedAt"),
  
  // Toepassingscriteria - wanneer moet dit document worden getoetst
  toepassingscriteria: text("toepassingscriteria"),
  relevanteActiviteiten: json("relevanteActiviteiten"), // JSON array
  
  // Juridische status (Policy Assist Stap 5)
  juridischeStatus: mysqlEnum("juridischeStatus", ["normstellend", "richtinggevend", "afwegingskader"]),
  isBindend: boolean("isBindend").default(false),
  isConcreetGenoeg: boolean("isConcreetGenoeg").default(true), // Om rechten aan te ontlenen
  heeftTweezijdigeWerking: boolean("heeftTweezijdigeWerking").default(false), // Beschermt ook bestaande functies
  
  // Gemini File Search integratie
  geminiFileId: varchar("geminiFileId", { length: 255 }), // ID in Gemini File Search store
  geminiStoreId: varchar("geminiStoreId", { length: 255 }), // Store ID
  
  // Document opslag
  documentUrl: text("documentUrl"), // Originele bron URL (overheid.nl, etc.)
  s3Key: varchar("s3Key", { length: 500 }), // S3 key voor lokale kopie
  s3Url: text("s3Url"), // S3 URL
  mimeType: varchar("mimeType", { length: 100 }),
  fileSizeBytes: int("fileSizeBytes"),
  
  // Versie en geldigheid
  versie: varchar("versie", { length: 100 }),
  vaststellingsdatum: timestamp("vaststellingsdatum"),
  geldigVan: timestamp("geldigVan"),
  geldigTot: timestamp("geldigTot"), // null = altijd actueel
  
  // Status
  status: mysqlEnum("status", ["concept", "geldig", "vervallen"]).default("geldig").notNull(),
  
  // Bron en audit
  bron: mysqlEnum("bron", ["crawler", "upload", "handmatig"]).default("handmatig"),
  crawlerSource: varchar("crawlerSource", { length: 100 }), // "overheid.nl", "ruimtelijkeplannen.nl"
  lastCrawledAt: timestamp("lastCrawledAt"),
  
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KennisbankDocument = typeof kennisbankDocumenten.$inferSelect;
export type InsertKennisbankDocument = typeof kennisbankDocumenten.$inferInsert;

/**
 * Crawler_Log - Log van nachtelijke publicatie crawler runs
 */
export const crawlerLog = mysqlTable("crawler_log", {
  id: int("id").autoincrement().primaryKey(),
  
  crawlerType: mysqlEnum("crawlerType", ["overheid_nl", "ruimtelijkeplannen_nl", "provinciale_sites", "waterschappen"]).notNull(),
  gemeenteId: int("gemeenteId"), // null = landelijk/provinciaal
  
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  
  documentsFound: int("documentsFound").default(0),
  documentsNew: int("documentsNew").default(0),
  documentsUpdated: int("documentsUpdated").default(0),
  documentsRemoved: int("documentsRemoved").default(0),
  
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running"),
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrawlerLog = typeof crawlerLog.$inferSelect;
export type InsertCrawlerLog = typeof crawlerLog.$inferInsert;

/**
 * Toetsingsmatrix - Bepaalt welke toetsingskaders verplicht/optioneel zijn per activiteit+functie
 * Dit is het vangnet zodat GEEN enkel beleidsstuk wordt vergeten.
 * 
 * Werking:
 * 1. VERPLICHT: Deze kaders MOET de AI altijd gebruiken (uit verplichteKaders)
 * 2. OPTIONEEL: Deze kaders KAN de AI raadplegen indien context relevant is (uit optioneleKaders)
 * 3. AI kan zelf aanvullende kaders toevoegen op basis van specifieke omstandigheden
 */
export const toetsingsmatrix = mysqlTable("toetsingsmatrix", {
  id: int("id").autoincrement().primaryKey(),
  
  // Activiteit type (uit DSO of gedetecteerd)
  activiteitType: mysqlEnum("activiteitType", [
    "nieuwbouw",
    "verbouw",
    "uitbouw",
    "aanbouw",
    "dakkapel",
    "dakopbouw",
    "functiewijziging",
    "splitsen",
    "samenvoegen",
    "sloop",
    "reclame",
    "erfafscheiding",
    "bijgebouw",
    "overkapping",
    "zonnepanelen",
    "warmtepomp",
    "evenement",
    "terras",
    "inrit",
    "kappen",
    "uitweg",
    "overig"
  ]).notNull(),
  
  // Functie/bestemming (huidige of gewenste)
  functieType: mysqlEnum("functieType", [
    "wonen",
    "horeca",
    "detailhandel",
    "kantoor",
    "bedrijf",
    "maatschappelijk",
    "sport",
    "recreatie",
    "agrarisch",
    "natuur",
    "verkeer",
    "water",
    "gemengd",
    "overig"
  ]).notNull(),
  
  // Verplichte toetsingskaders (JSON array van kader-namen)
  // Deze MOET de AI altijd gebruiken
  verplichteKaders: json("verplichteKaders").notNull(), // ["welstandsnota", "parkeerbeleid", ...]
  
  // Optionele toetsingskaders (JSON array van kader-namen)
  // Deze KAN de AI raadplegen indien relevant
  optioneleKaders: json("optioneleKaders"), // ["horecabeleid", "terrassenbeleid", ...]
  
  // Toelichting voor de AI
  toelichting: text("toelichting"),
  
  // Bijzondere aandachtspunten
  aandachtspunten: text("aandachtspunten"),
  
  // Status
  status: mysqlEnum("status", ["actief", "inactief"]).default("actief"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Toetsingsmatrix = typeof toetsingsmatrix.$inferSelect;
export type InsertToetsingsmatrix = typeof toetsingsmatrix.$inferInsert;


/**
 * Rapport_Feedback - Feedback van behandelaars op AI-rapporten voor zelflerend systeem
 * 
 * Werking:
 * 1. Behandelaar geeft 👍/👎 op onderdelen van het rapport
 * 2. Bij 👎 kan een correctie worden toegevoegd
 * 3. Feedback wordt gebruikt om toekomstige analyses te verbeteren
 * 4. Per gemeente worden patronen herkend (bijv. "bij monumenten wordt X vaak gecorrigeerd")
 */
export const rapportFeedback = mysqlTable("rapport_feedback", {
  id: int("id").autoincrement().primaryKey(),
  
  // Link naar rapport
  behandelrapportId: int("behandelrapportId").notNull(),
  gemeenteId: int("gemeenteId").notNull(),
  
  // Wie geeft feedback
  userId: int("userId").notNull(),
  behandelaarNaam: varchar("behandelaarNaam", { length: 200 }),
  behandelaarEmail: varchar("behandelaarEmail", { length: 320 }),
  
  // Feedback type
  feedbackType: mysqlEnum("feedbackType", [
    "algemeen",           // Algemene beoordeling van het rapport
    "procedure",          // Feedback op procedure-bepaling (regulier/BOPA/etc)
    "adviseurs",          // Feedback op geadviseerde adviseurs
    "toetsingskaders",    // Feedback op gebruikte toetsingskaders
    "volledigheid",       // Feedback op volledigheidscheck
    "juridisch",          // Feedback op juridische onderbouwing
    "beleidsdocumenten",  // Feedback op gebruikte beleidsdocumenten
    "overig"
  ]).notNull(),
  
  // Beoordeling
  score: mysqlEnum("score", ["positief", "negatief", "neutraal"]).notNull(),
  
  // Details bij negatieve feedback
  correctie: text("correctie"),           // Wat had het moeten zijn?
  redenIncorrect: text("redenIncorrect"), // Waarom was het fout?
  
  // Context voor machine learning
  origineleWaarde: text("origineleWaarde"),  // Wat zei de AI?
  gecorrigeerdeWaarde: text("gecorrigeerdeWaarde"), // Wat is correct?
  
  // Categorisatie voor patroonherkenning
  activiteitType: varchar("activiteitType", { length: 100 }), // bouwen, verbouwen, etc.
  beschermingsregime: varchar("beschermingsregime", { length: 100 }), // monument, natura2000, etc.
  
  // Status
  isVerwerkt: boolean("isVerwerkt").default(false), // Is feedback verwerkt in kennisbank?
  verwerkingsNotitie: text("verwerkingsNotitie"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RapportFeedback = typeof rapportFeedback.$inferSelect;
export type InsertRapportFeedback = typeof rapportFeedback.$inferInsert;

/**
 * Feedback_Patronen - Geaggregeerde patronen uit feedback voor AI-verbetering
 * 
 * Wanneer dezelfde correctie meerdere keren voorkomt, wordt een patroon aangemaakt.
 * Dit patroon wordt meegestuurd naar de AI bij toekomstige analyses.
 */
export const feedbackPatronen = mysqlTable("feedback_patronen", {
  id: int("id").autoincrement().primaryKey(),
  
  // Scope
  gemeenteId: int("gemeenteId"), // null = landelijk patroon
  provincie: varchar("provincie", { length: 50 }), // null = niet provinciaal
  
  // Patroon identificatie
  patroonType: mysqlEnum("patroonType", [
    "procedure_correctie",    // AI kiest vaak verkeerde procedure
    "adviseur_gemist",        // AI vergeet bepaalde adviseur
    "adviseur_onnodig",       // AI adviseert onnodige adviseur
    "toetsingskader_gemist",  // AI vergeet bepaald kader
    "toetsingskader_onnodig", // AI gebruikt onnodig kader
    "beleid_interpretatie",   // AI interpreteert beleid verkeerd
    "overig"
  ]).notNull(),
  
  // Trigger condities (wanneer treedt dit patroon op?)
  triggerActiviteit: varchar("triggerActiviteit", { length: 100 }),
  triggerBeschermingsregime: varchar("triggerBeschermingsregime", { length: 100 }),
  triggerLocatie: varchar("triggerLocatie", { length: 255 }), // specifiek gebied/wijk
  
  // De correctie
  beschrijving: text("beschrijving").notNull(), // Menselijke beschrijving
  aiInstructie: text("aiInstructie").notNull(), // Instructie voor AI prompt
  
  // Statistieken
  aantalVoorkomens: int("aantalVoorkomens").default(1),
  laatsteVoorkomen: timestamp("laatsteVoorkomen"),
  
  // Status
  status: mysqlEnum("status", ["actief", "inactief", "geverifieerd"]).default("actief"),
  geverifieerdDoor: int("geverifieerdDoor"), // userId van beheerder
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeedbackPatroon = typeof feedbackPatronen.$inferSelect;
export type InsertFeedbackPatroon = typeof feedbackPatronen.$inferInsert;


/**
 * Jurisprudentie - Rechtspraak database voor omgevingsrecht
 * 
 * Bevat relevante uitspraken van rechtspraak.nl met:
 * - Actualiteitsweging (recenter = relevanter)
 * - Omgevingswet-bewuste scoring (pre-2024 uitspraken afwaarderen indien achterhaald)
 * - Thema-classificatie voor gerichte zoekresultaten
 * - AI-samenvattingen voor snelle context
 */
export const jurisprudentie = mysqlTable("jurisprudentie", {
  id: int("id").autoincrement().primaryKey(),
  
  // ECLI identificatie
  ecli: varchar("ecli", { length: 100 }).notNull().unique(), // ECLI:NL:RVS:2024:1234
  
  // Metadata
  instantie: varchar("instantie", { length: 100 }).notNull(), // Raad van State, Rechtbank, etc.
  instantieCode: varchar("instantieCode", { length: 20 }), // RVS, RBAMS, etc.
  datumUitspraak: timestamp("datumUitspraak"),
  datumPublicatie: timestamp("datumPublicatie"),
  zaaknummer: varchar("zaaknummer", { length: 100 }),
  
  // Rechtsgebied
  rechtsgebied: mysqlEnum("rechtsgebied", [
    "bestuursrecht_omgevingsrecht",
    "bestuursrecht_algemeen", 
    "civielrecht_goederenrecht",
    "overig"
  ]).default("bestuursrecht_omgevingsrecht"),
  
  // Inhoud
  titel: text("titel"),
  inhoudsindicatie: text("inhoudsindicatie"), // Korte samenvatting van rechtspraak.nl
  volledigeTekst: longtext("volledigeTekst"), // Volledige uitspraaktekst
  
  // AI-verrijking
  aiSamenvatting: text("aiSamenvatting"), // Door Llama/Groq gegenereerde samenvatting
  aiToetsingscriteria: text("aiToetsingscriteria"), // Geëxtraheerde criteria uit uitspraak
  aiBeleidsverwijzingen: text("aiBeleidsverwijzingen"), // JSON array van gevonden beleidsverwijzingen
  
  // Relevantie scoring
  relevantieScore: int("relevantieScore").default(50), // 0-100, hoger = relevanter
  isOmgevingswetRelevant: boolean("isOmgevingswetRelevant").default(true), // false als achterhaald door Ow
  omgevingswetNotitie: text("omgevingswetNotitie"), // Uitleg waarom wel/niet relevant na Ow
  
  // Bron
  bronUrl: varchar("bronUrl", { length: 500 }),
  
  // Status
  status: mysqlEnum("status", ["nieuw", "verwerkt", "gearchiveerd"]).default("nieuw"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Jurisprudentie = typeof jurisprudentie.$inferSelect;
export type InsertJurisprudentie = typeof jurisprudentie.$inferInsert;

/**
 * Jurisprudentie_Themas - Thema-classificatie voor jurisprudentie
 * 
 * Een uitspraak kan meerdere thema's hebben (bijv. zowel "omgevingsvergunning_bouwen" als "welstandstoets")
 */
export const jurisprudentieThemas = mysqlTable("jurisprudentie_themas", {
  id: int("id").autoincrement().primaryKey(),
  jurisprudentieId: int("jurisprudentieId").notNull(),
  
  thema: mysqlEnum("thema", [
    "omgevingsvergunning_bouwen",
    "omgevingsvergunning_milieu",
    "bestemmingsplan_wijziging",
    "afwijking_bestemmingsplan",
    "bopa_procedure",
    "welstandstoets",
    "monumenten_erfgoed",
    "natura2000_stikstof",
    "geluidhinder",
    "parkeren",
    "handhaving",
    "planschade",
    "ladder_duurzame_verstedelijking",
    "kruimelgevallenregeling",
    "belangenafweging",
    "motiveringsgebrek",
    "zorgvuldigheid",
    "overig"
  ]).notNull(),
  
  // Relevantie binnen dit thema
  themaRelevantie: int("themaRelevantie").default(50), // 0-100
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JurisprudentieThema = typeof jurisprudentieThemas.$inferSelect;
export type InsertJurisprudentieThema = typeof jurisprudentieThemas.$inferInsert;

/**
 * Jurisprudentie_Toetsingskader_Link - Koppeling jurisprudentie aan toetsingskaders
 * 
 * Maakt het mogelijk om per toetsingskader relevante jurisprudentie te tonen
 */
export const jurisprudentieToetsingskaderLink = mysqlTable("jurisprudentie_toetsingskader_link", {
  id: int("id").autoincrement().primaryKey(),
  jurisprudentieId: int("jurisprudentieId").notNull(),
  
  // Toetsingskader identificatie (uit basislaag)
  toetsingskaderNaam: varchar("toetsingskaderNaam", { length: 200 }).notNull(),
  toetsingskaderCategorie: varchar("toetsingskaderCategorie", { length: 100 }), // welstand, parkeren, etc.
  
  // Wat leert deze uitspraak voor dit kader?
  leerpunt: text("leerpunt"), // Concrete toetsingscriteria uit deze uitspraak
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JurisprudentieToetsingskaderLink = typeof jurisprudentieToetsingskaderLink.$inferSelect;
export type InsertJurisprudentieToetsingskaderLink = typeof jurisprudentieToetsingskaderLink.$inferInsert;

/**
 * Jurisprudentie_Beleidsverwijzing - Geëxtraheerde beleidsverwijzingen uit jurisprudentie
 * 
 * Wanneer jurisprudentie verwijst naar beleid (bijv. "Parapluplan Parkeren Utrecht"),
 * wordt dit opgeslagen zodat we vergelijkbaar lokaal beleid kunnen zoeken.
 */
export const jurisprudentieBeleidsverwijzing = mysqlTable("jurisprudentie_beleidsverwijzing", {
  id: int("id").autoincrement().primaryKey(),
  jurisprudentieId: int("jurisprudentieId").notNull(),
  
  // Gevonden beleidsverwijzing
  beleidsNaam: varchar("beleidsNaam", { length: 300 }).notNull(), // "Parapluplan Parkeren"
  beleidsType: varchar("beleidsType", { length: 100 }), // parkeerbeleid, welstandsnota, etc.
  gemeenteInJurisprudentie: varchar("gemeenteInJurisprudentie", { length: 100 }), // Utrecht
  
  // Geëxtraheerde normen/criteria
  genoemdeNormen: text("genoemdeNormen"), // JSON: ["1,8 pp/woning", "max 500m loopafstand"]
  
  // Context
  citaat: text("citaat"), // Relevante passage uit uitspraak
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JurisprudentieBeleidsverwijzing = typeof jurisprudentieBeleidsverwijzing.$inferSelect;
export type InsertJurisprudentieBeleidsverwijzing = typeof jurisprudentieBeleidsverwijzing.$inferInsert;

/**
 * Beleid_Suggestie - Suggesties voor ontbrekend beleid gevonden via internet
 * 
 * Wanneer jurisprudentie verwijst naar beleid dat niet in de kennisbank zit,
 * zoekt het systeem op internet en slaat suggesties op voor gebruikersbevestiging.
 */
export const beleidSuggestie = mysqlTable("beleid_suggestie", {
  id: int("id").autoincrement().primaryKey(),
  
  // Context
  gemeenteId: int("gemeenteId").notNull(),
  triggerJurisprudentieId: int("triggerJurisprudentieId"), // Welke uitspraak triggerde deze suggestie?
  triggerBeleidsverwijzingId: int("triggerBeleidsverwijzingId"), // Welke verwijzing?
  
  // Gevonden document
  documentNaam: varchar("documentNaam", { length: 300 }).notNull(),
  documentType: varchar("documentType", { length: 100 }), // parkeerbeleid, welstandsnota, etc.
  bronUrl: varchar("bronUrl", { length: 500 }).notNull(),
  bronType: mysqlEnum("bronType", [
    "gemeente_website",
    "overheid_nl",
    "lokaleregelgeving_nl",
    "google_search",
    "ruimtelijkeplannen_nl"
  ]).notNull(),
  
  // Metadata
  gevondenDatum: timestamp("gevondenDatum"),
  geschattePublicatieDatum: timestamp("geschattePublicatieDatum"),
  bestandsgrootte: int("bestandsgrootte"), // bytes
  
  // AI-analyse van gevonden document
  aiSamenvatting: text("aiSamenvatting"),
  aiRelevantie: int("aiRelevantie").default(50), // 0-100
  
  // Gebruikersbevestiging
  status: mysqlEnum("status", [
    "pending",           // Wacht op bevestiging
    "bevestigd",         // Gebruiker bevestigt: actueel beleid
    "afgewezen",         // Gebruiker wijst af: niet actueel
    "vervangen",         // Gebruiker heeft nieuwere versie geüpload
    "toegevoegd"         // Toegevoegd aan kennisbank
  ]).default("pending"),
  
  bevestigdDoor: int("bevestigdDoor"), // userId
  bevestigdOp: timestamp("bevestigdOp"),
  afwijzingsReden: text("afwijzingsReden"),
  
  // Als toegevoegd: link naar kennisbank item
  kennisbankItemId: int("kennisbankItemId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BeleidSuggestie = typeof beleidSuggestie.$inferSelect;
export type InsertBeleidSuggestie = typeof beleidSuggestie.$inferInsert;

/**
 * Jurisprudentie_Crawler_Log - Logging voor rechtspraak.nl crawler
 */
export const jurisprudentieCrawlerLog = mysqlTable("jurisprudentie_crawler_log", {
  id: int("id").autoincrement().primaryKey(),
  
  crawlDatum: timestamp("crawlDatum").defaultNow().notNull(),
  rechtsgebied: varchar("rechtsgebied", { length: 100 }),
  
  // Resultaten
  aantalGevonden: int("aantalGevonden").default(0),
  aantalNieuw: int("aantalNieuw").default(0),
  aantalBijgewerkt: int("aantalBijgewerkt").default(0),
  aantalFouten: int("aantalFouten").default(0),
  
  // Status
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running"),
  foutmelding: text("foutmelding"),
  duurMs: int("duurMs"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JurisprudentieCrawlerLog = typeof jurisprudentieCrawlerLog.$inferSelect;
export type InsertJurisprudentieCrawlerLog = typeof jurisprudentieCrawlerLog.$inferInsert;


// ============================================================
// OMGEVINGSSCAN TABLES
// ============================================================

/**
 * Omgevingsscan Dossiers - Main dossier table for scan requests
 */
export const scanDossiers = mysqlTable("scan_dossiers", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }).notNull().unique(), // UUID-like identifier
  gemeenteId: int("gemeenteId").notNull(),
  userId: int("userId").notNull(),
  
  // Project info
  projectNaam: varchar("projectNaam", { length: 255 }),
  
  // Status pipeline
  status: mysqlEnum("status", [
    "CREATED", "UPLOADED", "EXTRACTING", "EXTRACTED", 
    "SCANNING", "SCANNED", "LLM_PROCESSING", "LLM_DONE", 
    "EXPORTED", "ERROR"
  ]).default("CREATED").notNull(),
  errorMessage: text("errorMessage"),
  
  // DSO metadata (parsed from upload)
  dsoMetadata: json("dsoMetadata"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScanDossier = typeof scanDossiers.$inferSelect;
export type InsertScanDossier = typeof scanDossiers.$inferInsert;

/**
 * Scan Dossier Files - Uploaded files per dossier
 */
export const scanDossierFiles = mysqlTable("scan_dossier_files", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }).notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  storageUrl: text("storageUrl").notNull(),
  storageKey: text("storageKey").notNull(),
  sizeBytes: int("sizeBytes"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type ScanDossierFile = typeof scanDossierFiles.$inferSelect;
export type InsertScanDossierFile = typeof scanDossierFiles.$inferInsert;

/**
 * Scan Normalized Location - Extracted and geocoded location
 */
export const scanNormalizedLocation = mysqlTable("scan_normalized_location", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }).notNull().unique(),
  
  // Coordinates
  rdX: decimal("rdX", { precision: 12, scale: 2 }),
  rdY: decimal("rdY", { precision: 12, scale: 2 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lon: decimal("lon", { precision: 10, scale: 7 }),
  
  // Address
  addressText: varchar("addressText", { length: 500 }),
  postcode: varchar("postcode", { length: 10 }),
  woonplaats: varchar("woonplaats", { length: 100 }),
  
  // BAG / Kadaster
  bagPandId: varchar("bagPandId", { length: 50 }),
  bagVboId: varchar("bagVboId", { length: 50 }),
  parcelId: varchar("parcelId", { length: 100 }),
  parcelAreaM2: decimal("parcelAreaM2", { precision: 12, scale: 2 }),
  parcelGeometryGeojson: json("parcelGeometryGeojson"),
  
  // BAG building profile
  bouwjaar: int("bouwjaar"),
  gebruiksdoel: varchar("gebruiksdoel", { length: 100 }),
  pandStatus: varchar("pandStatus", { length: 100 }),
  oppervlakte: int("oppervlakte"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanNormalizedLocation = typeof scanNormalizedLocation.$inferSelect;
export type InsertScanNormalizedLocation = typeof scanNormalizedLocation.$inferInsert;

/**
 * Scan Plan Context - Bestemmingsplan/omgevingsplan data
 */
export const scanPlanContext = mysqlTable("scan_plan_context", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }).notNull().unique(),
  
  // Plan packages on location
  plansJson: json("plansJson"),
  
  // Plan objects (bestemmingen, dubbelbestemmingen, aanduidingen, bouwvlak)
  objectsJson: json("objectsJson"),
  
  // Plan rules (literal text)
  rulesJson: json("rulesJson"),
  
  // Relevant rules (filtered by activity/keyword match)
  relevantRulesJson: json("relevantRulesJson"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanPlanContext = typeof scanPlanContext.$inferSelect;
export type InsertScanPlanContext = typeof scanPlanContext.$inferInsert;

/**
 * Scan DSO Result - Parsed DSO submission data
 */
export const scanDsoResult = mysqlTable("scan_dso_result", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }).notNull().unique(),
  
  activitiesJson: json("activitiesJson"),
  indicativeOutcome: text("indicativeOutcome"),
  submissionRequirementsJson: json("submissionRequirementsJson"),
  competentAuthorityJson: json("competentAuthorityJson"),
  ruleRefsJson: json("ruleRefsJson"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanDsoResult = typeof scanDsoResult.$inferSelect;
export type InsertScanDsoResult = typeof scanDsoResult.$inferInsert;

/**
 * Scan Indicator Results - Results per indicator per dossier
 */
export const scanIndicatorResults = mysqlTable("scan_indicator_results", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }).notNull(),
  
  // Indicator identification
  code: varchar("code", { length: 50 }).notNull(),
  theme: varchar("theme", { length: 50 }),
  humanName: varchar("humanName", { length: 200 }),
  
  // Spatial result
  intersection: boolean("intersection"),
  distanceM: decimal("distanceM", { precision: 12, scale: 1 }),
  status: mysqlEnum("status", ["PRESENT", "NEAR", "NONE", "UNKNOWN"]).default("UNKNOWN"),
  
  // Features found
  featuresJson: json("featuresJson"),
  mapLayersJson: json("mapLayersJson"),
  
  // Source info
  sourceJson: json("sourceJson"),
  notes: text("notes"),
  
  // LLM narrative
  narrative: text("narrative"),
  controlPointsJson: json("controlPointsJson"),
  
  // Relevance score (from router)
  relevanceScore: int("relevanceScore").default(0),
  isPriority: boolean("isPriority").default(false),
  
  // Debug/audit
  debugJson: json("debugJson"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanIndicatorResult = typeof scanIndicatorResults.$inferSelect;
export type InsertScanIndicatorResult = typeof scanIndicatorResults.$inferInsert;

/**
 * Scan LLM Cache - Cache LLM responses for reuse
 */
export const scanLlmCache = mysqlTable("scan_llm_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 255 }).notNull().unique(),
  dossierId: varchar("dossierId", { length: 36 }),
  task: varchar("task", { length: 50 }).notNull(),
  indicatorCode: varchar("indicatorCode", { length: 50 }),
  templateVersion: varchar("templateVersion", { length: 20 }).notNull(),
  inputHash: varchar("inputHash", { length: 64 }).notNull(),
  outputJson: json("outputJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanLlmCache = typeof scanLlmCache.$inferSelect;
export type InsertScanLlmCache = typeof scanLlmCache.$inferInsert;

/**
 * Scan API Audit Log - Track all external API calls
 */
export const scanApiAuditLog = mysqlTable("scan_api_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }),
  service: varchar("service", { length: 50 }), // geocode, bag, plan, indicator, llm, report
  endpoint: text("endpoint"),
  requestMetaJson: json("requestMetaJson"),
  responseMetaJson: json("responseMetaJson"),
  status: varchar("status", { length: 10 }), // OK, FAIL
  latencyMs: int("latencyMs"),
  errorText: text("errorText"),
  cacheHit: boolean("cacheHit").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanApiAuditLog = typeof scanApiAuditLog.$inferSelect;
export type InsertScanApiAuditLog = typeof scanApiAuditLog.$inferInsert;

/**
 * Scan Exports - Generated PDF/JSON exports
 */
export const scanExports = mysqlTable("scan_exports", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: varchar("dossierId", { length: 36 }).notNull(),
  kind: mysqlEnum("kind", ["PDF", "JSON"]).notNull(),
  storageUrl: text("storageUrl").notNull(),
  storageKey: text("storageKey").notNull(),
  metaJson: json("metaJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanExport = typeof scanExports.$inferSelect;
export type InsertScanExport = typeof scanExports.$inferInsert;

import { eq, and, desc, sql, like, gte, lte, or, inArray, isNotNull, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  gemeenten, InsertGemeente, Gemeente,
  gemeenteRegioLookup, InsertGemeenteRegioLookup,
  seats, InsertSeat, Seat,
  beleidsdocumenten, InsertBeleidsdocument,
  behandelrapportLog, InsertBehandelrapportLog,
  adviseurs, InsertAdviseur,
  geminiCache, InsertGeminiCache,
  subscriptions, InsertSubscription, Subscription,
  payments, InsertPayment, Payment,
  kennisbankItems, InsertKennisbankItem, KennisbankItem,
  kennisbankRijksWetgeving, KennisbankRijksWetgeving,
  toetsingsmatrix, InsertToetsingsmatrix, Toetsingsmatrix,
  rapportFeedback, InsertRapportFeedback, RapportFeedback,
  feedbackPatronen, InsertFeedbackPatroon, FeedbackPatroon,
  scanDossiers, InsertScanDossier, ScanDossier,
  scanDossierFiles, InsertScanDossierFile, ScanDossierFile,
  scanNormalizedLocation, InsertScanNormalizedLocation, ScanNormalizedLocation,
  scanIndicatorResults, InsertScanIndicatorResult, ScanIndicatorResult,
  scanExports, InsertScanExport, ScanExport
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'super_admin';
      updateSet.role = 'super_admin';
    }
    if (user.gemeenteId !== undefined) {
      values.gemeenteId = user.gemeenteId;
      updateSet.gemeenteId = user.gemeenteId;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(userId: number, role: InsertUser['role'], gemeenteId?: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users)
    .set({ role, gemeenteId: gemeenteId ?? null })
    .where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ============ GEMEENTE FUNCTIONS ============

export async function getAllGemeenten() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(gemeenten).orderBy(gemeenten.gemeenteNaam);
}

export async function getGemeenteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(gemeenten).where(eq(gemeenten.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getGemeenteByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(gemeenten).where(eq(gemeenten.gemeenteNaam, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGemeente(gemeente: InsertGemeente) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(gemeenten).values(gemeente);
  return result;
}

export async function updateGemeente(id: number, data: Partial<InsertGemeente>) {
  const db = await getDb();
  if (!db) return;

  await db.update(gemeenten).set(data).where(eq(gemeenten.id, id));
}

export async function getGemeenteStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, pending: 0, totalSeats: 0 };

  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    active: sql<number>`SUM(CASE WHEN status = 'actief' THEN 1 ELSE 0 END)`,
    pending: sql<number>`SUM(CASE WHEN status = 'pending_activation' THEN 1 ELSE 0 END)`,
    totalSeats: sql<number>`SUM(seatsGekocht)`,
  }).from(gemeenten);

  return result[0] || { total: 0, active: 0, pending: 0, totalSeats: 0 };
}

// ============ GEMEENTE REGIO LOOKUP FUNCTIONS ============

export async function getRegioLookupByName(gemeenteNaam: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(gemeenteRegioLookup)
    .where(eq(gemeenteRegioLookup.gemeenteNaam, gemeenteNaam))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchGemeenteRegioLookup(query: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(gemeenteRegioLookup)
    .where(like(gemeenteRegioLookup.gemeenteNaam, `%${query}%`))
    .limit(10);
}

// ============ SEATS FUNCTIONS ============

export async function getSeatsByGemeente(gemeenteId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(seats).where(eq(seats.gemeenteId, gemeenteId)).orderBy(seats.naam);
}

export async function getSeatByEmail(email: string, gemeenteId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(seats)
    .where(and(eq(seats.email, email), eq(seats.gemeenteId, gemeenteId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSeatById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(seats)
    .where(eq(seats.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSeat(seat: InsertSeat) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(seats).values(seat);
}

export async function updateSeat(id: number, data: Partial<InsertSeat>) {
  const db = await getDb();
  if (!db) return;

  await db.update(seats).set(data).where(eq(seats.id, id));
}

export async function deleteSeat(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(seats).where(eq(seats.id, id));
}

export async function getActiveSeatsCount(gemeenteId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(seats)
    .where(and(eq(seats.gemeenteId, gemeenteId), eq(seats.status, 'actief')));
  return result[0]?.count || 0;
}

export async function getAllSeatsWithGemeente() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    seat: seats,
    gemeente: gemeenten,
  })
  .from(seats)
  .leftJoin(gemeenten, eq(seats.gemeenteId, gemeenten.id))
  .orderBy(desc(seats.createdAt));
}

// Get active seat by user email (checks all gemeenten)
export async function getActiveSeatByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select({
    seat: seats,
    gemeente: gemeenten,
  })
  .from(seats)
  .leftJoin(gemeenten, eq(seats.gemeenteId, gemeenten.id))
  .where(and(
    eq(seats.email, email),
    eq(seats.status, 'actief')
  ))
  .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

// Check if user has valid seat access for DSO upload
export async function checkSeatAccess(email: string): Promise<{
  hasAccess: boolean;
  seat?: Seat;
  gemeente?: Gemeente;
  reason?: string;
}> {
  const db = await getDb();
  if (!db) return { hasAccess: false, reason: 'Database niet beschikbaar' };

  // Find active seat for this email
  const seatResult = await db.select({
    seat: seats,
    gemeente: gemeenten,
  })
  .from(seats)
  .leftJoin(gemeenten, eq(seats.gemeenteId, gemeenten.id))
  .where(and(
    eq(seats.email, email),
    eq(seats.status, 'actief')
  ))
  .limit(1);

  if (seatResult.length === 0) {
    return { hasAccess: false, reason: 'Je hebt geen actieve seat. Neem contact op met je gemeente beheerder.' };
  }

  const { seat, gemeente } = seatResult[0];
  
  if (!gemeente) {
    return { hasAccess: false, reason: 'Gemeente niet gevonden.' };
  }

  // Check if gemeente has active status
  if (gemeente.status !== 'actief') {
    return { 
      hasAccess: false, 
      seat: seat,
      gemeente: gemeente,
      reason: `De gemeente ${gemeente.gemeenteNaam} heeft geen actief abonnement.` 
    };
  }

  return { 
    hasAccess: true, 
    seat: seat,
    gemeente: gemeente
  };
}

// ============ BELEIDSDOCUMENTEN FUNCTIONS ============

export async function getBeleidsdocumentenByGemeente(gemeenteId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(beleidsdocumenten).where(eq(beleidsdocumenten.gemeenteId, gemeenteId));
}

export async function createBeleidsdocument(doc: InsertBeleidsdocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(beleidsdocumenten).values(doc);
}

export async function updateBeleidsdocument(id: number, data: Partial<InsertBeleidsdocument>) {
  const db = await getDb();
  if (!db) return;

  await db.update(beleidsdocumenten).set(data).where(eq(beleidsdocumenten.id, id));
}

export async function deleteBeleidsdocument(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(beleidsdocumenten).where(eq(beleidsdocumenten.id, id));
}

// ============ BEHANDELRAPPORT LOG FUNCTIONS ============

export async function createBehandelrapport(rapport: InsertBehandelrapportLog): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(behandelrapportLog).values(rapport);
  // MySQL returns insertId in the result
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId };
}

export async function updateBehandelrapport(id: number, data: Partial<InsertBehandelrapportLog>) {
  const db = await getDb();
  if (!db) return;

  await db.update(behandelrapportLog).set(data).where(eq(behandelrapportLog.id, id));
}

export async function getBehandelrapportenByGemeente(gemeenteId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(behandelrapportLog)
    .where(eq(behandelrapportLog.gemeenteId, gemeenteId))
    .orderBy(desc(behandelrapportLog.datumRapport))
    .limit(limit);
}

export async function getBehandelrapportenByUser(email: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(behandelrapportLog)
    .where(eq(behandelrapportLog.behandelaarEmail, email))
    .orderBy(desc(behandelrapportLog.datumRapport))
    .limit(limit);
}

export async function getAllBehandelrapporten(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    rapport: behandelrapportLog,
    gemeente: gemeenten,
  })
  .from(behandelrapportLog)
  .leftJoin(gemeenten, eq(behandelrapportLog.gemeenteId, gemeenten.id))
  .orderBy(desc(behandelrapportLog.datumRapport))
  .limit(limit);
}

export async function getBehandelrapportStats() {
  const db = await getDb();
  if (!db) return { total: 0, today: 0, thisMonth: 0, avgDuration: 0 };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    today: sql<number>`SUM(CASE WHEN datumRapport >= ${startOfDay} THEN 1 ELSE 0 END)`,
    thisMonth: sql<number>`SUM(CASE WHEN datumRapport >= ${startOfMonth} THEN 1 ELSE 0 END)`,
    avgDuration: sql<number>`AVG(verwerkingDuurSec)`,
  }).from(behandelrapportLog);

  return result[0] || { total: 0, today: 0, thisMonth: 0, avgDuration: 0 };
}

// Archief: zoeken en filteren van rapporten
export async function getBehandelrapportenArchief(params: {
  gemeenteId: number;
  zoekterm?: string;
  behandelaar?: string;
  datumVan?: string;
  datumTot?: string;
  procedureType?: 'VERGUNNINGVRIJ' | 'REGULIER' | 'BOPA_REGULIER' | 'BOPA_UITGEBREID';
  limit: number;
  offset: number;
}) {
  const db = await getDb();
  if (!db) return { rapporten: [], total: 0 };

  const conditions = [eq(behandelrapportLog.gemeenteId, params.gemeenteId)];
  
  if (params.zoekterm) {
    const term = `%${params.zoekterm}%`;
    conditions.push(
      or(
        like(behandelrapportLog.zaaknummer, term),
        like(behandelrapportLog.adres, term),
        like(behandelrapportLog.projectNaam, term),
        like(behandelrapportLog.aanvragerNaam, term)
      )!
    );
  }
  
  if (params.behandelaar) {
    conditions.push(eq(behandelrapportLog.behandelaarEmail, params.behandelaar));
  }
  
  if (params.datumVan) {
    conditions.push(gte(behandelrapportLog.datumRapport, new Date(params.datumVan)));
  }
  
  if (params.datumTot) {
    conditions.push(lte(behandelrapportLog.datumRapport, new Date(params.datumTot)));
  }
  
  if (params.procedureType) {
    conditions.push(eq(behandelrapportLog.procedureType, params.procedureType));
  }

  const [rapporten, countResult] = await Promise.all([
    db.select({
      id: behandelrapportLog.id,
      zaaknummer: behandelrapportLog.zaaknummer,
      projectNaam: behandelrapportLog.projectNaam,
      aanvragerNaam: behandelrapportLog.aanvragerNaam,
      adres: behandelrapportLog.adres,
      woonplaats: behandelrapportLog.woonplaats,
      behandelaarNaam: behandelrapportLog.behandelaarNaam,
      behandelaarEmail: behandelrapportLog.behandelaarEmail,
      procedureType: behandelrapportLog.procedureType,
      isVergunningvrij: behandelrapportLog.isVergunningvrij,
      isNatura2000: behandelrapportLog.isNatura2000,
      isRijksmonument: behandelrapportLog.isRijksmonument,
      isBeschermdGezicht: behandelrapportLog.isBeschermdGezicht,
      isGrondwaterbescherming: behandelrapportLog.isGrondwaterbescherming,
      rapportSamenvatting: behandelrapportLog.rapportSamenvatting,
      pdfUrl: behandelrapportLog.pdfUrl,
      status: behandelrapportLog.status,
      datumRapport: behandelrapportLog.datumRapport,
    })
    .from(behandelrapportLog)
    .where(and(...conditions))
    .orderBy(desc(behandelrapportLog.datumRapport))
    .limit(params.limit)
    .offset(params.offset),
    
    db.select({ count: sql<number>`COUNT(*)` })
    .from(behandelrapportLog)
    .where(and(...conditions))
  ]);

  return {
    rapporten,
    total: countResult[0]?.count || 0,
  };
}

// Kaartdata: rapporten met coordinaten voor kaartweergave
export async function getBehandelrapportenKaartData(gemeenteId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: behandelrapportLog.id,
    zaaknummer: behandelrapportLog.zaaknummer,
    adres: behandelrapportLog.adres,
    wgs84Lat: behandelrapportLog.wgs84Lat,
    wgs84Lng: behandelrapportLog.wgs84Lng,
    procedureType: behandelrapportLog.procedureType,
    isNatura2000: behandelrapportLog.isNatura2000,
    isRijksmonument: behandelrapportLog.isRijksmonument,
    isBeschermdGezicht: behandelrapportLog.isBeschermdGezicht,
    isGrondwaterbescherming: behandelrapportLog.isGrondwaterbescherming,
    behandelaarNaam: behandelrapportLog.behandelaarNaam,
    datumRapport: behandelrapportLog.datumRapport,
  })
  .from(behandelrapportLog)
  .where(
    and(
      eq(behandelrapportLog.gemeenteId, gemeenteId),
      isNotNull(behandelrapportLog.wgs84Lat),
      isNotNull(behandelrapportLog.wgs84Lng)
    )
  )
  .orderBy(desc(behandelrapportLog.datumRapport));
}

// Enkel rapport ophalen met volledige data
export async function getBehandelrapportById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(behandelrapportLog)
    .where(eq(behandelrapportLog.id, id))
    .limit(1);

  return result[0] || null;
}

// Unieke behandelaars voor filter dropdown
export async function getBehandelaarsVoorGemeente(gemeenteId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.selectDistinct({
    naam: behandelrapportLog.behandelaarNaam,
    email: behandelrapportLog.behandelaarEmail,
  })
  .from(behandelrapportLog)
  .where(
    and(
      eq(behandelrapportLog.gemeenteId, gemeenteId),
      isNotNull(behandelrapportLog.behandelaarEmail)
    )
  )
  .orderBy(behandelrapportLog.behandelaarNaam);

  return result.filter(b => b.email); // Filter out nulls
}

// ============ ADVISEURS FUNCTIONS ============

export async function getAllAdviseurs() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(adviseurs).orderBy(adviseurs.naam);
}

export async function getAdviseursByType(type: 'extern' | 'intern') {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(adviseurs).where(eq(adviseurs.type, type)).orderBy(adviseurs.naam);
}

export async function createAdviseur(adviseur: InsertAdviseur) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(adviseurs).values(adviseur);
}

export async function updateAdviseur(id: number, data: Partial<InsertAdviseur>) {
  const db = await getDb();
  if (!db) return;

  await db.update(adviseurs).set(data).where(eq(adviseurs.id, id));
}

export async function deleteAdviseur(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(adviseurs).where(eq(adviseurs.id, id));
}

// ============ GEMINI CACHE FUNCTIONS ============

export async function getCachedGeminiResponse(cacheKey: string, gemeenteId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const result = await db.select()
    .from(geminiCache)
    .where(and(
      eq(geminiCache.cacheKey, cacheKey),
      eq(geminiCache.gemeenteId, gemeenteId),
      gte(geminiCache.expiresAt, now)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function setCachedGeminiResponse(data: InsertGeminiCache) {
  const db = await getDb();
  if (!db) return;

  await db.insert(geminiCache).values(data).onDuplicateKeyUpdate({
    set: {
      response: data.response,
      policyUpdateAt: data.policyUpdateAt,
      expiresAt: data.expiresAt,
    }
  });
}

export async function invalidateGeminiCache(gemeenteId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(geminiCache).where(eq(geminiCache.gemeenteId, gemeenteId));
}

export async function cleanExpiredCache() {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  await db.delete(geminiCache).where(lte(geminiCache.expiresAt, now));
}


// ============ SUBSCRIPTION FUNCTIONS ============

export async function createSubscription(subscription: InsertSubscription): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(subscriptions).values(subscription);
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId };
}

export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSubscriptionByMollieCustomerId(mollieCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.mollieCustomerId, mollieCustomerId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) return;

  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function updateSubscriptionByMollieId(mollieSubscriptionId: string, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) return;

  await db.update(subscriptions).set(data).where(eq(subscriptions.mollieSubscriptionId, mollieSubscriptionId));
}

export async function getActiveSubscriptions() {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(subscriptions)
    .where(and(
      eq(subscriptions.status, 'active'),
    ))
    .orderBy(desc(subscriptions.createdAt));
}

export async function getTrialSubscriptions() {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(subscriptions)
    .where(eq(subscriptions.status, 'trial'))
    .orderBy(subscriptions.trialEndDate);
}

export async function getExpiringTrials(daysFromNow: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const futureDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

  return db.select({
    subscription: subscriptions,
    user: users,
  })
  .from(subscriptions)
  .leftJoin(users, eq(subscriptions.userId, users.id))
  .where(and(
    eq(subscriptions.status, 'trial'),
    lte(subscriptions.trialEndDate, futureDate),
    gte(subscriptions.trialEndDate, now)
  ))
  .orderBy(subscriptions.trialEndDate);
}

// ============ PAYMENT FUNCTIONS ============

export async function createPayment(payment: InsertPayment): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(payments).values(payment);
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId };
}

export async function getPaymentByMollieId(molliePaymentId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(payments)
    .where(eq(payments.molliePaymentId, molliePaymentId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePaymentByMollieId(molliePaymentId: string, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) return;

  await db.update(payments).set(data).where(eq(payments.molliePaymentId, molliePaymentId));
}

export async function getPaymentsByUserId(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

export async function getPaymentsBySubscriptionId(subscriptionId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(payments)
    .where(eq(payments.subscriptionId, subscriptionId))
    .orderBy(desc(payments.createdAt));
}

export async function getPaymentStats() {
  const db = await getDb();
  if (!db) return { total: 0, totalRevenue: 0, thisMonth: 0, thisMonthRevenue: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db.select({
    total: sql<number>`COUNT(CASE WHEN status = 'paid' THEN 1 END)`,
    totalRevenue: sql<number>`SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)`,
    thisMonth: sql<number>`COUNT(CASE WHEN status = 'paid' AND paidAt >= ${startOfMonth} THEN 1 END)`,
    thisMonthRevenue: sql<number>`SUM(CASE WHEN status = 'paid' AND paidAt >= ${startOfMonth} THEN amount ELSE 0 END)`,
  }).from(payments);

  return result[0] || { total: 0, totalRevenue: 0, thisMonth: 0, thisMonthRevenue: 0 };
}

// ============ KENNISBANK FUNCTIONS ============

/**
 * Get rijks wetgeving (landelijke laag)
 */
export async function getRijksWetgeving(): Promise<KennisbankRijksWetgeving[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(kennisbankRijksWetgeving).where(eq(kennisbankRijksWetgeving.status, 'actief'));
}

/**
 * Get kennisbank items for a gemeente (gelaagde structuur)
 * Returns items from all applicable layers: rijks, provinciaal, regionaal, gemeentelijk
 */
export async function getKennisbankItems(params: {
  gemeenteId: number;
  provincie: string;
  regioCodes: string[];
}): Promise<KennisbankItem[]> {
  const db = await getDb();
  if (!db) return [];

  // Build conditions for each layer
  const conditions = or(
    // Rijks items (no scope)
    eq(kennisbankItems.laag, 'rijks'),
    // Provinciaal items
    and(
      eq(kennisbankItems.laag, 'provinciaal'),
      eq(kennisbankItems.scopeProvincie, params.provincie)
    ),
    // Regionaal items (match any of the regio codes)
    and(
      eq(kennisbankItems.laag, 'regionaal'),
      inArray(kennisbankItems.scopeRegioCode, params.regioCodes.length > 0 ? params.regioCodes : ['__none__'])
    ),
    // Gemeentelijk items
    and(
      eq(kennisbankItems.laag, 'gemeentelijk'),
      eq(kennisbankItems.scopeGemeenteId, params.gemeenteId)
    )
  );

  return db.select()
    .from(kennisbankItems)
    .where(and(
      conditions,
      eq(kennisbankItems.status, 'actief')
    ))
    .orderBy(kennisbankItems.laag, kennisbankItems.naam);
}

/**
 * Create a new kennisbank item
 */
export async function createKennisbankItem(item: InsertKennisbankItem): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(kennisbankItems).values(item);
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId };
}

/**
 * Update a kennisbank item
 */
export async function updateKennisbankItem(id: number, data: Partial<InsertKennisbankItem>) {
  const db = await getDb();
  if (!db) return;

  await db.update(kennisbankItems).set(data).where(eq(kennisbankItems.id, id));
}

/**
 * Delete a kennisbank item
 */
export async function deleteKennisbankItem(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(kennisbankItems).where(eq(kennisbankItems.id, id));
}

/**
 * Check if a regional item already exists
 */
export async function checkRegionalItemExists(
  naam: string,
  regioCode: string,
  itemType: 'adviseur' | 'beleidsdocument' | 'toetsingskader'
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select({ id: kennisbankItems.id })
    .from(kennisbankItems)
    .where(and(
      eq(kennisbankItems.laag, 'regionaal'),
      eq(kennisbankItems.scopeRegioCode, regioCode),
      eq(kennisbankItems.itemType, itemType),
      sql`LOWER(${kennisbankItems.naam}) = LOWER(${naam})`
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Check if a provincial item already exists
 */
export async function checkProvincialItemExists(
  naam: string,
  provincie: string,
  itemType: 'adviseur' | 'beleidsdocument' | 'toetsingskader'
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select({ id: kennisbankItems.id })
    .from(kennisbankItems)
    .where(and(
      eq(kennisbankItems.laag, 'provinciaal'),
      eq(kennisbankItems.scopeProvincie, provincie),
      eq(kennisbankItems.itemType, itemType),
      sql`LOWER(${kennisbankItems.naam}) = LOWER(${naam})`
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Get a single kennisbank item by ID
 */
export async function getKennisbankItemById(id: number): Promise<KennisbankItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(kennisbankItems).where(eq(kennisbankItems.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * List kennisbank items with filters (for admin UI)
 */
export async function listKennisbankItemsWithFilters(params: {
  laag?: 'basis' | 'rijks' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
  itemType?: 'adviseur' | 'beleidsdocument' | 'toetsingskader';
  status?: 'concept' | 'actief' | 'inactief';
  gemeenteId?: number;
  provincie?: string;
  regioCode?: string;
  zoekterm?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: KennisbankItem[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions: any[] = [];

  if (params.laag) {
    conditions.push(eq(kennisbankItems.laag, params.laag));
  }
  if (params.itemType) {
    conditions.push(eq(kennisbankItems.itemType, params.itemType));
  }
  if (params.status) {
    conditions.push(eq(kennisbankItems.status, params.status));
  }
  if (params.gemeenteId) {
    conditions.push(eq(kennisbankItems.scopeGemeenteId, params.gemeenteId));
  }
  if (params.provincie) {
    conditions.push(eq(kennisbankItems.scopeProvincie, params.provincie));
  }
  if (params.regioCode) {
    conditions.push(eq(kennisbankItems.scopeRegioCode, params.regioCode));
  }
  if (params.zoekterm) {
    conditions.push(or(
      like(kennisbankItems.naam, `%${params.zoekterm}%`),
      like(kennisbankItems.samenvatting, `%${params.zoekterm}%`)
    ));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db.select({ count: sql<number>`COUNT(*)` })
    .from(kennisbankItems)
    .where(whereClause);
  const total = countResult[0]?.count || 0;

  // Get items with pagination
  let query = db.select()
    .from(kennisbankItems)
    .where(whereClause)
    .orderBy(desc(kennisbankItems.updatedAt));

  if (params.limit) {
    query = query.limit(params.limit) as any;
  }
  if (params.offset) {
    query = query.offset(params.offset) as any;
  }

  const items = await query;

  return { items, total };
}

/**
 * Get kennisbank statistics
 */
export async function getKennisbankStats() {
  const db = await getDb();
  if (!db) return { total: 0, rijks: 0, provinciaal: 0, regionaal: 0, gemeentelijk: 0 };

  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    rijks: sql<number>`SUM(CASE WHEN laag = 'rijks' THEN 1 ELSE 0 END)`,
    provinciaal: sql<number>`SUM(CASE WHEN laag = 'provinciaal' THEN 1 ELSE 0 END)`,
    regionaal: sql<number>`SUM(CASE WHEN laag = 'regionaal' THEN 1 ELSE 0 END)`,
    gemeentelijk: sql<number>`SUM(CASE WHEN laag = 'gemeentelijk' THEN 1 ELSE 0 END)`,
  }).from(kennisbankItems).where(eq(kennisbankItems.status, 'actief'));

  return result[0] || { total: 0, rijks: 0, provinciaal: 0, regionaal: 0, gemeentelijk: 0 };
}

// ============ TOETSINGSMATRIX FUNCTIONS ============

export async function getToetsingsmatrixRegels(gemeenteId?: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all active rules (status = 'actief')
  return db.select().from(toetsingsmatrix)
    .where(eq(toetsingsmatrix.status, 'actief'))
    .orderBy(toetsingsmatrix.activiteitType, toetsingsmatrix.functieType);
}

export async function createToetsingsmatrixRegel(regel: {
  activiteitType: string;
  functieType: string;
  verplichtekaders: string[];
  optioneleKaders: string[];
  aandachtspunten: string[];
  gemeenteId: number | null;
  isActief: boolean;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(toetsingsmatrix).values({
    activiteitType: regel.activiteitType as any,
    functieType: regel.functieType as any,
    verplichteKaders: regel.verplichtekaders,
    optioneleKaders: regel.optioneleKaders,
    aandachtspunten: regel.aandachtspunten.join('; '),
    status: regel.isActief ? 'actief' : 'inactief',
  });
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId };
}

export async function updateToetsingsmatrixRegel(id: number, data: {
  activiteitType?: string;
  functieType?: string;
  verplichtekaders?: string[];
  optioneleKaders?: string[];
  aandachtspunten?: string[];
}) {
  const db = await getDb();
  if (!db) return;

  const updateData: Record<string, any> = {};
  if (data.activiteitType) updateData.activiteitType = data.activiteitType;
  if (data.functieType) updateData.functieType = data.functieType;
  if (data.verplichtekaders) updateData.verplichteKaders = data.verplichtekaders;
  if (data.optioneleKaders) updateData.optioneleKaders = data.optioneleKaders;
  if (data.aandachtspunten) updateData.aandachtspunten = data.aandachtspunten.join('; ');

  await db.update(toetsingsmatrix).set(updateData).where(eq(toetsingsmatrix.id, id));
}

export async function deleteToetsingsmatrixRegel(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(toetsingsmatrix).where(eq(toetsingsmatrix.id, id));
}


// ============ FEEDBACK FUNCTIONS (Zelflerend Systeem) ============

/**
 * Create new feedback on a rapport
 */
export async function createRapportFeedback(feedback: InsertRapportFeedback): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(rapportFeedback).values(feedback);
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId };
}

/**
 * Get all feedback for a specific rapport
 */
export async function getFeedbackByRapport(behandelrapportId: number): Promise<RapportFeedback[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(rapportFeedback)
    .where(eq(rapportFeedback.behandelrapportId, behandelrapportId))
    .orderBy(desc(rapportFeedback.createdAt));
}

/**
 * Get feedback statistics for a gemeente
 */
export async function getFeedbackStatsByGemeente(gemeenteId: number): Promise<{
  totaal: number;
  positief: number;
  negatief: number;
  neutraal: number;
  perType: { type: string; count: number }[];
}> {
  const db = await getDb();
  if (!db) return { totaal: 0, positief: 0, negatief: 0, neutraal: 0, perType: [] };

  const allFeedback = await db.select().from(rapportFeedback)
    .where(eq(rapportFeedback.gemeenteId, gemeenteId));

  const perType: Record<string, number> = {};
  let positief = 0, negatief = 0, neutraal = 0;

  for (const fb of allFeedback) {
    if (fb.score === 'positief') positief++;
    else if (fb.score === 'negatief') negatief++;
    else neutraal++;

    perType[fb.feedbackType] = (perType[fb.feedbackType] || 0) + 1;
  }

  return {
    totaal: allFeedback.length,
    positief,
    negatief,
    neutraal,
    perType: Object.entries(perType).map(([type, count]) => ({ type, count }))
  };
}

/**
 * Get unprocessed negative feedback for pattern detection
 */
export async function getUnprocessedNegativeFeedback(limit = 100): Promise<RapportFeedback[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(rapportFeedback)
    .where(and(
      eq(rapportFeedback.score, 'negatief'),
      eq(rapportFeedback.isVerwerkt, false)
    ))
    .orderBy(rapportFeedback.createdAt)
    .limit(limit);
}

/**
 * Mark feedback as processed
 */
export async function markFeedbackProcessed(id: number, notitie?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(rapportFeedback).set({
    isVerwerkt: true,
    verwerkingsNotitie: notitie
  }).where(eq(rapportFeedback.id, id));
}

/**
 * Create or update a feedback pattern
 */
export async function upsertFeedbackPatroon(patroon: InsertFeedbackPatroon): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if similar pattern exists
  const existing = await db.select().from(feedbackPatronen)
    .where(and(
      patroon.gemeenteId ? eq(feedbackPatronen.gemeenteId, patroon.gemeenteId) : isNull(feedbackPatronen.gemeenteId),
      eq(feedbackPatronen.patroonType, patroon.patroonType),
      patroon.triggerActiviteit ? eq(feedbackPatronen.triggerActiviteit, patroon.triggerActiviteit) : isNull(feedbackPatronen.triggerActiviteit),
      patroon.triggerBeschermingsregime ? eq(feedbackPatronen.triggerBeschermingsregime, patroon.triggerBeschermingsregime) : isNull(feedbackPatronen.triggerBeschermingsregime)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing pattern
    await db.update(feedbackPatronen).set({
      aantalVoorkomens: sql`${feedbackPatronen.aantalVoorkomens} + 1`,
      laatsteVoorkomen: new Date(),
      beschrijving: patroon.beschrijving,
      aiInstructie: patroon.aiInstructie
    }).where(eq(feedbackPatronen.id, existing[0].id));
    return { id: existing[0].id };
  }

  // Create new pattern
  const result = await db.insert(feedbackPatronen).values({
    ...patroon,
    laatsteVoorkomen: new Date()
  });
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId };
}

/**
 * Get active feedback patterns for a gemeente (includes provincial and national patterns)
 */
export async function getActiveFeedbackPatronen(gemeenteId?: number, provincie?: string): Promise<FeedbackPatroon[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(feedbackPatronen.status, 'actief'),
    or(
      // Gemeente-specific patterns (only if gemeenteId is provided)
      gemeenteId ? eq(feedbackPatronen.gemeenteId, gemeenteId) : sql`FALSE`,
      // Provincial patterns
      provincie ? and(
        isNull(feedbackPatronen.gemeenteId),
        eq(feedbackPatronen.provincie, provincie)
      ) : sql`FALSE`,
      // National patterns (no gemeente, no province)
      and(
        isNull(feedbackPatronen.gemeenteId),
        isNull(feedbackPatronen.provincie)
      )
    )
  ];

  return db.select().from(feedbackPatronen)
    .where(and(...conditions))
    .orderBy(desc(feedbackPatronen.aantalVoorkomens));
}

/**
 * Get feedback patterns for AI context (formatted for prompt injection)
 */
export async function getFeedbackPatronenForAI(gemeenteId: number, provincie?: string): Promise<string> {
  const patronen = await getActiveFeedbackPatronen(gemeenteId, provincie);
  
  if (patronen.length === 0) return '';

  let context = '\n## Geleerde Correcties (Zelflerend Systeem)\n';
  context += 'Op basis van eerdere feedback van behandelaars, let op de volgende punten:\n\n';

  for (const patroon of patronen) {
    const scope = patroon.gemeenteId ? 'gemeente-specifiek' : 
                  patroon.provincie ? `provinciaal (${patroon.provincie})` : 'landelijk';
    context += `### ${patroon.patroonType.replace('_', ' ')} (${scope}, ${patroon.aantalVoorkomens}x gemeld)\n`;
    if (patroon.triggerActiviteit) context += `- Trigger: activiteit "${patroon.triggerActiviteit}"\n`;
    if (patroon.triggerBeschermingsregime) context += `- Trigger: beschermingsregime "${patroon.triggerBeschermingsregime}"\n`;
    context += `- Instructie: ${patroon.aiInstructie}\n\n`;
  }

  return context;
}

/**
 * Get recent feedback for a specific gemeente
 */
export async function getRecentFeedbackByGemeente(gemeenteId: number, limit = 10): Promise<RapportFeedback[]> {
  const db = await getDb();
  if (!db) return [];

  const feedback = await db.select()
    .from(rapportFeedback)
    .where(eq(rapportFeedback.gemeenteId, gemeenteId))
    .orderBy(desc(rapportFeedback.createdAt))
    .limit(limit);

  return feedback;
}

/**
 * Get recent feedback for admin dashboard
 */
export async function getRecentFeedback(limit = 50): Promise<(RapportFeedback & { gemeenteNaam?: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const feedback = await db.select({
    feedback: rapportFeedback,
    gemeenteNaam: gemeenten.gemeenteNaam
  })
    .from(rapportFeedback)
    .leftJoin(gemeenten, eq(rapportFeedback.gemeenteId, gemeenten.id))
    .orderBy(desc(rapportFeedback.createdAt))
    .limit(limit);

  return feedback.map(f => ({
    ...f.feedback,
    gemeenteNaam: f.gemeenteNaam || undefined
  }));
}


/**
 * Get feedback submitted by a specific user
 */
export async function getFeedbackByUser(userId: number, limit = 20): Promise<RapportFeedback[]> {
  const db = await getDb();
  if (!db) return [];

  const feedback = await db.select()
    .from(rapportFeedback)
    .where(eq(rapportFeedback.userId, userId))
    .orderBy(desc(rapportFeedback.createdAt))
    .limit(limit);

  return feedback;
}


// ============ PILOT AANMELDINGEN FUNCTIONS ============

/**
 * Get all pilot gemeenten (gemeenten met actieve trial seats)
 * Returns gemeente info with seat counts and trial end dates
 */
export async function getPilotGemeenten() {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    id: gemeenten.id,
    gemeenteNaam: gemeenten.gemeenteNaam,
    gemeenteCode: gemeenten.gemeenteCode,
    provincie: gemeenten.provincie,
    status: gemeenten.status,
    seatsGekocht: gemeenten.seatsGekocht,
    contactBeheerder: gemeenten.contactBeheerder,
    createdAt: gemeenten.createdAt,
    updatedAt: gemeenten.updatedAt,
  })
  .from(gemeenten)
  .orderBy(desc(gemeenten.createdAt));

  // Get seat details for each gemeente
  const gemeenteIds = results.map(g => g.id);
  if (gemeenteIds.length === 0) return [];

  const seatDetails = await db.select({
    gemeenteId: seats.gemeenteId,
    totalSeats: sql<number>`COUNT(*)`,
    activeSeats: sql<number>`SUM(CASE WHEN status = 'actief' THEN 1 ELSE 0 END)`,
    earliestTrialEnd: sql<Date>`MIN(trialEndsAt)`,
    latestTrialEnd: sql<Date>`MAX(trialEndsAt)`,
  })
  .from(seats)
  .where(inArray(seats.gemeenteId, gemeenteIds))
  .groupBy(seats.gemeenteId);

  // Merge seat details with gemeente info
  return results.map(gemeente => {
    const seatInfo = seatDetails.find(s => s.gemeenteId === gemeente.id);
    return {
      ...gemeente,
      totalSeats: seatInfo?.totalSeats || 0,
      activeSeats: seatInfo?.activeSeats || 0,
      trialEndsAt: seatInfo?.latestTrialEnd || null,
      isPilot: seatInfo?.latestTrialEnd ? new Date(seatInfo.latestTrialEnd) > new Date() : false,
    };
  });
}

/**
 * Get pilot statistics
 */
export async function getPilotStats() {
  const db = await getDb();
  if (!db) return { 
    totalPilots: 0, 
    activePilots: 0, 
    expiredPilots: 0, 
    totalSeats: 0,
    expiringThisWeek: 0 
  };

  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Count gemeenten with trial seats
  const pilotGemeenten = await db.select({
    gemeenteId: seats.gemeenteId,
    latestTrialEnd: sql<Date>`MAX(trialEndsAt)`,
    seatCount: sql<number>`COUNT(*)`,
  })
  .from(seats)
  .where(isNotNull(seats.trialEndsAt))
  .groupBy(seats.gemeenteId);

  let activePilots = 0;
  let expiredPilots = 0;
  let expiringThisWeek = 0;
  let totalSeats = 0;

  for (const pilot of pilotGemeenten) {
    totalSeats += pilot.seatCount || 0;
    if (pilot.latestTrialEnd) {
      const trialEnd = new Date(pilot.latestTrialEnd);
      if (trialEnd > now) {
        activePilots++;
        if (trialEnd <= oneWeekFromNow) {
          expiringThisWeek++;
        }
      } else {
        expiredPilots++;
      }
    }
  }

  return {
    totalPilots: pilotGemeenten.length,
    activePilots,
    expiredPilots,
    totalSeats,
    expiringThisWeek,
  };
}

/**
 * Extend pilot trial for a gemeente
 */
export async function extendPilotTrial(gemeenteId: number, daysToAdd: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current seats for this gemeente
  const currentSeats = await db.select()
    .from(seats)
    .where(eq(seats.gemeenteId, gemeenteId));

  // Extend trial for all seats
  for (const seat of currentSeats) {
    const currentEnd = seat.trialEndsAt ? new Date(seat.trialEndsAt) : new Date();
    const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + daysToAdd * 24 * 60 * 60 * 1000);
    
    await db.update(seats)
      .set({ trialEndsAt: newEnd })
      .where(eq(seats.id, seat.id));
  }

  return { extended: currentSeats.length };
}

/**
 * Deactivate pilot for a gemeente
 */
export async function deactivatePilot(gemeenteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Set all seats to inactive
  await db.update(seats)
    .set({ status: 'inactief' })
    .where(eq(seats.gemeenteId, gemeenteId));

  // Update gemeente status
  await db.update(gemeenten)
    .set({ status: 'inactief' })
    .where(eq(gemeenten.id, gemeenteId));

  return { success: true };
}

/**
 * Get pilot details for a specific gemeente
 */
export async function getPilotDetails(gemeenteId: number) {
  const db = await getDb();
  if (!db) return null;

  const gemeente = await getGemeenteById(gemeenteId);
  if (!gemeente) return null;

  const gemeenteSeats = await db.select()
    .from(seats)
    .where(eq(seats.gemeenteId, gemeenteId))
    .orderBy(seats.createdAt);

  return {
    gemeente,
    seats: gemeenteSeats,
    totalSeats: gemeenteSeats.length,
    activeSeats: gemeenteSeats.filter(s => s.status === 'actief').length,
    trialEndsAt: gemeenteSeats.length > 0 
      ? gemeenteSeats.reduce((latest, s) => {
          if (!s.trialEndsAt) return latest;
          return !latest || new Date(s.trialEndsAt) > new Date(latest) ? s.trialEndsAt : latest;
        }, null as Date | null)
      : null,
  };
}


// ============ OMGEVINGSSCAN FUNCTIONS ============

export async function createScanDossier(data: InsertScanDossier): Promise<ScanDossier | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.insert(scanDossiers).values(data);
    const [row] = await db.select().from(scanDossiers).where(eq(scanDossiers.dossierId, data.dossierId));
    return row || null;
  } catch (error) {
    console.error("[Database] createScanDossier failed:", error);
    return null;
  }
}

export async function getScanDossier(dossierId: string): Promise<ScanDossier | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const [row] = await db.select().from(scanDossiers).where(eq(scanDossiers.dossierId, dossierId));
    return row || null;
  } catch (error) {
    console.error("[Database] getScanDossier failed:", error);
    return null;
  }
}

export async function getScanDossiersForGemeente(gemeenteId: number): Promise<ScanDossier[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(scanDossiers)
      .where(eq(scanDossiers.gemeenteId, gemeenteId))
      .orderBy(desc(scanDossiers.createdAt));
  } catch (error) {
    console.error("[Database] getScanDossiersForGemeente failed:", error);
    return [];
  }
}

export async function updateScanDossierStatus(dossierId: string, status: string, errorMessage?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(scanDossiers)
      .set({ status: status as any, errorMessage: errorMessage || null })
      .where(eq(scanDossiers.dossierId, dossierId));
  } catch (error) {
    console.error("[Database] updateScanDossierStatus failed:", error);
  }
}

export async function saveScanLocation(data: InsertScanNormalizedLocation): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(scanNormalizedLocation).values(data)
      .onDuplicateKeyUpdate({ set: { ...data } });
  } catch (error) {
    console.error("[Database] saveScanLocation failed:", error);
  }
}

export async function getScanLocation(dossierId: string): Promise<ScanNormalizedLocation | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const [row] = await db.select().from(scanNormalizedLocation)
      .where(eq(scanNormalizedLocation.dossierId, dossierId));
    return row || null;
  } catch (error) {
    console.error("[Database] getScanLocation failed:", error);
    return null;
  }
}

export async function saveScanIndicatorResults(dossierId: string, results: InsertScanIndicatorResult[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    // Delete existing results for this dossier
    await db.delete(scanIndicatorResults).where(eq(scanIndicatorResults.dossierId, dossierId));
    // Insert new results
    if (results.length > 0) {
      await db.insert(scanIndicatorResults).values(results);
    }
  } catch (error) {
    console.error("[Database] saveScanIndicatorResults failed:", error);
  }
}

export async function getScanIndicatorResults(dossierId: string): Promise<ScanIndicatorResult[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(scanIndicatorResults)
      .where(eq(scanIndicatorResults.dossierId, dossierId));
  } catch (error) {
    console.error("[Database] getScanIndicatorResults failed:", error);
    return [];
  }
}

export async function saveScanExport(data: InsertScanExport): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(scanExports).values(data);
  } catch (error) {
    console.error("[Database] saveScanExport failed:", error);
  }
}

export async function getScanExports(dossierId: string): Promise<ScanExport[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(scanExports)
      .where(eq(scanExports.dossierId, dossierId))
      .orderBy(desc(scanExports.createdAt));
  } catch (error) {
    console.error("[Database] getScanExports failed:", error);
    return [];
  }
}

export async function saveScanDossierFile(data: InsertScanDossierFile): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(scanDossierFiles).values(data);
  } catch (error) {
    console.error("[Database] saveScanDossierFile failed:", error);
  }
}

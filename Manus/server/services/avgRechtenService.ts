/**
 * AVG Rechten Service
 * 
 * Implementeert de rechten van betrokkenen onder de AVG:
 * - Art. 15: Recht op inzage
 * - Art. 17: Recht op vergetelheid (wissen)
 * - Art. 20: Recht op overdraagbaarheid
 */

import { getDb } from "../db";
import { 
  users, 
  seats, 
  behandelrapportLog, 
  rapportFeedback,
  payments
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface UserDataExport {
  exportDatum: string;
  gebruiker: {
    id: number;
    openId: string;
    naam: string | null;
    email: string | null;
    rol: string;
    gemeenteId: number | null;
    aangemaakt: Date;
    laatsteLogin: Date;
  };
  seats: Array<{
    id: number;
    email: string;
    naam: string | null;
    rol: string;
    status: string;
    aangemaakt: Date;
  }>;
  rapporten: Array<{
    id: number;
    zaaknummer: string;
    projectNaam: string | null;
    aanvragerNaam: string | null;
    adres: string | null;
    procedureType: string | null;
    status: string | null;
    datumRapport: Date;
  }>;
  feedback: Array<{
    id: number;
    rapportId: number;
    type: string;
    score: string;
    correctie: string | null;
    aangemaakt: Date;
  }>;
  betalingen: Array<{
    id: number;
    bedrag: string | null;
    status: string;
    datum: Date;
  }>;
}

export interface DeletionResult {
  success: boolean;
  deletedRecords: {
    users: number;
    seats: number;
    rapporten: number;
    feedback: number;
    betalingen: number;
  };
  errors: string[];
}

/**
 * Exporteer alle persoonsgegevens van een gebruiker (Art. 15 & 20)
 * 
 * Dit omvat:
 * - Gebruikersaccount gegevens
 * - Seats (werkplekken)
 * - Behandelrapporten waar gebruiker behandelaar is
 * - Feedback gegeven door gebruiker
 * - Betalingsgeschiedenis
 */
export async function exportUserData(userId: number): Promise<UserDataExport> {
  const db = await getDb();
  if (!db) throw new Error("Database niet beschikbaar");

  // 1. Haal gebruiker op
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new Error("Gebruiker niet gevonden");
  }

  // 2. Haal seats op (via email)
  const userSeats = user.email 
    ? await db.select().from(seats).where(eq(seats.email, user.email))
    : [];

  // 3. Haal rapporten op waar gebruiker behandelaar is
  const userRapporten = user.email
    ? await db.select().from(behandelrapportLog).where(eq(behandelrapportLog.behandelaarEmail, user.email))
    : [];

  // 4. Haal feedback op gegeven door gebruiker
  const userFeedback = await db.select().from(rapportFeedback).where(eq(rapportFeedback.userId, userId));

  // 5. Haal betalingen op (via subscription userId)
  const userPayments = await db.select().from(payments).where(eq(payments.userId, userId));

  // 6. Formatteer export
  return {
    exportDatum: new Date().toISOString(),
    gebruiker: {
      id: user.id,
      openId: user.openId,
      naam: user.name,
      email: user.email,
      rol: user.role,
      gemeenteId: user.gemeenteId,
      aangemaakt: user.createdAt,
      laatsteLogin: user.lastSignedIn
    },
    seats: userSeats.map((s) => ({
      id: s.id,
      email: s.email,
      naam: s.naam,
      rol: s.rol,
      status: s.status,
      aangemaakt: s.createdAt
    })),
    rapporten: userRapporten.map((r) => ({
      id: r.id,
      zaaknummer: r.zaaknummer,
      projectNaam: r.projectNaam,
      aanvragerNaam: r.aanvragerNaam,
      adres: r.adres,
      procedureType: r.procedureType,
      status: r.status,
      datumRapport: r.datumRapport
    })),
    feedback: userFeedback.map((f) => ({
      id: f.id,
      rapportId: f.behandelrapportId,
      type: f.feedbackType,
      score: f.score,
      correctie: f.correctie,
      aangemaakt: f.createdAt
    })),
    betalingen: userPayments.map((p) => ({
      id: p.id,
      bedrag: p.amount,
      status: p.status,
      datum: p.createdAt
    }))
  };
}

/**
 * Verwijder alle persoonsgegevens van een gebruiker (Art. 17)
 * 
 * BELANGRIJK: Dit is een onomkeerbare actie!
 * 
 * Verwijdert:
 * - Gebruikersaccount
 * - Seats gekoppeld aan email
 * - Feedback gegeven door gebruiker
 * 
 * Anonimiseert (i.p.v. verwijderen voor audit trail):
 * - Behandelrapporten (behandelaarNaam/Email wordt geanonimiseerd)
 * 
 * Behoudt (wettelijke bewaarplicht):
 * - Betalingsgegevens (7 jaar fiscale bewaarplicht)
 */
export async function deleteUserData(userId: number): Promise<DeletionResult> {
  const db = await getDb();
  if (!db) throw new Error("Database niet beschikbaar");

  const result: DeletionResult = {
    success: false,
    deletedRecords: {
      users: 0,
      seats: 0,
      rapporten: 0,
      feedback: 0,
      betalingen: 0
    },
    errors: []
  };

  try {
    // 1. Haal gebruiker op
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      result.errors.push("Gebruiker niet gevonden");
      return result;
    }

    // 2. Verwijder feedback gegeven door gebruiker
    const feedbackResult = await db.delete(rapportFeedback)
      .where(eq(rapportFeedback.userId, userId));
    result.deletedRecords.feedback = feedbackResult[0]?.affectedRows || 0;

    // 3. Anonimiseer rapporten (behoud voor audit trail, maar verwijder PII)
    if (user.email) {
      const rapportenResult = await db.update(behandelrapportLog)
        .set({
          behandelaarNaam: "[VERWIJDERD]",
          behandelaarEmail: "[VERWIJDERD]"
        })
        .where(eq(behandelrapportLog.behandelaarEmail, user.email));
      result.deletedRecords.rapporten = rapportenResult[0]?.affectedRows || 0;
    }

    // 4. Verwijder seats gekoppeld aan email
    if (user.email) {
      const seatsResult = await db.delete(seats)
        .where(eq(seats.email, user.email));
      result.deletedRecords.seats = seatsResult[0]?.affectedRows || 0;
    }

    // 5. Verwijder gebruikersaccount
    const userResult = await db.delete(users)
      .where(eq(users.id, userId));
    result.deletedRecords.users = userResult[0]?.affectedRows || 0;

    // Betalingen worden NIET verwijderd (fiscale bewaarplicht 7 jaar)
    // result.deletedRecords.betalingen = 0;

    result.success = true;
  } catch (error) {
    result.errors.push(`Fout bij verwijderen: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Controleer of een gebruiker kan worden verwijderd
 * 
 * Retourneert false als:
 * - Gebruiker is super_admin
 * - Gebruiker is enige gemeente_beheerder van een actieve gemeente
 */
export async function canDeleteUser(userId: number): Promise<{ canDelete: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { canDelete: false, reason: "Database niet beschikbaar" };

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    return { canDelete: false, reason: "Gebruiker niet gevonden" };
  }

  // Super admins kunnen niet worden verwijderd
  if (user.role === "super_admin") {
    return { canDelete: false, reason: "Super admin accounts kunnen niet worden verwijderd" };
  }

  // Check of gebruiker enige beheerder is van een gemeente
  if (user.role === "gemeente_beheerder" && user.gemeenteId) {
    const otherBeheerders = await db.select()
      .from(users)
      .where(and(
        eq(users.gemeenteId, user.gemeenteId),
        eq(users.role, "gemeente_beheerder")
      ));

    if (otherBeheerders.length <= 1) {
      return { 
        canDelete: false, 
        reason: "U bent de enige beheerder van uw gemeente. Wijs eerst een andere beheerder aan." 
      };
    }
  }

  return { canDelete: true };
}

/**
 * Log een AVG verzoek voor audit doeleinden
 */
export async function logAVGVerzoek(
  userId: number, 
  type: "export" | "delete", 
  success: boolean,
  details?: string
): Promise<void> {
  // Voor nu loggen we naar console, later kan dit naar een audit tabel
  console.log(`[AVG] ${new Date().toISOString()} - User ${userId} - ${type} - ${success ? "SUCCESS" : "FAILED"} - ${details || ""}`);
}

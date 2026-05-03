import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getLocationData } from "./services/pdok";
import { analyzeDSOAanvraag, GemeenteContext, DSOAanvraag } from "./services/gemini";
import { generatePDFBuffer, generateReportFilename, generateReportHTML } from "./services/pdfGenerator";
import { sendBehandelrapport } from "./services/email";
import { handleWebhookEvent, verifyWebhookSignature, LemonSqueezyWebhookPayload } from "./services/lemonSqueezy";
import * as mollie from "./services/mollie";
import { notifyOwner } from "./_core/notification";
import { generateKennisbankForGemeente, GemeenteContext as KBGemeenteContext, getKennisbankForGemeente, adviseurSuggestieToDbItem, documentSuggestieToDbItem, calculateKennisbankStats, GelaagdKennisbankItem } from "./services/kennisbankGenerator";
import { classificeerDocument, ClassificatieInput } from "./services/documentClassifier";
import { createDatabaseBackup } from "./services/backup";
import { omgevingsscanRouter } from "./routers/omgevingsscan";

// ============ RBAC MIDDLEWARE ============

const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Super admin access required' });
  }
  return next({ ctx });
});

const beheerderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['super_admin', 'admin', 'gemeente_beheerder'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Beheerder access required' });
  }
  return next({ ctx });
});

const behandelaarProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['super_admin', 'admin', 'gemeente_beheerder', 'ambtenaar_gebruiker'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Behandelaar access required' });
  }
  return next({ ctx });
});

// ============ AUTH ROUTER ============

const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ============ GEMEENTE ROUTER ============

const gemeenteRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllGemeenten();
  }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getGemeenteById(input.id);
    }),
  
  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return db.getGemeenteByName(input.name);
    }),
  
  stats: superAdminProcedure.query(async () => {
    return db.getGemeenteStats();
  }),
  
  create: superAdminProcedure
    .input(z.object({
      gemeenteNaam: z.string(),
      gemeenteCode: z.string(),
      provincie: z.enum(['Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland', 'Zuid-Holland']),
      waterschapNaam: z.string().optional(),
      waterschapCode: z.string().optional(),
      vrNaam: z.string().optional(),
      vrCode: z.string().optional(),
      odNaam: z.string().optional(),
      odCode: z.string().optional(),
      ggdNaam: z.string().optional(),
      ggdCode: z.string().optional(),
      contactBeheerder: z.string().optional(),
      seatsGekocht: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createGemeente(input);
    }),
  
  update: beheerderProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        contactBeheerder: z.string().optional(),
        welstandsniveauDefault: z.enum(['Regulier', 'Bijzonder', 'Soepel']).optional(),
        heeftBeschermdGezicht: z.boolean().optional(),
        status: z.enum(['pending_activation', 'actief', 'inactief', 'geannuleerd']).optional(),
        seatsGekocht: z.number().optional(),
        lastPolicyUpdate: z.date().optional(),
        neemConceptenMee: z.boolean().optional(), // Concept-modus toggle
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateGemeente(input.id, input.data);
      return { success: true };
    }),
  
  lookupRegio: publicProcedure
    .input(z.object({ gemeenteNaam: z.string() }))
    .query(async ({ input }) => {
      return db.getRegioLookupByName(input.gemeenteNaam);
    }),
  
  searchRegio: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return db.searchGemeenteRegioLookup(input.query);
    }),
});

// ============ SEATS ROUTER ============

const seatsRouter = router({
  listByGemeente: beheerderProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      return db.getSeatsByGemeente(input.gemeenteId);
    }),
  
  listAll: superAdminProcedure.query(async () => {
    return db.getAllSeatsWithGemeente();
  }),
  
  create: beheerderProcedure
    .input(z.object({
      email: z.string().email(),
      naam: z.string().optional(),
      gemeenteId: z.number(),
      rol: z.enum(['behandelaar', 'beheerder']),
    }))
    .mutation(async ({ input }) => {
      // Check if seat already exists
      const existing = await db.getSeatByEmail(input.email, input.gemeenteId);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Seat already exists for this email' });
      }
      
      // Check seat limit
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      if (!gemeente) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gemeente not found' });
      }
      
      const activeSeats = await db.getActiveSeatsCount(input.gemeenteId);
      if (activeSeats >= (gemeente.seatsGekocht || 0)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Seat limit reached' });
      }
      
      return db.createSeat({ ...input, status: 'uitgenodigd' });
    }),
  
  update: beheerderProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        naam: z.string().optional(),
        rol: z.enum(['behandelaar', 'beheerder']).optional(),
        status: z.enum(['actief', 'inactief', 'uitgenodigd']).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateSeat(input.id, input.data);
      return { success: true };
    }),
  
  delete: beheerderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteSeat(input.id);
      return { success: true };
    }),
  
  getActiveCount: beheerderProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      return db.getActiveSeatsCount(input.gemeenteId);
    }),

  // Check if current user has seat access for DSO upload
  checkAccess: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.email) {
      return { hasAccess: false, reason: 'Geen email gevonden voor je account.' };
    }
    
    // Super admins always have access
    if (ctx.user.role === 'super_admin' || ctx.user.role === 'admin') {
      return { 
        hasAccess: true, 
        isAdmin: true,
        reason: 'Admin toegang'
      };
    }
    
    return db.checkSeatAccess(ctx.user.email);
  }),
});

// ============ BELEIDSDOCUMENTEN ROUTER ============

const beleidsdocumentenRouter = router({
  listByGemeente: behandelaarProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      return db.getBeleidsdocumentenByGemeente(input.gemeenteId);
    }),
  
  // AI-classificatie voor document suggesties
  classificeer: beheerderProcedure
    .input(z.object({
      documentNaam: z.string(),
      documentInhoud: z.string().optional(),
      documentUrl: z.string().optional(),
      gemeenteId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Haal gemeente info op voor context
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      
      const classificatieInput: ClassificatieInput = {
        documentNaam: input.documentNaam,
        documentInhoud: input.documentInhoud,
        documentUrl: input.documentUrl,
        gemeenteNaam: gemeente?.gemeenteNaam,
        provincieNaam: gemeente?.provincie,
      };
      
      const suggestie = await classificeerDocument(classificatieInput);
      return suggestie;
    }),
  
  create: beheerderProcedure
    .input(z.object({
      documentNaam: z.string(),
      documentType: z.enum(['welstandsnota', 'parkeerbeleid', 'erfgoedbeleid', 'beleidsregels_afwijken', 'overig']),
      gemeenteId: z.number(),
      url: z.string().optional(),
      relevantieTags: z.string().optional(),
      altijdOphalen: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createBeleidsdocument(input);
    }),
  
  update: beheerderProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        documentNaam: z.string().optional(),
        url: z.string().optional(),
        relevantieTags: z.string().optional(),
        altijdOphalen: z.boolean().optional(),
        geminiFileId: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateBeleidsdocument(input.id, input.data);
      return { success: true };
    }),
  
  delete: beheerderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteBeleidsdocument(input.id);
      return { success: true };
    }),
});

// ============ BEHANDELRAPPORT ROUTER ============

const behandelrapportRouter = router({
  // Archief: alle rapporten voor een gemeente (voor collega's)
  archief: behandelaarProcedure
    .input(z.object({ 
      gemeenteId: z.number(),
      zoekterm: z.string().optional(),
      behandelaar: z.string().optional(),
      datumVan: z.string().optional(),
      datumTot: z.string().optional(),
      procedureType: z.enum(['VERGUNNINGVRIJ', 'REGULIER', 'BOPA_REGULIER', 'BOPA_UITGEBREID']).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      return db.getBehandelrapportenArchief(input);
    }),
  
  // Kaartdata: alle rapporten met coordinaten voor kaartweergave
  kaartData: behandelaarProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      return db.getBehandelrapportenKaartData(input.gemeenteId);
    }),
  
  // Enkel rapport ophalen met volledige data
  getById: behandelaarProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getBehandelrapportById(input.id);
    }),
  
  // Behandelaars lijst voor filter dropdown
  behandelaars: behandelaarProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      return db.getBehandelaarsVoorGemeente(input.gemeenteId);
    }),

  listByGemeente: behandelaarProcedure
    .input(z.object({ gemeenteId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getBehandelrapportenByGemeente(input.gemeenteId, input.limit);
    }),
  
  listByUser: behandelaarProcedure
    .input(z.object({ email: z.string(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getBehandelrapportenByUser(input.email, input.limit);
    }),
  
  listAll: superAdminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getAllBehandelrapporten(input?.limit);
    }),
  
  stats: superAdminProcedure.query(async () => {
    return db.getBehandelrapportStats();
  }),
  
  create: behandelaarProcedure
    .input(z.object({
      zaaknummer: z.string(),
      gemeenteId: z.number(),
      behandelaarNaam: z.string().optional(),
      behandelaarEmail: z.string().optional(),
      seatId: z.number().optional(),
      adres: z.string().optional(),
      kadastraalNummer: z.string().optional(),
      rdX: z.string().optional(),
      rdY: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createBehandelrapport({
        ...input,
        status: 'verwerking',
      });
    }),
  
  update: behandelaarProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        procedureType: z.enum(['VERGUNNINGVRIJ', 'REGULIER', 'BOPA_REGULIER', 'BOPA_UITGEBREID']).optional(),
        isVergunningvrij: z.boolean().optional(),
        pdfUrl: z.string().optional(),
        rapportData: z.any().optional(),
        status: z.enum(['verwerking', 'verzonden', 'mislukt']).optional(),
        verwerkingDuurSec: z.string().optional(),
        aiKostenEur: z.string().optional(),
        kennisbankBronnen: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateBehandelrapport(input.id, input.data);
      return { success: true };
    }),
});

// ============ ADVISEURS ROUTER ============

const adviseursRouter = router({
  list: behandelaarProcedure.query(async () => {
    return db.getAllAdviseurs();
  }),
  
  listByType: behandelaarProcedure
    .input(z.object({ type: z.enum(['extern', 'intern']) }))
    .query(async ({ input }) => {
      return db.getAdviseursByType(input.type);
    }),
  
  create: superAdminProcedure
    .input(z.object({
      naam: z.string(),
      type: z.enum(['extern', 'intern']),
      categorie: z.string().optional(),
      triggers: z.array(z.string()).optional(),
      termijnWeken: z.number().optional(),
      grondslag: z.string().optional(),
      contactEmail: z.string().optional(),
      contactTelefoon: z.string().optional(),
      regioCode: z.string().optional(),
      isLandelijk: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createAdviseur({
        ...input,
        triggers: input.triggers ? JSON.stringify(input.triggers) : null,
      });
    }),
  
  update: superAdminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        naam: z.string().optional(),
        categorie: z.string().optional(),
        triggers: z.array(z.string()).optional(),
        termijnWeken: z.number().optional(),
        grondslag: z.string().optional(),
        contactEmail: z.string().optional(),
        contactTelefoon: z.string().optional(),
        regioCode: z.string().optional(),
        isLandelijk: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const updateData = {
        ...input.data,
        triggers: input.data.triggers ? JSON.stringify(input.data.triggers) : undefined,
      };
      await db.updateAdviseur(input.id, updateData);
      return { success: true };
    }),
  
  delete: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAdviseur(input.id);
      return { success: true };
    }),
});

// ============ USERS ROUTER (Admin) ============

const usersRouter = router({
  list: superAdminProcedure.query(async () => {
    return db.getAllUsers();
  }),
  
  updateRole: superAdminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(['user', 'admin', 'super_admin', 'gemeente_beheerder', 'ambtenaar_gebruiker']),
      gemeenteId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role, input.gemeenteId);
      return { success: true };
    }),
});

// ============ DSO ANALYSE ROUTER ============

const analyseRouter = router({
  // PDOK locatie lookup
  pdokLookup: behandelaarProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      return getLocationData(input.address);
    }),
  
  // Volledige DSO analyse
  analyzeDSO: behandelaarProcedure
    .input(z.object({
      zaaknummer: z.string(),
      gemeenteId: z.number(),
      activiteiten: z.array(z.string()),
      omschrijving: z.string().optional(),
      adres: z.string().optional(),
      behandelaarNaam: z.string().optional(),
      behandelaarEmail: z.string().optional(),
      bijlagen: z.array(z.object({
        naam: z.string(),
        type: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      
      // Get gemeente context
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      if (!gemeente) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gemeente not found' });
      }
      
      // Create rapport record
      const rapport = await db.createBehandelrapport({
        zaaknummer: input.zaaknummer,
        gemeenteId: input.gemeenteId,
        behandelaarNaam: input.behandelaarNaam,
        behandelaarEmail: input.behandelaarEmail,
        adres: input.adres,
        status: 'verwerking',
      });
      
      try {
        // PDOK lookup if address provided
        let pdokData = null;
        if (input.adres) {
          pdokData = await getLocationData(input.adres);
        }
        
        // Fetch kennisbank data for this gemeente
        const adviseurs = await db.getAllAdviseurs();
        const beleidsdocumenten = await db.getBeleidsdocumentenByGemeente(input.gemeenteId);
        
        // Fetch toetsingskaders from gelaagde kennisbank
        const kennisbankItems = await db.getKennisbankItems({
          gemeenteId: input.gemeenteId,
          provincie: gemeente.provincie,
          regioCodes: [
            gemeente.waterschapCode,
            gemeente.vrCode,
            gemeente.odCode,
            gemeente.ggdCode,
          ].filter(Boolean) as string[],
        });
        
        // Extract toetsingskaders from kennisbank items
        const toetsingskaders = kennisbankItems
          .filter(item => item.itemType === 'toetsingskader')
          .map(item => ({
            naam: item.naam,
            laag: item.laag,
            beschrijving: item.samenvatting || '',
            toepassingscriteria: item.toepassingscriteria || undefined,
          }));
        
        // Build gemeente context for AI with kennisbank
        const gemeenteContext: GemeenteContext = {
          id: gemeente.id,
          gemeenteNaam: gemeente.gemeenteNaam,
          provincie: gemeente.provincie,
          waterschapCode: gemeente.waterschapCode || undefined,
          waterschapNaam: gemeente.waterschapNaam || undefined,
          vrCode: gemeente.vrCode || undefined,
          vrNaam: gemeente.vrNaam || undefined,
          odCode: gemeente.odCode || undefined,
          odNaam: gemeente.odNaam || undefined,
          ggdCode: gemeente.ggdCode || undefined,
          ggdNaam: gemeente.ggdNaam || undefined,
          welstandsniveauDefault: gemeente.welstandsniveauDefault || undefined,
          heeftBeschermdGezicht: gemeente.heeftBeschermdGezicht || false,
          lastPolicyUpdate: gemeente.lastPolicyUpdate || undefined,
          // Include kennisbank context for AI
          kennisbank: {
            adviseurs: adviseurs.map(a => ({
              naam: a.naam,
              type: a.type as 'intern' | 'extern',
              categorie: a.categorie || '',
              triggers: a.triggers ? (typeof a.triggers === 'string' ? (a.triggers.startsWith('[') ? JSON.parse(a.triggers) : [a.triggers]) : []) : [],
              termijnWeken: a.termijnWeken || 4,
              grondslag: a.grondslag || '',
              isVerplicht: false,
            })),
            beleidsdocumenten: beleidsdocumenten.map(d => ({
              naam: d.documentNaam,
              type: d.documentType,
              relevantieTags: d.relevantieTags || undefined,
            })),
            toetsingskaders,
          },
        };
        
        // Build aanvraag for AI
        const aanvraag: DSOAanvraag = {
          zaaknummer: input.zaaknummer,
          activiteiten: input.activiteiten,
          omschrijving: input.omschrijving,
          adres: input.adres,
          coordinates: pdokData?.coordinates || undefined,
          natura2000: pdokData?.natura2000,
          archeologie: pdokData?.archeologie,
          bijlagen: input.bijlagen,
        };
        
        // Run AI analysis
        const analysisResult = await analyzeDSOAanvraag(aanvraag, gemeenteContext);
        
        // Generate PDF
        const pdfBuffer = await generatePDFBuffer(
          analysisResult,
          gemeente.gemeenteNaam,
          input.behandelaarNaam || 'Behandelaar'
        );
        const pdfFilename = generateReportFilename(input.zaaknummer);
        
        // Send email with PDF attachment
        let emailResult: { success: boolean; messageId?: string; error?: string } = { success: false };
        if (input.behandelaarEmail) {
          emailResult = await sendBehandelrapport(
            input.behandelaarEmail,
            input.behandelaarNaam || 'Behandelaar',
            input.zaaknummer,
            gemeente.gemeenteNaam,
            pdfBuffer,
            pdfFilename
          );
        }
        
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Update rapport with results
        // Status is 'verzonden' als analyse succesvol is (email is optioneel)
        await db.updateBehandelrapport(rapport.id, {
          procedureType: analysisResult.procedureType,
          isVergunningvrij: analysisResult.isVergunningvrij,
          rapportData: JSON.stringify(analysisResult),
          status: 'verzonden', // Analyse voltooid, email is optioneel
          verwerkingDuurSec: durationSec,
          kennisbankBronnen: JSON.stringify(analysisResult.bronnen),
          rdX: pdokData?.coordinates?.rdX?.toString(),
          rdY: pdokData?.coordinates?.rdY?.toString(),
        });
        
        return {
          success: true,
          rapportId: rapport.id,
          analysisResult,
          emailSent: emailResult.success,
          durationSec,
        };
        
      } catch (error) {
        console.error('[Analyse] Error:', error);
        
        await db.updateBehandelrapport(rapport.id, {
          status: 'mislukt',
          verwerkingDuurSec: ((Date.now() - startTime) / 1000).toFixed(1),
        });
        
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Analysis failed' 
        });
      }
    }),
});

// ============ LEMON SQUEEZY ROUTER ============

const lemonRouter = router({
  webhook: publicProcedure
    .input(z.object({
      payload: z.any(),
      signature: z.string(),
    }))
    .mutation(async ({ input }) => {
      const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
      
      if (!secret) {
        console.warn('[Lemon] Webhook secret not configured');
        return { success: false, message: 'Webhook not configured' };
      }
      
      // Verify signature
      const payloadString = JSON.stringify(input.payload);
      if (!verifyWebhookSignature(payloadString, input.signature, secret)) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid signature' });
      }
      
      // Process webhook
      return handleWebhookEvent(input.payload as LemonSqueezyWebhookPayload);
    }),
});

// ============ DEMO ROUTER ============

const demoRouter = router({
  submit: publicProcedure
    .input(z.object({
      naam: z.string().min(1),
      email: z.string().email(),
      gemeente: z.string().min(1),
      telefoon: z.string().optional(),
      bericht: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Send notification to owner
      const notificationContent = `
**Nieuwe demo aanvraag ontvangen!**

**Naam:** ${input.naam}
**E-mail:** ${input.email}
**Gemeente:** ${input.gemeente}
**Telefoon:** ${input.telefoon || 'Niet opgegeven'}

**Bericht:**
${input.bericht || 'Geen bericht'}

---
Neem binnen 24 uur contact op met deze potentiële klant.
      `.trim();

      try {
        await notifyOwner({
          title: `Demo aanvraag: ${input.gemeente}`,
          content: notificationContent,
        });
      } catch (error) {
        console.error('[Demo] Failed to send notification:', error);
        // Don't fail the request if notification fails
      }

      return {
        success: true,
        message: 'Demo aanvraag ontvangen',
      };
    }),
});

// ============ PAYMENT ROUTER (MOLLIE) ============

const paymentRouter = router({
  createCheckout: protectedProcedure
    .input(z.object({
      plan: z.enum(['monthly', 'yearly']),
      paymentMethod: z.enum(['ideal', 'creditcard', 'bancontact']),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // Prices
      const prices = {
        monthly: 149,
        yearly: 1490,
      };
      
      // Calculate trial end date (30 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      const startDate = trialEndDate.toISOString().split('T')[0];
      
      try {
        // Create or get Mollie customer
        const customer = await mollie.createCustomer(
          user.email || `user-${user.id}@ro-flow.nl`,
          user.name || `Gebruiker ${user.id}`
        );
        
        // Create first payment to set up mandate
        // Note: For recurring payments, we don't specify a method - Mollie will show
        // all methods that support recurring payments (creditcard, SEPA direct debit)
        // Use the published Manus space URL for redirects
        const baseUrl = process.env.APP_URL || 'https://roflowai-25kmsrzd.manus.space';
        const payment = await mollie.createFirstPayment({
          customerId: customer.id,
          amount: 0.01, // Minimal amount for mandate setup
          description: `Ro-flow Pro ${input.plan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'} - Proefperiode`,
          redirectUrl: `${baseUrl}/checkout/success?plan=${input.plan}&customerId=${customer.id}`,
          webhookUrl: `${baseUrl}/api/webhooks/mollie`,
          // Don't specify method - let Mollie show all recurring-capable methods
          metadata: {
            userId: user.id.toString(),
            plan: input.plan,
            amount: prices[input.plan].toString(),
            startDate,
          },
        });
        
        // Create subscription record in database (trial status)
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        
        await db.createSubscription({
          userId: user.id,
          mollieCustomerId: customer.id,
          plan: input.plan,
          amount: prices[input.plan].toString(),
          trialStartDate: trialStart,
          trialEndDate: trialEnd,
          status: 'trial',
          nextBillingDate: trialEnd,
          metadata: {
            paymentId: payment.id,
            plan: input.plan,
          },
        });
        
        // Create payment record
        await db.createPayment({
          userId: user.id,
          molliePaymentId: payment.id,
          mollieCustomerId: customer.id,
          amount: '0.01',
          description: `Ro-flow Pro ${input.plan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'} - Proefperiode`,
          status: 'open',
          metadata: {
            userId: user.id.toString(),
            plan: input.plan,
          },
        });
        
        return {
          success: true,
          checkoutUrl: payment.checkoutUrl,
          paymentId: payment.id,
        };
      } catch (error) {
        console.error('[Payment] Error creating checkout:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Kon betaling niet aanmaken',
        });
      }
    }),
    
  getPaymentStatus: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ input }) => {
      try {
        const payment = await mollie.getPayment(input.paymentId);
        return payment;
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Betaling niet gevonden',
        });
      }
    }),
  
  // Get current user's subscription
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await db.getSubscriptionByUserId(ctx.user.id);
    return subscription || null;
  }),
  
  // Get payment history
  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    return db.getPaymentsByUserId(ctx.user.id);
  }),
  
  // Cancel subscription
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await db.getSubscriptionByUserId(ctx.user.id);
    
    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Geen actief abonnement gevonden',
      });
    }
    
    try {
      // Cancel in Mollie if there's an active subscription
      if (subscription.mollieSubscriptionId) {
        await mollie.cancelSubscription(
          subscription.mollieCustomerId,
          subscription.mollieSubscriptionId
        );
      }
      
      // Update database
      await db.updateSubscription(subscription.id, {
        status: 'canceled',
        canceledAt: new Date(),
      });
      
      return { success: true };
    } catch (error) {
      console.error('[Payment] Error canceling subscription:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Kon abonnement niet opzeggen',
      });
    }
  }),
  
  // Process webhook from Mollie (called by Express route)
  processWebhook: publicProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Webhook] Processing payment:', input.paymentId);
        
        // Get payment details from Mollie
        const payment = await mollie.getPayment(input.paymentId);
        console.log('[Webhook] Payment status:', payment.status);
        
        // Update payment record in database
        await db.updatePaymentByMollieId(input.paymentId, {
          status: payment.status as any,
          method: payment.method || null,
          paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
        });
        
        // If payment is successful (paid), create the Mollie subscription
        if (payment.status === 'paid' && payment.metadata) {
          const metadata = payment.metadata as any;
          const userId = parseInt(metadata.userId);
          const plan = metadata.plan as 'monthly' | 'yearly';
          const amount = parseFloat(metadata.amount);
          const startDate = metadata.startDate;
          
          console.log('[Webhook] Creating subscription for user:', userId);
          
          // Get the subscription record
          const subscription = await db.getSubscriptionByUserId(userId);
          
          if (subscription && !subscription.mollieSubscriptionId) {
            // Get customer ID from payment
            const customerId = payment.metadata ? (payment.metadata as any).customerId || subscription.mollieCustomerId : subscription.mollieCustomerId;
            
            // Create Mollie subscription starting after trial
            const baseUrl = process.env.APP_URL || 'https://roflowai-25kmsrzd.manus.space';
            const mollieSubscription = await mollie.createSubscription({
              customerId: subscription.mollieCustomerId,
              amount: amount,
              interval: plan === 'monthly' ? 'monthly' : 'yearly',
              description: `Ro-flow Pro ${plan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}`,
              webhookUrl: `${baseUrl}/api/webhooks/mollie`,
              startDate: startDate, // Start after trial period
              metadata: {
                userId: userId.toString(),
                plan: plan,
              },
            });
            
            console.log('[Webhook] Mollie subscription created:', mollieSubscription.id);
            
            // Update subscription record with Mollie subscription ID
            await db.updateSubscription(subscription.id, {
              mollieSubscriptionId: mollieSubscription.id,
              nextBillingDate: mollieSubscription.nextPaymentDate ? new Date(mollieSubscription.nextPaymentDate) : null,
            });
            
            // Notify owner of new subscription
            try {
              const user = await db.getUserByOpenId(subscription.mollieCustomerId);
              await notifyOwner({
                title: 'Nieuwe proefperiode gestart',
                content: `Gebruiker ${userId} is gestart met een ${plan === 'monthly' ? 'maandelijks' : 'jaarlijks'} abonnement (proefperiode). Eerste betaling: ${startDate}`,
              });
            } catch (e) {
              console.error('[Webhook] Failed to notify owner:', e);
            }
          }
        }
        
        return { success: true };
      } catch (error) {
        console.error('[Webhook] Error processing payment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Webhook processing failed',
        });
      }
    }),

  // Send trial expiration reminders (called by cron job or manually)
  sendTrialReminders: publicProcedure
    .input(z.object({
      daysBeforeExpiry: z.number().default(7),
      secretKey: z.string().optional(), // For cron job authentication
    }))
    .mutation(async ({ input }) => {
      // Simple secret key check for cron job security
      const expectedKey = process.env.CRON_SECRET_KEY || 'ro-flow-cron-secret';
      if (input.secretKey && input.secretKey !== expectedKey) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid secret key' });
      }

      try {
        // Get all trial subscriptions expiring in X days
        const expiringTrials = await db.getExpiringTrials(input.daysBeforeExpiry);
        
        console.log(`[Reminders] Found ${expiringTrials.length} trials expiring in ${input.daysBeforeExpiry} days`);
        
        const results = [];
        
        for (const { subscription, user } of expiringTrials) {
          if (!user?.email) {
            console.log(`[Reminders] Skipping subscription ${subscription.id} - no email`);
            continue;
          }
          
          const daysLeft = Math.ceil(
            (new Date(subscription.trialEndDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          
          // Notify owner about expiring trial
          try {
            await notifyOwner({
              title: `Proefperiode verloopt over ${daysLeft} dagen`,
              content: `De proefperiode van ${user.name || user.email} (${user.email}) verloopt op ${new Date(subscription.trialEndDate!).toLocaleDateString('nl-NL')}. Plan: ${subscription.plan === 'monthly' ? 'Maandelijks €149' : 'Jaarlijks €1.490'}. Na de proefperiode wordt automatisch de eerste betaling geïncasseerd.`,
            });
            
            results.push({
              subscriptionId: subscription.id,
              email: user.email,
              daysLeft,
              status: 'sent',
            });
          } catch (error) {
            console.error(`[Reminders] Failed to send reminder for subscription ${subscription.id}:`, error);
            results.push({
              subscriptionId: subscription.id,
              email: user.email,
              daysLeft,
              status: 'failed',
              error: String(error),
            });
          }
        }
        
        return {
          success: true,
          processed: results.length,
          results,
        };
      } catch (error) {
        console.error('[Reminders] Error sending trial reminders:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send trial reminders',
        });
      }
    }),
});

// ============ KENNISBANK ROUTER ============

const kennisbankRouter = router({
  // Get complete kennisbank for a gemeente (gelaagde structuur)
  getForGemeente: behandelaarProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      if (!gemeente) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gemeente niet gevonden' });
      }
      
      // Get existing data from database
      const adviseurs = await db.getAllAdviseurs();
      const beleidsdocumenten = await db.getBeleidsdocumentenByGemeente(input.gemeenteId);
      
      // Get rijks wetgeving from new table
      const rijksWetgeving = await db.getRijksWetgeving();
      
      // Get gelaagde kennisbank items
      const kennisbankItems = await db.getKennisbankItems({
        gemeenteId: gemeente.id,
        provincie: gemeente.provincie,
        regioCodes: [
          gemeente.waterschapCode,
          gemeente.vrCode,
          gemeente.odCode,
          gemeente.ggdCode,
        ].filter(Boolean) as string[],
      });
      
      return {
        gemeente: {
          id: gemeente.id,
          naam: gemeente.gemeenteNaam,
          provincie: gemeente.provincie,
          waterschap: gemeente.waterschapNaam,
          veiligheidsregio: gemeente.vrNaam,
          omgevingsdienst: gemeente.odNaam,
          ggd: gemeente.ggdNaam,
        },
        // Gelaagde structuur
        rijksWetgeving,
        kennisbankItems: {
          rijks: kennisbankItems.filter(i => i.laag === 'rijks'),
          provinciaal: kennisbankItems.filter(i => i.laag === 'provinciaal'),
          regionaal: kennisbankItems.filter(i => i.laag === 'regionaal'),
          gemeentelijk: kennisbankItems.filter(i => i.laag === 'gemeentelijk'),
        },
        // Legacy format voor backwards compatibility
        adviseurs: adviseurs.map(a => {
          let parsedTriggers: string[] = [];
          if (a.triggers) {
            try {
              const parsed = JSON.parse(a.triggers as string);
              parsedTriggers = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              parsedTriggers = [String(a.triggers)];
            }
          }
          return { ...a, triggers: parsedTriggers };
        }),
        beleidsdocumenten,
        laatstBijgewerkt: gemeente.lastPolicyUpdate || gemeente.updatedAt,
      };
    }),
  
  // Generate AI suggestions for a gemeente (gelaagde structuur)
  generateSuggestions: beheerderProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .mutation(async ({ input }) => {
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      if (!gemeente) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gemeente niet gevonden' });
      }
      
      console.log('[Kennisbank] Generating AI suggestions for', gemeente.gemeenteNaam);
      
      try {
        const gemeenteContext: KBGemeenteContext = {
          gemeenteId: gemeente.id,
          gemeenteNaam: gemeente.gemeenteNaam,
          provincie: gemeente.provincie,
          waterschapCode: gemeente.waterschapCode || undefined,
          waterschapNaam: gemeente.waterschapNaam || undefined,
          vrCode: gemeente.vrCode || undefined,
          vrNaam: gemeente.vrNaam || undefined,
          odCode: gemeente.odCode || undefined,
          odNaam: gemeente.odNaam || undefined,
          ggdCode: gemeente.ggdCode || undefined,
          ggdNaam: gemeente.ggdNaam || undefined,
        };
        
        const suggestions = await generateKennisbankForGemeente(gemeenteContext);
        
        return {
          success: true,
          suggestions,
        };
      } catch (error) {
        console.error('[Kennisbank] AI generation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Kon geen suggesties genereren',
        });
      }
    }),
  
  // Apply AI suggestions (human-in-the-loop approval)
  applySuggestions: beheerderProcedure
    .input(z.object({
      gemeenteId: z.number(),
      adviseurs: z.array(z.object({
        naam: z.string(),
        type: z.enum(['intern', 'extern']),
        categorie: z.string(),
        triggers: z.array(z.string()),
        termijnWeken: z.number(),
        grondslag: z.string(),
        contactInfo: z.string().optional(),
        isVerplicht: z.boolean(),
      })).optional(),
      beleidsdocumenten: z.array(z.object({
        naam: z.string(),
        type: z.enum(['welstandsnota', 'parkeerbeleid', 'erfgoedbeleid', 'beleidsregels_afwijken', 'gezondheidsbeleid', 'groenbeleid', 'overig']),
        beschrijving: z.string(),
        url: z.string().optional(),
        relevantieTags: z.array(z.string()),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const results = {
        adviseursCreated: 0,
        documentsCreated: 0,
      };
      
      // Create approved adviseurs
      if (input.adviseurs) {
        for (const adviseur of input.adviseurs) {
          await db.createAdviseur({
            naam: adviseur.naam,
            type: adviseur.type,
            categorie: adviseur.categorie,
            triggers: JSON.stringify(adviseur.triggers),
            termijnWeken: adviseur.termijnWeken,
            grondslag: adviseur.grondslag,
            contactEmail: adviseur.contactInfo || null,
            isLandelijk: false,
          });
          results.adviseursCreated++;
        }
      }
      
      // Create approved beleidsdocumenten
      if (input.beleidsdocumenten) {
        for (const doc of input.beleidsdocumenten) {
          await db.createBeleidsdocument({
            documentNaam: doc.naam,
            documentType: doc.type,
            gemeenteId: input.gemeenteId,
            url: doc.url || null,
            relevantieTags: doc.relevantieTags.join(','),
          });
          results.documentsCreated++;
        }
      }
      
      // Update gemeente lastPolicyUpdate
      await db.updateGemeente(input.gemeenteId, {
        lastPolicyUpdate: new Date(),
      });
      
      return {
        success: true,
        ...results,
      };
    }),
  
  // Get overview stats
  stats: superAdminProcedure.query(async () => {
    const adviseurs = await db.getAllAdviseurs();
    const gemeenten = await db.getAllGemeenten();
    
    // Count beleidsdocumenten per gemeente
    const docCounts: Record<number, number> = {};
    for (const gemeente of gemeenten) {
      const docs = await db.getBeleidsdocumentenByGemeente(gemeente.id);
      docCounts[gemeente.id] = docs.length;
    }
    
    return {
      totalAdviseurs: adviseurs.length,
      interneAdviseurs: adviseurs.filter(a => a.type === 'intern').length,
      externeAdviseurs: adviseurs.filter(a => a.type === 'extern').length,
      landelijkeAdviseurs: adviseurs.filter(a => a.isLandelijk).length,
      gemeentenMetBeleid: Object.values(docCounts).filter(c => c > 0).length,
      totalBeleidsdocumenten: Object.values(docCounts).reduce((a, b) => a + b, 0),
    };
  }),

  // ============ CRUD VOOR ALLE GEBRUIKERS ============
  
  // List items with filters (for beheer UI)
  list: behandelaarProcedure
    .input(z.object({
      laag: z.enum(['basis', 'rijks', 'provinciaal', 'regionaal', 'gemeentelijk']).optional(),
      itemType: z.enum(['adviseur', 'beleidsdocument', 'toetsingskader']).optional(),
      status: z.enum(['concept', 'actief', 'inactief']).optional(),
      gemeenteId: z.number().optional(),
      provincie: z.string().optional(),
      regioCode: z.string().optional(),
      zoekterm: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return db.listKennisbankItemsWithFilters(input);
    }),
  
  // Get single item by ID
  getById: behandelaarProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const item = await db.getKennisbankItemById(input.id);
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Kennisbank item niet gevonden' });
      }
      return item;
    }),
  
  // Create new item (alle behandelaars kunnen items toevoegen)
  create: behandelaarProcedure
    .input(z.object({
      laag: z.enum(['basis', 'rijks', 'provinciaal', 'regionaal', 'gemeentelijk']),
      itemType: z.enum(['adviseur', 'beleidsdocument', 'toetsingskader']),
      naam: z.string().min(1),
      samenvatting: z.string().optional(),
      url: z.string().optional(),
      triggers: z.string().optional(), // JSON array van triggers
      juridischeStatus: z.enum(['normstellend', 'richtinggevend', 'afwegingskader']).optional(),
      wettelijkeBasis: z.string().optional(),
      // Scope velden
      scopeGemeenteId: z.number().optional(),
      scopeProvincie: z.string().optional(),
      scopeRegioCode: z.string().optional(),
      // Extra velden voor adviseurs
      adviseurType: z.enum(['intern', 'extern']).optional(),
      contactEmail: z.string().optional(),
      termijnWeken: z.number().optional(),
      // Status
      status: z.enum(['concept', 'actief', 'inactief']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Valideer scope op basis van laag
      if (input.laag === 'gemeentelijk' && !input.scopeGemeenteId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Gemeente ID is verplicht voor gemeentelijke items' });
      }
      if (input.laag === 'provinciaal' && !input.scopeProvincie) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Provincie is verplicht voor provinciale items' });
      }
      if (input.laag === 'regionaal' && !input.scopeRegioCode) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Regio code is verplicht voor regionale items' });
      }
      
      const result = await db.createKennisbankItem({
        laag: input.laag,
        itemType: input.itemType,
        naam: input.naam,
        samenvatting: input.samenvatting || null,
        documentUrl: input.url || null,
        triggers: input.triggers ? JSON.parse(input.triggers) : null,
        juridischeStatus: input.juridischeStatus || 'richtinggevend',
        adviseurGrondslag: input.wettelijkeBasis || null,
        scopeGemeenteId: input.scopeGemeenteId || null,
        scopeProvincie: input.scopeProvincie || null,
        scopeRegioCode: input.scopeRegioCode || null,
        adviseurType: input.adviseurType || null,
        adviseurContactEmail: input.contactEmail || null,
        adviseurTermijnWeken: input.termijnWeken || null,
        status: input.status || 'actief',
        createdBy: ctx.user.id,
      });
      
      return { success: true, id: result.id };
    }),
  
  // Update existing item
  update: behandelaarProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        naam: z.string().optional(),
        samenvatting: z.string().optional(),
        url: z.string().optional(),
        triggers: z.string().optional(),
        juridischeStatus: z.enum(['normstellend', 'richtinggevend', 'afwegingskader']).optional(),
        wettelijkeBasis: z.string().optional(),
        adviseurType: z.enum(['intern', 'extern']).optional(),
        contactEmail: z.string().optional(),
        termijnWeken: z.number().optional(),
        status: z.enum(['concept', 'actief', 'inactief']).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateKennisbankItem(input.id, input.data);
      return { success: true };
    }),
  
  // Delete item (soft delete via status)
  delete: behandelaarProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Soft delete door status op 'inactief' te zetten
      await db.updateKennisbankItem(input.id, { status: 'inactief' });
      return { success: true };
    }),
  
  // Hard delete (alleen beheerders)
  hardDelete: beheerderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteKennisbankItem(input.id);
      return { success: true };
    }),
  
  // Get kennisbank stats per laag
  statsPerLaag: behandelaarProcedure.query(async () => {
    return db.getKennisbankStats();
  }),
  
  // Bulk import items from CSV/Excel data
  bulkImport: behandelaarProcedure
    .input(z.object({
      items: z.array(z.object({
        laag: z.enum(['basis', 'rijks', 'provinciaal', 'regionaal', 'gemeentelijk']),
        itemType: z.enum(['adviseur', 'beleidsdocument', 'toetsingskader']),
        naam: z.string().min(1),
        samenvatting: z.string().optional(),
        url: z.string().optional(),
        triggers: z.string().optional(),
        juridischeStatus: z.enum(['normstellend', 'richtinggevend', 'afwegingskader']).optional(),
        wettelijkeBasis: z.string().optional(),
        scopeGemeenteId: z.number().optional(),
        scopeProvincie: z.string().optional(),
        scopeRegioCode: z.string().optional(),
        adviseurType: z.enum(['intern', 'extern']).optional(),
        contactEmail: z.string().optional(),
        termijnWeken: z.number().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as { row: number; naam: string; error: string }[],
      };
      
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        try {
          // Valideer scope op basis van laag
          if (item.laag === 'gemeentelijk' && !item.scopeGemeenteId) {
            throw new Error('Gemeente ID is verplicht voor gemeentelijke items');
          }
          if (item.laag === 'provinciaal' && !item.scopeProvincie) {
            throw new Error('Provincie is verplicht voor provinciale items');
          }
          if (item.laag === 'regionaal' && !item.scopeRegioCode) {
            throw new Error('Regio code is verplicht voor regionale items');
          }
          
          await db.createKennisbankItem({
            laag: item.laag,
            itemType: item.itemType,
            naam: item.naam,
            samenvatting: item.samenvatting || null,
            documentUrl: item.url || null,
            triggers: item.triggers ? JSON.parse(item.triggers) : null,
            juridischeStatus: item.juridischeStatus || 'richtinggevend',
            adviseurGrondslag: item.wettelijkeBasis || null,
            scopeGemeenteId: item.scopeGemeenteId || null,
            scopeProvincie: item.scopeProvincie || null,
            scopeRegioCode: item.scopeRegioCode || null,
            adviseurType: item.adviseurType || null,
            adviseurContactEmail: item.contactEmail || null,
            adviseurTermijnWeken: item.termijnWeken || null,
            status: 'actief',
            createdBy: ctx.user.id,
          });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            naam: item.naam,
            error: error instanceof Error ? error.message : 'Onbekende fout',
          });
        }
      }
      
      return results;
    }),
  
  // Download CSV template
  getTemplate: publicProcedure.query(() => {
    const headers = [
      'laag',
      'itemType',
      'naam',
      'samenvatting',
      'url',
      'triggers',
      'juridischeStatus',
      'wettelijkeBasis',
      'scopeProvincie',
      'scopeRegioCode',
      'adviseurType',
      'contactEmail',
      'termijnWeken',
    ];
    
    const exampleRows = [
      ['rijks', 'toetsingskader', 'Besluit bouwwerken leefomgeving', 'Technische eisen voor bouwwerken', 'https://wetten.overheid.nl/BWBR0041297', '["bouwen","verbouwen"]', 'normstellend', 'Omgevingswet art. 4.3', '', '', '', '', ''],
      ['provinciaal', 'beleidsdocument', 'Omgevingsverordening NH 2022', 'Provinciale regels voor de fysieke leefomgeving', 'https://lokaleregelgeving.overheid.nl/...', '["ruimtelijke ordening"]', 'normstellend', 'Omgevingswet art. 2.22', 'Noord-Holland', '', '', '', ''],
      ['regionaal', 'adviseur', 'Hoogheemraadschap Hollands Noorderkwartier', 'Waterschap voor waterbeheer en -veiligheid', 'https://www.hhnk.nl', '["water","watertoets"]', 'richtinggevend', 'Waterwet', '', 'HHNK', 'extern', 'info@hhnk.nl', '6'],
      ['gemeentelijk', 'beleidsdocument', 'Welstandsnota Hoorn 2023', 'Gemeentelijk welstandsbeleid', 'https://hoorn.nl/welstand', '["bouwen","welstand"]', 'richtinggevend', 'Omgevingswet art. 4.19', '', '', '', '', ''],
    ];
    
    const csvContent = [
      headers.join(';'),
      ...exampleRows.map(row => row.join(';')),
    ].join('\n');
    
    return {
      filename: 'kennisbank_import_template.csv',
      content: csvContent,
      headers,
      description: `
Kennisbank Import Template
==========================

Kolommen:
- laag: basis | rijks | provinciaal | regionaal | gemeentelijk
- itemType: adviseur | beleidsdocument | toetsingskader
- naam: Naam van het item (verplicht)
- samenvatting: Korte beschrijving
- url: Link naar document of website
- triggers: JSON array van trefwoorden, bijv. ["bouwen","verbouwen"]
- juridischeStatus: normstellend | richtinggevend | afwegingskader
- wettelijkeBasis: Wettelijke grondslag
- scopeProvincie: Verplicht voor provinciale items (bijv. "Noord-Holland")
- scopeRegioCode: Verplicht voor regionale items (bijv. "HHNK")
- adviseurType: intern | extern (alleen voor adviseurs)
- contactEmail: E-mailadres (alleen voor adviseurs)
- termijnWeken: Adviestermijn in weken (alleen voor adviseurs)

Let op:
- Gebruik puntkomma (;) als scheidingsteken
- scopeGemeenteId wordt automatisch ingevuld bij gemeentelijke items
- Triggers moeten als JSON array worden opgegeven
`,
    };
  }),
});

// ============ TOETSINGSMATRIX ROUTER ============

const toetsingsmatrixRouter = router({
  list: beheerderProcedure.query(async ({ ctx }) => {
    return db.getToetsingsmatrixRegels(ctx.user.gemeenteId || undefined);
  }),
  
  create: beheerderProcedure
    .input(z.object({
      activiteitType: z.string(),
      functieType: z.string(),
      verplichtekaders: z.array(z.string()),
      optioneleKaders: z.array(z.string()),
      aandachtspunten: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createToetsingsmatrixRegel({
        ...input,
        gemeenteId: ctx.user.gemeenteId || null,
        isActief: true,
      });
    }),
  
  update: beheerderProcedure
    .input(z.object({
      id: z.number(),
      activiteitType: z.string(),
      functieType: z.string(),
      verplichtekaders: z.array(z.string()),
      optioneleKaders: z.array(z.string()),
      aandachtspunten: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      return db.updateToetsingsmatrixRegel(input.id, {
        activiteitType: input.activiteitType,
        functieType: input.functieType,
        verplichtekaders: input.verplichtekaders,
        optioneleKaders: input.optioneleKaders,
        aandachtspunten: input.aandachtspunten,
      });
    }),
  
  delete: beheerderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteToetsingsmatrixRegel(input.id);
    }),
});

// ============ FEEDBACK ROUTER (Zelflerend Systeem) ============

const feedbackRouter = router({
  // Submit feedback on a rapport section
  submit: behandelaarProcedure
    .input(z.object({
      behandelrapportId: z.number(),
      feedbackType: z.enum(['algemeen', 'procedure', 'adviseurs', 'toetsingskaders', 'volledigheid', 'juridisch', 'beleidsdocumenten', 'overig']),
      score: z.enum(['positief', 'negatief', 'neutraal']),
      correctie: z.string().optional(),
      redenIncorrect: z.string().optional(),
      origineleWaarde: z.string().optional(),
      gecorrigeerdeWaarde: z.string().optional(),
      activiteitType: z.string().optional(),
      beschermingsregime: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get rapport to find gemeenteId
      const rapport = await db.getBehandelrapportById(input.behandelrapportId);
      if (!rapport) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Rapport niet gevonden' });
      }

      const feedback = await db.createRapportFeedback({
        behandelrapportId: input.behandelrapportId,
        gemeenteId: rapport.gemeenteId,
        userId: ctx.user.id,
        behandelaarNaam: ctx.user.name || undefined,
        behandelaarEmail: ctx.user.email || undefined,
        feedbackType: input.feedbackType,
        score: input.score,
        correctie: input.correctie,
        redenIncorrect: input.redenIncorrect,
        origineleWaarde: input.origineleWaarde,
        gecorrigeerdeWaarde: input.gecorrigeerdeWaarde,
        activiteitType: input.activiteitType,
        beschermingsregime: input.beschermingsregime,
      });

      // If negative feedback, check if we should create a pattern
      if (input.score === 'negatief' && input.correctie) {
        // Auto-create pattern suggestion for admin review
        await db.upsertFeedbackPatroon({
          gemeenteId: rapport.gemeenteId,
          patroonType: input.feedbackType === 'procedure' ? 'procedure_correctie' :
                       input.feedbackType === 'adviseurs' ? 'adviseur_gemist' :
                       input.feedbackType === 'toetsingskaders' ? 'toetsingskader_gemist' :
                       'overig',
          triggerActiviteit: input.activiteitType,
          triggerBeschermingsregime: input.beschermingsregime,
          beschrijving: input.redenIncorrect || input.correctie,
          aiInstructie: input.gecorrigeerdeWaarde || input.correctie,
          status: 'actief', // Auto-activate for now, could require admin approval
        });
      }

      return feedback;
    }),

  // Get feedback for a specific rapport
  getByRapport: behandelaarProcedure
    .input(z.object({ behandelrapportId: z.number() }))
    .query(async ({ input }) => {
      return db.getFeedbackByRapport(input.behandelrapportId);
    }),

  // Get feedback statistics for current gemeente
  stats: beheerderProcedure.query(async ({ ctx }) => {
    if (!ctx.user.gemeenteId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Geen gemeente gekoppeld' });
    }
    return db.getFeedbackStatsByGemeente(ctx.user.gemeenteId);
  }),

  // Get active patterns for current gemeente (for display)
  patronen: beheerderProcedure.query(async ({ ctx }) => {
    if (!ctx.user.gemeenteId) return [];
    const gemeente = await db.getGemeenteById(ctx.user.gemeenteId);
    return db.getActiveFeedbackPatronen(ctx.user.gemeenteId, gemeente?.provincie);
  }),

  // Get recent feedback for current gemeente
  recent: beheerderProcedure
    .input(z.object({ 
      gemeenteId: z.number(),
      limit: z.number().optional() 
    }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to this gemeente
      if (ctx.user.gemeenteId !== input.gemeenteId && ctx.user.role !== 'super_admin' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Geen toegang tot deze gemeente' });
      }
      return db.getRecentFeedbackByGemeente(input.gemeenteId, input.limit || 10);
    }),

  // Admin: get recent feedback across all gemeenten
  recentAll: superAdminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getRecentFeedback(input.limit || 50);
    }),

  // Get user's own feedback
  getMyFeedback: behandelaarProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const feedback = await db.getFeedbackByUser(ctx.user.id, input.limit || 20);
      return feedback.map(f => ({
        id: f.id,
        isPositive: f.score === 'positief',
        sectionType: f.feedbackType,
        createdAt: f.createdAt?.toISOString() || new Date().toISOString(),
        correctedContent: f.correctie || null,
      }));
    }),

  // Get active patterns (visible to all authenticated users)
  getActivePatterns: behandelaarProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const gemeente = ctx.user.gemeenteId ? await db.getGemeenteById(ctx.user.gemeenteId) : null;
      const patterns = await db.getActiveFeedbackPatronen(
        ctx.user.gemeenteId ?? undefined,
        gemeente?.provincie ?? undefined
      );
      return patterns.slice(0, input.limit || 10).map(p => ({
        id: p.id,
        sectionType: p.patroonType,
        occurrenceCount: p.aantalVoorkomens || 1,
        correctionPattern: p.beschrijving || '',
        scope: p.gemeenteId ? 'gemeente' : (p.provincie ? 'provinciaal' : 'landelijk'),
      }));
    }),

  // Admin: update pattern status
  updatePatroon: superAdminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['actief', 'inactief', 'geverifieerd']),
      aiInstructie: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db_instance = await db.getDb();
      if (!db_instance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      const { feedbackPatronen } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      await db_instance.update(feedbackPatronen).set({
        status: input.status,
        aiInstructie: input.aiInstructie,
        geverifieerdDoor: input.status === 'geverifieerd' ? ctx.user.id : undefined,
      }).where(eq(feedbackPatronen.id, input.id));
      
      return { success: true };
    }),
});

// ============ BELEID SUGGESTIE ROUTER ============

const beleidSuggestieRouter = router({
  // Get pending suggestions for a gemeente
  getPending: beheerderProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      const { getPendingSuggesties } = await import('./services/beleidZoekService');
      return getPendingSuggesties(input.gemeenteId);
    }),

  // Accept a suggestion and add to kennisbank
  accept: beheerderProcedure
    .input(z.object({
      suggestieId: z.number(),
      documentUrl: z.string().optional(),
      documentNaam: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { verwerkSuggestie } = await import('./services/beleidZoekService');
      const success = await verwerkSuggestie(
        input.suggestieId,
        true,
        String(ctx.user.id),
        input.documentUrl,
        input.documentNaam
      );
      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Suggestie niet gevonden' });
      }
      return { success: true };
    }),

  // Reject a suggestion
  reject: beheerderProcedure
    .input(z.object({
      suggestieId: z.number(),
      reden: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { verwerkSuggestie } = await import('./services/beleidZoekService');
      const success = await verwerkSuggestie(
        input.suggestieId,
        false,
        String(ctx.user.id)
      );
      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Suggestie niet gevonden' });
      }
      return { success: true };
    }),
});

// ============ JURISPRUDENTIE ROUTER ============

const jurisprudentieRouter = router({
  // Seed gecureerde Omgevingswet jurisprudentie
  seedGecureerd: superAdminProcedure
    .mutation(async () => {
      const { seedOmgevingswetJurisprudentie } = await import('./services/seedOmgevingswetJurisprudentie');
      return seedOmgevingswetJurisprudentie();
    }),
  
  // Get statistieken over gecureerde jurisprudentie
  getGecureerdeStats: beheerderProcedure
    .query(async () => {
      const { getGecureerdeJurisprudentieStats } = await import('./services/seedOmgevingswetJurisprudentie');
      return getGecureerdeJurisprudentieStats();
    }),
  
  // Zoek jurisprudentie op thema
  zoekOpThema: behandelaarProcedure
    .input(z.object({
      thema: z.enum(['omgevingsvergunning', 'omgevingsplan', 'bopa', 'welstand', 'monument', 'stikstof', 'parkeren']),
      max: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      const { zoekUitsprakenOpThema } = await import('./services/openRechtspraakClient');
      return zoekUitsprakenOpThema(input.thema, { max: input.max });
    }),
  
  // Zoek jurisprudentie met vrije zoekterm
  zoek: behandelaarProcedure
    .input(z.object({
      zoekterm: z.string(),
      max: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      const { zoekOmgevingsrechtUitspraken } = await import('./services/openRechtspraakClient');
      return zoekOmgevingsrechtUitspraken(input.zoekterm, { max: input.max });
    }),
  
  // Haal volledige uitspraak tekst op
  getContent: behandelaarProcedure
    .input(z.object({ ecli: z.string() }))
    .query(async ({ input }) => {
      const { getUitspraakContent } = await import('./services/openRechtspraakClient');
      return getUitspraakContent(input.ecli);
    }),
});

// ============ AVG RECHTEN ROUTER ============

const avgRouter = router({
  // Exporteer alle persoonsgegevens (Art. 15 & 20 AVG)
  exportData: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { exportUserData, logAVGVerzoek } = await import('./services/avgRechtenService');
      try {
        const data = await exportUserData(ctx.user.id);
        await logAVGVerzoek(ctx.user.id, 'export', true);
        return { success: true, data };
      } catch (error) {
        await logAVGVerzoek(ctx.user.id, 'export', false, error instanceof Error ? error.message : String(error));
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Fout bij exporteren gegevens' });
      }
    }),
  
  // Controleer of account kan worden verwijderd
  canDelete: protectedProcedure
    .query(async ({ ctx }) => {
      const { canDeleteUser } = await import('./services/avgRechtenService');
      return canDeleteUser(ctx.user.id);
    }),
  
  // Verwijder account en alle persoonsgegevens (Art. 17 AVG)
  deleteAccount: protectedProcedure
    .input(z.object({
      bevestiging: z.literal('IK BEGRIJP DAT DIT ONOMKEERBAAR IS'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { canDeleteUser, deleteUserData, logAVGVerzoek } = await import('./services/avgRechtenService');
      
      // Check of verwijdering toegestaan is
      const canDelete = await canDeleteUser(ctx.user.id);
      if (!canDelete.canDelete) {
        throw new TRPCError({ code: 'FORBIDDEN', message: canDelete.reason || 'Account kan niet worden verwijderd' });
      }
      
      try {
        const result = await deleteUserData(ctx.user.id);
        await logAVGVerzoek(ctx.user.id, 'delete', result.success, JSON.stringify(result.deletedRecords));
        
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.errors.join(', ') });
        }
        
        return { success: true, deletedRecords: result.deletedRecords };
      } catch (error) {
        await logAVGVerzoek(ctx.user.id, 'delete', false, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }),
});

// ============ PILOT ROUTER ============

const pilotRouter = router({
  aanvragen: publicProcedure
    .input(z.object({
      gemeenteNaam: z.string().min(1),
      contactpersoon: z.string().min(1),
      email: z.string().email(),
      telefoon: z.string().optional(),
      functie: z.string().optional(),
      aantalSeats: z.number().min(1),
      bericht: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // 1. Check of gemeente al bestaat
      let gemeente = await db.getGemeenteByName(input.gemeenteNaam);
      
      // 2. Maak gemeente aan als deze niet bestaat
      if (!gemeente) {
        // Zoek regio info in lookup table
        const regioInfo = await db.getRegioLookupByName(input.gemeenteNaam);
        
        await db.createGemeente({
          gemeenteNaam: input.gemeenteNaam,
          gemeenteCode: regioInfo?.cbsCode || '0000',
          provincie: (regioInfo?.provincie as any) || 'Noord-Holland',
          waterschapCode: regioInfo?.waterschapCode || undefined,
          vrCode: regioInfo?.vrCode || undefined,
          odCode: regioInfo?.odCode || undefined,
          ggdCode: regioInfo?.ggdCode || undefined,
          contactBeheerder: input.email,
          seatsGekocht: input.aantalSeats,
          status: 'actief',
        });
        
        gemeente = await db.getGemeenteByName(input.gemeenteNaam);
      } else {
        // Update bestaande gemeente met extra seats
        await db.updateGemeente(gemeente.id, {
          seatsGekocht: (gemeente.seatsGekocht || 0) + input.aantalSeats,
          status: 'actief',
        });
      }
      
      if (!gemeente) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Gemeente kon niet worden aangemaakt' });
      }
      
      // 3. Maak seats aan voor de contactpersoon
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 180); // 6 maanden pilot
      
      // Maak eerste seat aan voor contactpersoon
      await db.createSeat({
        email: input.email,
        naam: input.contactpersoon,
        gemeenteId: gemeente.id,
        rol: 'beheerder',
        status: 'uitgenodigd',
        trialEndsAt: trialEndDate,
      });
      
      // Maak extra seats aan (leeg, voor later invullen)
      for (let i = 1; i < input.aantalSeats; i++) {
        await db.createSeat({
          email: `seat${i + 1}@${input.gemeenteNaam.toLowerCase().replace(/\s+/g, '')}.pilot`,
          naam: `Seat ${i + 1} (nog toe te wijzen)`,
          gemeenteId: gemeente.id,
          rol: 'behandelaar',
          status: 'uitgenodigd',
          trialEndsAt: trialEndDate,
        });
      }
      
      // 4. Stuur notificatie naar super_admin
      const adminNotification = `
**Nieuwe Pilot Aanvraag!**

**Gemeente:** ${input.gemeenteNaam}
**Contactpersoon:** ${input.contactpersoon}
**E-mail:** ${input.email}
**Telefoon:** ${input.telefoon || 'Niet opgegeven'}
**Functie:** ${input.functie || 'Niet opgegeven'}
**Aantal seats:** ${input.aantalSeats}

**Opmerkingen:**
${input.bericht || 'Geen'}

---
**Actie:** ${input.aantalSeats} gratis pilot seats zijn automatisch aangemaakt.
Pilot loopt tot: ${trialEndDate.toLocaleDateString('nl-NL')}
      `.trim();
      
      try {
        await notifyOwner({
          title: `🎉 Pilot aanvraag: ${input.gemeenteNaam}`,
          content: adminNotification,
        });
      } catch (error) {
        console.error('[Pilot] Failed to notify owner:', error);
      }
      
      // 5. Stuur welkomstmail naar contactpersoon
      const { sendEmail } = await import('./services/email');
      
      // Genereer onboarding token voor directe toegang
      const onboardingToken = Buffer.from(`${gemeente.id}:${Date.now()}`).toString('base64url');
      const onboardingUrl = `https://ro-flow.nl/beheerder/onboarding?token=${onboardingToken}&gemeente=${encodeURIComponent(input.gemeenteNaam)}`;
      
      const welkomstHtml = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">R</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 24px; font-weight: 700; color: #1e3a5f;">Ro-flow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Hero Section -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3b82f6 100%); padding: 50px 40px; text-align: center;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <div style="background-color: rgba(255,255,255,0.15); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; line-height: 80px;">
                            <span style="font-size: 40px;">🎉</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welkom bij Ro-flow!</h1>
                          <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Je 6 maanden gratis pilot is geactiveerd</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content Section -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">Beste ${input.contactpersoon},</p>
                    
                    <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">Bedankt voor je aanmelding voor de Ro-flow pilot! Je account voor <strong style="color: #1e3a5f;">${input.gemeenteNaam}</strong> is aangemaakt en klaar voor gebruik.</p>
                    
                    <!-- Pilot Details Card -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="padding-bottom: 16px;">
                                <span style="font-size: 14px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">📋 Je pilot details</span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(146, 64, 14, 0.2);">
                                      <span style="color: #78350f; font-size: 14px;">Gemeente</span>
                                    </td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(146, 64, 14, 0.2); text-align: right;">
                                      <strong style="color: #78350f; font-size: 14px;">${input.gemeenteNaam}</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(146, 64, 14, 0.2);">
                                      <span style="color: #78350f; font-size: 14px;">Aantal seats</span>
                                    </td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(146, 64, 14, 0.2); text-align: right;">
                                      <strong style="color: #78350f; font-size: 14px;">${input.aantalSeats} gebruikers</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="color: #78350f; font-size: 14px;">Geldig tot</span>
                                    </td>
                                    <td style="padding: 8px 0; text-align: right;">
                                      <strong style="color: #78350f; font-size: 14px;">${trialEndDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Next Step Section -->
                    <h2 style="margin: 0 0 16px; color: #1e3a5f; font-size: 20px; font-weight: 700;">Volgende stap: Kennisbank inrichten</h2>
                    
                    <p style="margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.6;">Voordat je team aan de slag kan, richten we eerst de kennisbank in voor ${input.gemeenteNaam}. Dit duurt ongeveer <strong style="color: #1e3a5f;">5 minuten</strong>. We hebben al informatie verzameld over jullie regio - je hoeft alleen te bevestigen of aan te vullen.</p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px;">
                          <a href="${onboardingUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(249, 115, 22, 0.4);">Start onboarding →</a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Steps Section -->
                    <h2 style="margin: 30px 0 20px; color: #1e3a5f; font-size: 20px; font-weight: 700;">Hoe werkt het daarna?</h2>
                    
                    <!-- Step 1 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">1</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 4px;">Onboarding afronden</strong>
                                <span style="color: #64748b; font-size: 14px; line-height: 1.5;">Bevestig de regio-instellingen en voeg eventuele beleidsdocumenten toe.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 2 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">2</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 4px;">Collega's uitnodigen</strong>
                                <span style="color: #64748b; font-size: 14px; line-height: 1.5;">Vul de e-mailadressen in van je ${input.aantalSeats > 1 ? `${input.aantalSeats - 1} collega's` : 'collega'}. Zij ontvangen automatisch een uitnodiging.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 3 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">3</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 4px;">Ro-flow app installeren</strong>
                                <span style="color: #64748b; font-size: 14px; line-height: 1.5;">Installeer de Ro-flow app op je telefoon of computer voor de beste ervaring.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 4 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">4</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 4px;">Eerste analyse uitvoeren</strong>
                                <span style="color: #64748b; font-size: 14px; line-height: 1.5;">Upload een DSO-zipbestand en ontvang binnen seconden een compleet behandelrapport.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Help Section -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eff6ff; border-radius: 12px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <span style="font-size: 24px;">💬</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e40af; font-size: 14px; display: block; margin-bottom: 4px;">Vragen?</strong>
                                <span style="color: #3b82f6; font-size: 14px;">Reply op deze mail of bel ons. We helpen je graag!</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">Met vriendelijke groet,<br><strong style="color: #1e3a5f;">Het Ro-flow Team</strong></p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 20px; text-align: center;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Ro-flow - AI Behandelassistent voor Omgevingsvergunningen</p>
              <a href="https://ro-flow.nl" style="color: #3b82f6; font-size: 13px; text-decoration: none;">ro-flow.nl</a>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
      
      try {
        await sendEmail({
          to: input.email,
          subject: `Welkom bij Ro-flow - Je pilot voor ${input.gemeenteNaam} is actief!`,
          html: welkomstHtml,
        });
        console.log(`[Pilot] Welkomstmail verzonden naar ${input.email}`);
      } catch (error) {
        console.error('[Pilot] Failed to send welcome email:', error);
        // Don't fail the request if email fails
      }
      
      return {
        success: true,
        message: 'Pilot aanvraag verwerkt',
        gemeenteId: gemeente.id,
        seatsAangemaakt: input.aantalSeats,
        pilotEinddatum: trialEndDate.toISOString(),
      };
    }),

  // Admin endpoints voor pilot beheer
  list: superAdminProcedure.query(async () => {
    return db.getPilotGemeenten();
  }),

  stats: superAdminProcedure.query(async () => {
    return db.getPilotStats();
  }),

  details: superAdminProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .query(async ({ input }) => {
      return db.getPilotDetails(input.gemeenteId);
    }),

  extend: superAdminProcedure
    .input(z.object({
      gemeenteId: z.number(),
      daysToAdd: z.number().min(1).max(365),
    }))
    .mutation(async ({ input }) => {
      const result = await db.extendPilotTrial(input.gemeenteId, input.daysToAdd);
      
      // Notificeer owner
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      if (gemeente) {
        try {
          await notifyOwner({
            title: `Pilot verlengd: ${gemeente.gemeenteNaam}`,
            content: `De pilot voor ${gemeente.gemeenteNaam} is verlengd met ${input.daysToAdd} dagen. ${result.extended} seats bijgewerkt.`,
          });
        } catch (e) {
          console.error('[Pilot] Failed to notify extension:', e);
        }
      }
      
      return { success: true, ...result };
    }),

  deactivate: superAdminProcedure
    .input(z.object({ gemeenteId: z.number() }))
    .mutation(async ({ input }) => {
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      const result = await db.deactivatePilot(input.gemeenteId);
      
      // Notificeer owner
      if (gemeente) {
        try {
          await notifyOwner({
            title: `Pilot gedeactiveerd: ${gemeente.gemeenteNaam}`,
            content: `De pilot voor ${gemeente.gemeenteNaam} is gedeactiveerd. Alle seats zijn op inactief gezet.`,
          });
        } catch (e) {
          console.error('[Pilot] Failed to notify deactivation:', e);
        }
      }
      
      return result;
    }),

  // Verstuur uitnodigingsmail naar een seat met PWA installatie instructies
  inviteSeat: beheerderProcedure
    .input(z.object({
      seatId: z.number(),
      email: z.string().email(),
      naam: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Haal seat en gemeente info op
      const seat = await db.getSeatById(input.seatId);
      if (!seat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Seat niet gevonden' });
      }
      
      const gemeente = await db.getGemeenteById(seat.gemeenteId);
      if (!gemeente) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gemeente niet gevonden' });
      }
      
      // Update seat met nieuwe email en naam
      await db.updateSeat(input.seatId, {
        email: input.email,
        naam: input.naam || seat.naam,
        status: 'uitgenodigd',
      });
      
      // Verstuur uitnodigingsmail met PWA instructies
      const { sendEmail } = await import('./services/email');
      
      const uitnodigingHtml = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">R</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 24px; font-weight: 700; color: #1e3a5f;">Ro-flow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Hero Section -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); padding: 50px 40px; text-align: center;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <div style="background-color: rgba(255,255,255,0.15); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; line-height: 80px;">
                            <span style="font-size: 40px;">📱</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Je bent uitgenodigd!</h1>
                          <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Installeer de Ro-flow app en ga aan de slag</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content Section -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">Beste ${input.naam || 'collega'},</p>
                    
                    <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">Je bent uitgenodigd om Ro-flow te gebruiken namens <strong style="color: #1e3a5f;">${gemeente.gemeenteNaam}</strong>. Met Ro-flow analyseer je omgevingsvergunningen in seconden met behulp van AI.</p>
                    
                    <!-- What is Ro-flow Card -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <span style="font-size: 24px;">🎯</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e40af; font-size: 15px; display: block; margin-bottom: 8px;">Wat is Ro-flow?</strong>
                                <span style="color: #3b82f6; font-size: 14px; line-height: 1.5;">Een AI-assistent die DSO-aanvragen analyseert en automatisch een behandelrapport genereert met alle relevante toetsingskaders, adviseurs en aandachtspunten.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Steps Section -->
                    <h2 style="margin: 0 0 20px; color: #1e3a5f; font-size: 20px; font-weight: 700;">Installeer de Ro-flow app</h2>
                    
                    <p style="margin: 0 0 20px; color: #64748b; font-size: 15px; line-height: 1.6;">Ro-flow werkt als een app op je telefoon of computer. Volg deze stappen:</p>
                    
                    <!-- Step 1 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">1</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 4px;">Open Ro-flow in je browser</strong>
                                <span style="color: #64748b; font-size: 14px; line-height: 1.5;">Ga naar <a href="https://ro-flow.nl" style="color: #10b981; text-decoration: none; font-weight: 600;">ro-flow.nl</a> op je telefoon of computer.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 2 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">2</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 12px;">Installeer de app</strong>
                                
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="background-color: #ffffff; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                                      <strong style="color: #1e3a5f; font-size: 13px;">📱 iPhone/iPad</strong><br>
                                      <span style="color: #64748b; font-size: 13px;">Tik op Deel-icoon → "Zet op beginscherm"</span>
                                    </td>
                                  </tr>
                                </table>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 8px;">
                                  <tr>
                                    <td style="background-color: #ffffff; border-radius: 8px; padding: 12px;">
                                      <strong style="color: #1e3a5f; font-size: 13px;">📱 Android</strong><br>
                                      <span style="color: #64748b; font-size: 13px;">Tik op ⋮ → "App installeren"</span>
                                    </td>
                                  </tr>
                                </table>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 8px;">
                                  <tr>
                                    <td style="background-color: #ffffff; border-radius: 8px; padding: 12px;">
                                      <strong style="color: #1e3a5f; font-size: 13px;">💻 Computer</strong><br>
                                      <span style="color: #64748b; font-size: 13px;">Klik installatie-icoon in adresbalk</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 3 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">3</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 4px;">Log in met je e-mailadres</strong>
                                <span style="color: #64748b; font-size: 14px; line-height: 1.5;">Gebruik: <strong style="color: #1e3a5f;">${input.email}</strong></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 4 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 16px;">
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;">
                                  <span style="color: white; font-weight: 700; font-size: 14px;">4</span>
                                </div>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1e3a5f; font-size: 15px; display: block; margin-bottom: 4px;">Start je eerste analyse</strong>
                                <span style="color: #64748b; font-size: 14px; line-height: 1.5;">Upload een DSO-zipbestand en ontvang binnen seconden een compleet behandelrapport.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px;">
                          <a href="https://ro-flow.nl" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);">Open Ro-flow →</a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Help Section -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fef3c7; border-radius: 12px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <span style="font-size: 24px;">💬</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #92400e; font-size: 14px; display: block; margin-bottom: 4px;">Vragen?</strong>
                                <span style="color: #b45309; font-size: 14px;">Neem contact op met je beheerder of reply op deze mail.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">Met vriendelijke groet,<br><strong style="color: #1e3a5f;">Het Ro-flow Team</strong></p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 20px; text-align: center;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Ro-flow - AI Behandelassistent voor Omgevingsvergunningen</p>
              <a href="https://ro-flow.nl" style="color: #3b82f6; font-size: 13px; text-decoration: none;">ro-flow.nl</a>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
      
      try {
        await sendEmail({
          to: input.email,
          subject: `Je bent uitgenodigd voor Ro-flow - ${gemeente.gemeenteNaam}`,
          html: uitnodigingHtml,
        });
        console.log(`[Pilot] Uitnodigingsmail verzonden naar ${input.email}`);
        
        return {
          success: true,
          message: `Uitnodiging verzonden naar ${input.email}`,
        };
      } catch (error) {
        console.error('[Pilot] Failed to send invite email:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Kon uitnodigingsmail niet verzenden',
        });
      }
    }),

  // Bulk invite - verstuur uitnodigingen naar meerdere seats
  bulkInvite: beheerderProcedure
    .input(z.object({
      gemeenteId: z.number(),
      invites: z.array(z.object({
        email: z.string().email(),
        naam: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const gemeente = await db.getGemeenteById(input.gemeenteId);
      if (!gemeente) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gemeente niet gevonden' });
      }
      
      // Haal beschikbare seats op (placeholder seats)
      const seats = await db.getSeatsByGemeente(input.gemeenteId);
      const availableSeats = seats.filter(s => 
        s.status === 'uitgenodigd' && 
        s.email.includes('.pilot') // Placeholder seats
      );
      
      if (availableSeats.length < input.invites.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Niet genoeg beschikbare seats. Beschikbaar: ${availableSeats.length}, gevraagd: ${input.invites.length}`,
        });
      }
      
      const { sendEmail } = await import('./services/email');
      const results: { email: string; success: boolean; error?: string }[] = [];
      
      for (let i = 0; i < input.invites.length; i++) {
        const invite = input.invites[i];
        const seat = availableSeats[i];
        
        try {
          // Update seat
          await db.updateSeat(seat.id, {
            email: invite.email,
            naam: invite.naam || `Behandelaar ${i + 1}`,
            status: 'uitgenodigd',
          });
          
          // Verstuur mail met modern design
          const uitnodigingHtml = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">R</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 24px; font-weight: 700; color: #1e3a5f;">Ro-flow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Hero -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                    <div style="background-color: rgba(255,255,255,0.15); width: 70px; height: 70px; border-radius: 50%; margin: 0 auto 16px; line-height: 70px;">
                      <span style="font-size: 32px;">📱</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Je bent uitgenodigd!</h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Installeer de Ro-flow app en ga aan de slag</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px; color: #334155; font-size: 15px;">Beste ${invite.naam || 'collega'},</p>
                    <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.6;">Je bent uitgenodigd om Ro-flow te gebruiken namens <strong style="color: #1e3a5f;">${gemeente.gemeenteNaam}</strong>. Met Ro-flow analyseer je omgevingsvergunningen in seconden.</p>
                    
                    <!-- Steps -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 10px; padding: 16px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <div style="background: #10b981; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px;">
                                  <span style="color: white; font-weight: 700; font-size: 13px;">1</span>
                                </div>
                              </td>
                              <td>
                                <strong style="color: #1e3a5f; font-size: 14px;">Open Ro-flow</strong><br>
                                <span style="color: #64748b; font-size: 13px;">Ga naar <a href="https://ro-flow.nl" style="color: #10b981;">ro-flow.nl</a></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 10px; padding: 16px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <div style="background: #10b981; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px;">
                                  <span style="color: white; font-weight: 700; font-size: 13px;">2</span>
                                </div>
                              </td>
                              <td>
                                <strong style="color: #1e3a5f; font-size: 14px;">Installeer de app</strong><br>
                                <span style="color: #64748b; font-size: 13px;">📱 iPhone: Deel → "Zet op beginscherm"<br>📱 Android: ⋮ → "App installeren"<br>💻 Computer: Installatie-icoon in adresbalk</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                      <tr>
                        <td style="background-color: #f8fafc; border-radius: 10px; padding: 16px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <div style="background: #10b981; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px;">
                                  <span style="color: white; font-weight: 700; font-size: 13px;">3</span>
                                </div>
                              </td>
                              <td>
                                <strong style="color: #1e3a5f; font-size: 14px;">Log in</strong><br>
                                <span style="color: #64748b; font-size: 13px;">Gebruik: <strong style="color: #1e3a5f;">${invite.email}</strong></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="https://ro-flow.nl" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">Open Ro-flow →</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">Ro-flow - AI Behandelassistent voor Omgevingsvergunningen<br><a href="https://ro-flow.nl" style="color: #3b82f6; text-decoration: none;">ro-flow.nl</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim();
          
          await sendEmail({
            to: invite.email,
            subject: `Je bent uitgenodigd voor Ro-flow - ${gemeente.gemeenteNaam}`,
            html: uitnodigingHtml,
          });
          
          results.push({ email: invite.email, success: true });
        } catch (error) {
          console.error(`[Pilot] Failed to invite ${invite.email}:`, error);
          results.push({ 
            email: invite.email, 
            success: false, 
            error: error instanceof Error ? error.message : 'Onbekende fout' 
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      // Notificeer owner
      try {
        await notifyOwner({
          title: `Team uitgenodigd: ${gemeente.gemeenteNaam}`,
          content: `${successCount} van ${input.invites.length} uitnodigingen verzonden voor ${gemeente.gemeenteNaam}.`,
        });
      } catch (e) {
        console.error('[Pilot] Failed to notify bulk invite:', e);
      }
      
      return {
        success: successCount > 0,
        total: input.invites.length,
        sent: successCount,
        failed: input.invites.length - successCount,
        results,
      };
    }),
});

// ============ BACKUP ROUTER ============

const backupRouter = router({
  // Manual backup (super admin only)
  create: superAdminProcedure.mutation(async () => {
    const result = await createDatabaseBackup();
    if (!result.success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Backup mislukt: ${result.error}`,
      });
    }
    return result;
  }),

  // Automated weekly backup (called by Manus scheduled task)
  scheduledBackup: publicProcedure
    .input(z.object({
      secretKey: z.string(),
    }))
    .mutation(async ({ input }) => {
      const expectedKey = process.env.CRON_SECRET_KEY || 'ro-flow-cron-secret';
      if (input.secretKey !== expectedKey) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid secret key' });
      }
      const result = await createDatabaseBackup();
      return result;
    }),
});

// ============ MAIN ROUTER ============

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  gemeente: gemeenteRouter,
  seats: seatsRouter,
  beleidsdocumenten: beleidsdocumentenRouter,
  behandelrapport: behandelrapportRouter,
  adviseurs: adviseursRouter,
  users: usersRouter,
  analyse: analyseRouter,
  lemon: lemonRouter,
  payment: paymentRouter,
  demo: demoRouter,
  pilot: pilotRouter,
  kennisbank: kennisbankRouter,
  toetsingsmatrix: toetsingsmatrixRouter,
  feedback: feedbackRouter,
  beleidSuggestie: beleidSuggestieRouter,
  jurisprudentie: jurisprudentieRouter,
  avg: avgRouter,
  backup: backupRouter,
  omgevingsscan: omgevingsscanRouter,
});

export type AppRouter = typeof appRouter;

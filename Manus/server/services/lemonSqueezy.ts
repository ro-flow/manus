/**
 * Lemon Squeezy Service - Webhook handling en seat activatie
 * 
 * Verwerkt betalingen en activeert seats voor gemeenten.
 */

import crypto from 'crypto';
import { getDb } from '../db';
import { gemeenten, seats } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Lemon Squeezy webhook event types
export type LemonSqueezyEventType = 
  | 'order_created'
  | 'order_refunded'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'subscription_payment_recovered'
  | 'license_key_created'
  | 'license_key_updated';

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: LemonSqueezyEventType;
    custom_data?: {
      gemeente_id?: string;
      seats_count?: string;
      beheerder_email?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id?: number;
      order_number?: number;
      user_name?: string;
      user_email?: string;
      status?: string;
      status_formatted?: string;
      first_order_item?: {
        product_id: number;
        product_name: string;
        variant_id: number;
        variant_name: string;
        price: number;
        quantity: number;
      };
      total?: number;
      total_formatted?: string;
      currency?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
}

/**
 * Verifieer Lemon Squeezy webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Verwerk een Lemon Squeezy webhook event
 */
export async function handleWebhookEvent(
  payload: LemonSqueezyWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const eventType = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  
  console.log(`[LemonSqueezy] Processing event: ${eventType}`);

  try {
    switch (eventType) {
      case 'order_created':
        return await handleOrderCreated(payload, customData);
      
      case 'subscription_created':
        return await handleSubscriptionCreated(payload, customData);
      
      case 'subscription_cancelled':
      case 'subscription_expired':
        return await handleSubscriptionEnded(payload, customData);
      
      case 'subscription_payment_success':
        return await handlePaymentSuccess(payload, customData);
      
      case 'subscription_payment_failed':
        return await handlePaymentFailed(payload, customData);
      
      case 'order_refunded':
        return await handleOrderRefunded(payload, customData);
      
      default:
        console.log(`[LemonSqueezy] Unhandled event type: ${eventType}`);
        return { success: true, message: `Event ${eventType} acknowledged but not processed` };
    }
  } catch (error) {
    console.error(`[LemonSqueezy] Error processing ${eventType}:`, error);
    return { success: false, message: `Error processing ${eventType}` };
  }
}

/**
 * Verwerk nieuwe order - activeer seats
 */
async function handleOrderCreated(
  payload: LemonSqueezyWebhookPayload,
  customData?: LemonSqueezyWebhookPayload['meta']['custom_data']
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  const gemeenteId = customData?.gemeente_id ? parseInt(customData.gemeente_id) : null;
  const seatsCount = customData?.seats_count ? parseInt(customData.seats_count) : 1;
  const beheerderEmail = customData?.beheerder_email;
  
  if (!gemeenteId) {
    console.warn('[LemonSqueezy] No gemeente_id in custom_data');
    return { success: false, message: 'Missing gemeente_id in custom_data' };
  }

  // Update gemeente seats count
  await db.update(gemeenten)
    .set({ 
      seatsGekocht: seatsCount,
      status: 'actief',
      lemonOrderId: payload.data.id,
    })
    .where(eq(gemeenten.id, gemeenteId));

  // Als beheerder email is opgegeven, maak eerste seat aan
  if (beheerderEmail) {
    const existingSeat = await db.select()
      .from(seats)
      .where(eq(seats.email, beheerderEmail))
      .limit(1);
    
    if (existingSeat.length === 0) {
      await db.insert(seats).values({
        gemeenteId,
        email: beheerderEmail,
        naam: payload.data.attributes.user_name || null,
        rol: 'beheerder',
        status: 'actief',
      });
    }
  }

  console.log(`[LemonSqueezy] Order created: ${seatsCount} seats for gemeente ${gemeenteId}`);
  return { success: true, message: `Activated ${seatsCount} seats for gemeente ${gemeenteId}` };
}

/**
 * Verwerk nieuwe subscription
 */
async function handleSubscriptionCreated(
  payload: LemonSqueezyWebhookPayload,
  customData?: LemonSqueezyWebhookPayload['meta']['custom_data']
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  const gemeenteId = customData?.gemeente_id ? parseInt(customData.gemeente_id) : null;
  
  if (!gemeenteId) {
    return { success: false, message: 'Missing gemeente_id' };
  }

  await db.update(gemeenten)
    .set({ 
      status: 'actief',
      lemonSubscriptionId: payload.data.id,
    })
    .where(eq(gemeenten.id, gemeenteId));

  console.log(`[LemonSqueezy] Subscription created for gemeente ${gemeenteId}`);
  return { success: true, message: `Subscription activated for gemeente ${gemeenteId}` };
}

/**
 * Verwerk beëindigde subscription
 */
async function handleSubscriptionEnded(
  payload: LemonSqueezyWebhookPayload,
  customData?: LemonSqueezyWebhookPayload['meta']['custom_data']
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  const gemeenteId = customData?.gemeente_id ? parseInt(customData.gemeente_id) : null;
  
  if (!gemeenteId) {
    return { success: false, message: 'Missing gemeente_id' };
  }

  await db.update(gemeenten)
    .set({ status: 'inactief' })
    .where(eq(gemeenten.id, gemeenteId));

  // Deactiveer alle seats
  await db.update(seats)
    .set({ status: 'inactief' })
    .where(eq(seats.gemeenteId, gemeenteId));

  console.log(`[LemonSqueezy] Subscription ended for gemeente ${gemeenteId}`);
  return { success: true, message: `Subscription ended for gemeente ${gemeenteId}` };
}

/**
 * Verwerk succesvolle betaling
 */
async function handlePaymentSuccess(
  payload: LemonSqueezyWebhookPayload,
  customData?: LemonSqueezyWebhookPayload['meta']['custom_data']
): Promise<{ success: boolean; message: string }> {
  console.log(`[LemonSqueezy] Payment success for order ${payload.data.attributes.order_id}`);
  return { success: true, message: 'Payment recorded' };
}

/**
 * Verwerk mislukte betaling
 */
async function handlePaymentFailed(
  payload: LemonSqueezyWebhookPayload,
  customData?: LemonSqueezyWebhookPayload['meta']['custom_data']
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  const gemeenteId = customData?.gemeente_id ? parseInt(customData.gemeente_id) : null;
  
  if (gemeenteId) {
    await db.update(gemeenten)
      .set({ status: 'inactief' })
      .where(eq(gemeenten.id, gemeenteId));
  }

  console.log(`[LemonSqueezy] Payment failed for gemeente ${gemeenteId}`);
  return { success: true, message: 'Payment failure recorded' };
}

/**
 * Verwerk refund
 */
async function handleOrderRefunded(
  payload: LemonSqueezyWebhookPayload,
  customData?: LemonSqueezyWebhookPayload['meta']['custom_data']
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  const gemeenteId = customData?.gemeente_id ? parseInt(customData.gemeente_id) : null;
  
  if (gemeenteId) {
    await db.update(gemeenten)
      .set({ 
        status: 'inactief',
        seatsGekocht: 0,
      })
      .where(eq(gemeenten.id, gemeenteId));

    // Deactiveer alle seats
    await db.update(seats)
      .set({ status: 'inactief' })
      .where(eq(seats.gemeenteId, gemeenteId));
  }

  console.log(`[LemonSqueezy] Order refunded for gemeente ${gemeenteId}`);
  return { success: true, message: 'Refund processed' };
}

/**
 * Genereer checkout URL voor Lemon Squeezy
 */
export function generateCheckoutUrl(
  storeId: string,
  productId: string,
  gemeenteId: number,
  seatsCount: number,
  beheerderEmail: string
): string {
  const baseUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${productId}`;
  const params = new URLSearchParams({
    'checkout[custom][gemeente_id]': gemeenteId.toString(),
    'checkout[custom][seats_count]': seatsCount.toString(),
    'checkout[custom][beheerder_email]': beheerderEmail,
    'checkout[email]': beheerderEmail,
  });
  
  return `${baseUrl}?${params.toString()}`;
}

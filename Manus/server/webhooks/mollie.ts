import { Router, Request, Response } from 'express';
import createMollieClient from '@mollie/api-client';
import { getDb } from '../db';
import { seats } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Initialize Mollie client
const getMollieClient = () => {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    throw new Error('MOLLIE_API_KEY not configured');
  }
  return createMollieClient({ apiKey });
};

// Mollie webhook endpoint
router.post('/mollie', async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      console.error('[Mollie Webhook] No payment ID received');
      return res.status(400).send('Missing payment ID');
    }
    
    console.log(`[Mollie Webhook] Received webhook for payment: ${id}`);
    
    const client = getMollieClient();
    
    // Fetch the payment details from Mollie
    const payment = await client.payments.get(id);
    
    console.log(`[Mollie Webhook] Payment status: ${payment.status}`);
    console.log(`[Mollie Webhook] Payment metadata:`, payment.metadata);
    
    const db = await getDb();
    if (!db) {
      console.error('[Mollie Webhook] Database not available');
      return res.status(500).send('Database unavailable');
    }
    
    // Handle different payment statuses
    const metadata = payment.metadata as Record<string, string> | null;
    
    switch (payment.status) {
      case 'paid':
        // Payment successful - activate subscription
        if (metadata?.seatId) {
          const seatId = parseInt(metadata.seatId);
          
          // Calculate trial end date (30 days from now)
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 30);
          
          await db.update(seats)
            .set({
              status: 'actief',
              mollieCustomerId: payment.customerId || null,
              mollieSubscriptionId: payment.subscriptionId || null,
              trialEndsAt: trialEndDate,
              updatedAt: new Date(),
            })
            .where(eq(seats.id, seatId));
          
          console.log(`[Mollie Webhook] Seat ${seatId} activated with trial until ${trialEndDate}`);
        }
        break;
        
      case 'failed':
      case 'canceled':
      case 'expired':
        // Payment failed - log and potentially notify
        console.log(`[Mollie Webhook] Payment ${id} ${payment.status}`);
        if (metadata?.seatId) {
          const seatId = parseInt(metadata.seatId);
          await db.update(seats)
            .set({
              status: 'inactief',
              updatedAt: new Date(),
            })
            .where(eq(seats.id, seatId));
          console.log(`[Mollie Webhook] Seat ${seatId} marked as inactive due to ${payment.status} payment`);
        }
        break;
        
      case 'pending':
      case 'open':
        // Payment is still processing
        console.log(`[Mollie Webhook] Payment ${id} is ${payment.status}, waiting...`);
        break;
        
      default:
        console.log(`[Mollie Webhook] Unknown payment status: ${payment.status}`);
    }
    
    // Always return 200 to acknowledge receipt
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('[Mollie Webhook] Error processing webhook:', error);
    // Return 200 anyway to prevent Mollie from retrying
    res.status(200).send('Error processed');
  }
});

// Subscription webhook handler
router.post('/mollie/subscription', async (req: Request, res: Response) => {
  try {
    const { id, customerId } = req.body;
    
    if (!id || !customerId) {
      console.error('[Mollie Subscription Webhook] Missing subscription or customer ID');
      return res.status(400).send('Missing IDs');
    }
    
    console.log(`[Mollie Subscription Webhook] Received webhook for subscription: ${id}, customer: ${customerId}`);
    
    const client = getMollieClient();
    
    // Fetch subscription details
    const subscription = await client.customerSubscriptions.get(id, { customerId });
    
    console.log(`[Mollie Subscription Webhook] Subscription status: ${subscription.status}`);
    
    const db = await getDb();
    if (!db) {
      console.error('[Mollie Subscription Webhook] Database not available');
      return res.status(500).send('Database unavailable');
    }
    
    // Find seat by Mollie subscription ID
    const [seat] = await db.select()
      .from(seats)
      .where(eq(seats.mollieSubscriptionId, id))
      .limit(1);
    
    if (!seat) {
      console.log(`[Mollie Subscription Webhook] No seat found for subscription ${id}`);
      return res.status(200).send('OK');
    }
    
    // Handle subscription status changes
    switch (subscription.status) {
      case 'active':
        await db.update(seats)
          .set({ status: 'actief', updatedAt: new Date() })
          .where(eq(seats.id, seat.id));
        console.log(`[Mollie Subscription Webhook] Seat ${seat.id} subscription active`);
        break;
        
      case 'canceled':
      case 'suspended':
        await db.update(seats)
          .set({ status: 'inactief', updatedAt: new Date() })
          .where(eq(seats.id, seat.id));
        console.log(`[Mollie Subscription Webhook] Seat ${seat.id} subscription ${subscription.status}`);
        break;
        
      default:
        console.log(`[Mollie Subscription Webhook] Unknown status: ${subscription.status}`);
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('[Mollie Subscription Webhook] Error:', error);
    res.status(200).send('Error processed');
  }
});

export default router;

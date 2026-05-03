import { createMollieClient, PaymentMethod, SequenceType } from '@mollie/api-client';

// Initialize Mollie client
const mollieApiKey = process.env.MOLLIE_API_KEY || '';

let mollieClient: ReturnType<typeof createMollieClient> | null = null;

function getMollieClient() {
  if (!mollieClient && mollieApiKey) {
    mollieClient = createMollieClient({ apiKey: mollieApiKey });
  }
  return mollieClient;
}

export interface CreatePaymentParams {
  amount: number; // in euros
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  method?: PaymentMethod;
  metadata?: Record<string, string>;
  customerId?: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  amount: number; // in euros
  interval: 'monthly' | 'yearly';
  description: string;
  webhookUrl: string;
  startDate?: string; // YYYY-MM-DD format, for trial period
  metadata?: Record<string, string>;
}

// Create a one-time payment
export async function createPayment(params: CreatePaymentParams) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const payment = await client.payments.create({
    amount: {
      currency: 'EUR',
      value: params.amount.toFixed(2),
    },
    description: params.description,
    redirectUrl: params.redirectUrl,
    webhookUrl: params.webhookUrl,
    method: params.method,
    metadata: params.metadata,
  });

  return {
    id: payment.id,
    status: payment.status,
    checkoutUrl: payment._links?.checkout?.href || null,
    expiresAt: payment.expiresAt,
  };
}

// Create a customer for recurring payments
export async function createCustomer(email: string, name: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const customer = await client.customers.create({
    email,
    name,
  });

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
  };
}

// Create a first payment to set up mandate for subscriptions
export async function createFirstPayment(params: {
  customerId: string;
  amount: number;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  method?: PaymentMethod;
  metadata?: Record<string, string>;
}) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const payment = await client.payments.create({
    amount: {
      currency: 'EUR',
      value: params.amount.toFixed(2),
    },
    description: params.description,
    redirectUrl: params.redirectUrl,
    webhookUrl: params.webhookUrl,
    customerId: params.customerId,
    sequenceType: 'first' as SequenceType,
    method: params.method,
    metadata: params.metadata,
  });

  return {
    id: payment.id,
    status: payment.status,
    checkoutUrl: (payment as any)._links?.checkout?.href || null,
  };
}

// Create a subscription after first payment is completed
export async function createSubscription(params: CreateSubscriptionParams) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const intervalMap = {
    monthly: '1 month',
    yearly: '12 months',
  };

  const subscription = await client.customerSubscriptions.create({
    customerId: params.customerId,
    amount: {
      currency: 'EUR',
      value: params.amount.toFixed(2),
    },
    interval: intervalMap[params.interval],
    description: params.description,
    webhookUrl: params.webhookUrl,
    startDate: params.startDate,
    metadata: params.metadata,
  });

  return {
    id: subscription.id,
    status: subscription.status,
    nextPaymentDate: subscription.nextPaymentDate,
  };
}

// Get payment status
export async function getPayment(paymentId: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const payment = await client.payments.get(paymentId);

  return {
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    method: payment.method,
    metadata: payment.metadata,
    paidAt: payment.paidAt,
    canceledAt: payment.canceledAt,
    expiredAt: payment.expiredAt,
  };
}

// Cancel a subscription
export async function cancelSubscription(customerId: string, subscriptionId: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  await client.customerSubscriptions.cancel(subscriptionId, { customerId });
  return { success: true };
}

// Get available payment methods
export async function getPaymentMethods() {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const methods = await client.methods.list();
  
  return methods.map(method => ({
    id: method.id,
    description: method.description,
    image: method.image,
  }));
}

// Verify webhook signature (Mollie doesn't use signatures, but we verify payment status)
export async function handleWebhook(paymentId: string) {
  const payment = await getPayment(paymentId);
  return payment;
}

// Get subscription details
export async function getSubscription(customerId: string, subscriptionId: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const subscription = await client.customerSubscriptions.get(subscriptionId, { customerId });

  return {
    id: subscription.id,
    status: subscription.status,
    amount: subscription.amount,
    interval: subscription.interval,
    description: subscription.description,
    nextPaymentDate: subscription.nextPaymentDate,
    startDate: subscription.startDate,
    canceledAt: subscription.canceledAt,
  };
}

// Get customer mandates (for checking if recurring is set up)
export async function getCustomerMandates(customerId: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const mandates = await client.customerMandates.page({ customerId });

  return mandates.map((mandate: any) => ({
    id: mandate.id,
    status: mandate.status,
    method: mandate.method,
    details: mandate.details,
    createdAt: mandate.createdAt,
  }));
}

// Get or create customer by email
export async function getOrCreateCustomer(email: string, name: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  // Try to find existing customer by listing all and filtering
  // Note: Mollie doesn't have a direct lookup by email, so we create new if not found
  try {
    const customer = await client.customers.create({
      email,
      name,
    });
    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      isNew: true,
    };
  } catch (error: any) {
    // If customer already exists with this email, Mollie will still create a new one
    // So we always get a new customer ID
    throw error;
  }
}

// Update subscription (e.g., change plan)
export async function updateSubscription(customerId: string, subscriptionId: string, params: {
  amount?: number;
  interval?: 'monthly' | 'yearly';
  description?: string;
}) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const intervalMap = {
    monthly: '1 month',
    yearly: '12 months',
  };

  const updateData: any = {};
  if (params.amount !== undefined) {
    updateData.amount = {
      currency: 'EUR',
      value: params.amount.toFixed(2),
    };
  }
  if (params.interval) {
    updateData.interval = intervalMap[params.interval];
  }
  if (params.description) {
    updateData.description = params.description;
  }

  const subscription = await client.customerSubscriptions.update(subscriptionId, {
    customerId,
    ...updateData,
  });

  return {
    id: subscription.id,
    status: subscription.status,
    amount: subscription.amount,
    interval: subscription.interval,
    nextPaymentDate: subscription.nextPaymentDate,
  };
}

// List all subscriptions for a customer
export async function listCustomerSubscriptions(customerId: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie client not initialized. Please set MOLLIE_API_KEY.');
  }

  const subscriptions = await client.customerSubscriptions.page({ customerId });

  return subscriptions.map((sub: any) => ({
    id: sub.id,
    status: sub.status,
    amount: sub.amount,
    interval: sub.interval,
    description: sub.description,
    nextPaymentDate: sub.nextPaymentDate,
    startDate: sub.startDate,
  }));
}

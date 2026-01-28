import Stripe from 'stripe';
import { config } from '../config/index.js';
import { markAsSold } from './inventoryService.js';
import { query } from './db.js';

// Only initialize Stripe if API key is provided
const stripe = config.stripeSecret ? new Stripe(config.stripeSecret, { apiVersion: '2023-08-16' }) : null;

// ─── Terminal Functions ───────────────────────────────────────────────────────

export async function createConnectionToken() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
  }
  const token = await stripe.terminal.connectionTokens.create();
  return token;
}

export async function listReaders(locationId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
  }
  const params = { limit: 100 };
  if (locationId) params.location = locationId;
  const readers = await stripe.terminal.readers.list(params);
  return readers.data;
}

export async function processPaymentIntent(readerId, paymentIntentId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
  }
  const reader = await stripe.terminal.readers.processPaymentIntent(readerId, {
    payment_intent: paymentIntentId,
  });
  return reader;
}

export async function cancelReaderAction(readerId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
  }
  const reader = await stripe.terminal.readers.cancelAction(readerId);
  return reader;
}

export async function getPaymentIntent(paymentIntentId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
  }
  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

// ─── Payment Functions ────────────────────────────────────────────────────────

export async function createPaymentIntent(amount, currency, metadata) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
  }
  return await stripe.paymentIntents.create({
    amount: Math.round(Number(amount) * 100),
    currency,
    payment_method_types: ['card_present', 'card'],
    capture_method: 'manual',
    metadata,
  });
}

export async function handleStripeWebhook(event) {
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { inventory_id } = pi.metadata || {};
    const sale_price = pi.amount_received / 100.0;
    const paymentMethod = pi.payment_method_types?.includes('card_present') ? 'TERMINAL' : 'CARD';

    // Only update inventory if this payment is tied to an inventory item
    if (inventory_id) {
      await markAsSold(inventory_id, sale_price);
    }

    // Record the transaction regardless
    await query(
      `INSERT INTO transactions (inventory_id, stripe_payment_intent_id, sale_price, fees, net_amount, sale_date, payment_method)
       VALUES ($1,$2,$3,$4,$5, now(), $6)`,
      [inventory_id || null, pi.id, sale_price, 0, sale_price, paymentMethod]
    );
  }
}
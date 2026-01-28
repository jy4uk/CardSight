import express from 'express';
import {
  createConnectionToken,
  listReaders,
  processPaymentIntent,
  cancelReaderAction,
  createPaymentIntent,
  getPaymentIntent,
} from '../services/stripeService.js';

const router = express.Router();

// Get connection token for Terminal SDK
router.post('/connection-token', async (req, res) => {
  try {
    const token = await createConnectionToken();
    res.json({ secret: token.secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List available readers
router.get('/readers', async (req, res) => {
  try {
    const readers = await listReaders(req.query.location);
    res.json({ readers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a payment intent for a given amount (not tied to inventory)
router.post('/create-payment', async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata = {} } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount is required and must be positive' });
    }
    const paymentIntent = await createPaymentIntent(amount, currency, metadata);
    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process payment on a specific reader
router.post('/process-payment', async (req, res) => {
  try {
    const { readerId, paymentIntentId } = req.body;
    if (!readerId || !paymentIntentId) {
      return res.status(400).json({ error: 'readerId and paymentIntentId are required' });
    }
    const reader = await processPaymentIntent(readerId, paymentIntentId);
    res.json({ reader });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel current action on a reader
router.post('/cancel-action', async (req, res) => {
  try {
    const { readerId } = req.body;
    if (!readerId) {
      return res.status(400).json({ error: 'readerId is required' });
    }
    const reader = await cancelReaderAction(readerId);
    res.json({ reader });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payment intent status
router.get('/payment/:paymentIntentId', async (req, res) => {
  try {
    const paymentIntent = await getPaymentIntent(req.params.paymentIntentId);
    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

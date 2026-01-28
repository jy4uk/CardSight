import express from 'express';
import { handleStripeWebhook } from '../services/stripeService.js';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error', err);
    res.status(400).send(`Webhook error: ${err.message}`);
  }
});

export default router;
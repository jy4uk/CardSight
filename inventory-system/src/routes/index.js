import express from 'express';
import inventoryRoutes from './inventory.js';
import insightsRoutes from './insights.js';
import pricingRoutes from './pricing.js';
import terminalRoutes from './terminal.js';
import stripeRoutes from './stripe.js';
import authRoutes from './auth.js';
import tradesRoutes from './trades.js';
import psaLookupRoutes from './psaLookup.js';

const router = express.Router();
router.use('/auth', authRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/pricing', pricingRoutes);
router.use('/stripe', stripeRoutes);
router.use('/terminal', terminalRoutes);
router.use('/insights', insightsRoutes);
router.use('/trades', tradesRoutes);
router.use('/psa-lookup', psaLookupRoutes);

export default router;
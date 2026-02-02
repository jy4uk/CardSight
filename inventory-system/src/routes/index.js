import express from 'express';
import inventoryRoutes from './inventory.js';
import insightsRoutes from './insights.js';
import pricingRoutes from './pricing.js';
import terminalRoutes from './terminal.js';
import stripeRoutes from './stripe.js';
import authRoutes from './auth.js';
import authNewRoutes from './auth-new.js';
import tradesRoutes from './trades.js';
import psaLookupRoutes from './psaLookup.js';
import tcgRoutes from './tcg.js';
import savedDealsRoutes from './savedDeals.js';

const router = express.Router();
// Legacy admin mode auth (preserved for backward compatibility)
router.use('/auth/admin', authRoutes);
// New user authentication system
router.use('/auth', authNewRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/pricing', pricingRoutes);
router.use('/stripe', stripeRoutes);
router.use('/terminal', terminalRoutes);
router.use('/insights', insightsRoutes);
router.use('/trades', tradesRoutes);
router.use('/psa-lookup', psaLookupRoutes);
router.use('/tcg', tcgRoutes);
router.use('/saved-deals', savedDealsRoutes);

export default router;
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
import usersRoutes from './users.js';
import settingsRoutes from './settings.js';
import transactionsRoutes from './transactions.js';

const router = express.Router();

// Legacy admin mode auth (preserved for backward compatibility)
router.use('/auth/admin', authRoutes);

// New user authentication system
router.use('/auth', authNewRoutes);

// User routes
router.use('/users', usersRoutes);

// Settings routes
router.use('/', settingsRoutes);

// Inventory routes
router.use('/inventory', inventoryRoutes);

// Pricing routes
router.use('/pricing', pricingRoutes);

// Payment routes
router.use('/stripe', stripeRoutes);
router.use('/terminal', terminalRoutes);

// Business routes
router.use('/insights', insightsRoutes);
router.use('/trades', tradesRoutes);
router.use('/transactions', transactionsRoutes);

// Lookup routes
router.use('/psa-lookup', psaLookupRoutes);
router.use('/tcg', tcgRoutes);

// Saved deals
router.use('/saved-deals', savedDealsRoutes);

export default router;

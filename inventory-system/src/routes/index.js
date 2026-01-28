import express from 'express';
import inventoryRoutes from './inventory.js';
import insightsRoutes from './insights.js';
import pricingRoutes from './pricing.js';
import terminalRoutes from './terminal.js';
import stripeRoutes from './stripe.js';

const router = express.Router();
router.use('/inventory', inventoryRoutes);
router.use('/pricing', pricingRoutes);
router.use('/stripe', stripeRoutes);
router.use('/terminal', terminalRoutes);
router.use('/insights', insightsRoutes);

export default router;
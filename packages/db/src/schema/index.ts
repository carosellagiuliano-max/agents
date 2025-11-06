/**
 * Schnittwerk Database Schema
 * Phase 1 - Database and RLS
 *
 * This module exports all database tables and their relationships.
 * All tables have Row Level Security (RLS) enabled.
 */

// Auth and Users
export * from './auth';
export * from './staff-customers';

// Services and Scheduling
export * from './services';
export * from './appointments';
export * from './schedule';

// Products and Inventory
export * from './products';

// Orders and Payments
export * from './orders-payments';

// Promotions
export * from './promotions';

// System
export * from './system';

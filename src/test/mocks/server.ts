/**
 * MSW mock server configuration.
 * Combines all domain handlers into a single server instance.
 *
 * Adding a new domain:
 * 1. Create mocks/newdomain/factories.ts with mock data functions
 * 2. Create mocks/newdomain/handlers.ts with MSW handlers
 * 3. Import and spread handlers here
 */

import { setupServer } from 'msw/node';

import { prHandlers } from './pr/handlers.js';
import { runHandlers } from './run/handlers.js';
import { searchHandlers } from './search/handlers.js';

// Combine all domain handlers
// Adding new domains is easy: just import and spread
export const mockServer = setupServer(...prHandlers, ...runHandlers, ...searchHandlers);

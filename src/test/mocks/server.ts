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
import { repoHandlers } from './repo/handlers.js';
import { runHandlers } from './run/handlers.js';
import { searchHandlers } from './search/handlers.js';
import { workflowHandlers } from './workflow/handlers.js';

// Combine all domain handlers
// Adding new domains is easy: just import and spread
// Note: Handler order matters - more specific handlers should come first
// workflowHandlers must come before runHandlers as both define /actions/workflows endpoint
export const mockServer = setupServer(
  ...prHandlers,
  ...repoHandlers,
  ...workflowHandlers,
  ...runHandlers,
  ...searchHandlers
);

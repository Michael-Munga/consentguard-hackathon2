import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './api/routes.js';
import { getDatabase, DbRepository } from './db/database.js';
import { seedDatabase } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Check database and auto-seed if empty or missing staff/demo accounts
  const db = getDatabase();
  const repo = new DbRepository(db);
  const existingBeneficiaries = repo.getAllBeneficiaries();
  const existingStaff = repo.getAllStaff();

  if (existingBeneficiaries.length < 5000 || existingStaff.length === 0 || !repo.getBeneficiaryById('INK-84920')) {
    console.log(`[Server] Initializing database with comprehensive seed data, staff accounts, and demo credentials...`);
    seedDatabase(5200);
  } else {
    console.log(`[Server] Database ready with ${existingBeneficiaries.length} beneficiaries and ${existingStaff.length} staff accounts.`);
  }

  // Mount API router
  app.use('/api', apiRouter);

  if (!isProduction) {
    // Development mode: Vite middleware with instant HMR
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/*.db',
            '**/*.db-wal',
            '**/*.db-shm',
            '**/*.sqlite',
            '**/*.sqlite3',
            '**/*.log',
            '**/coverage/**',
            '**/dist/**',
            '**/.git/**',
          ],
        },
      },
      appType: 'spa',
      root: path.resolve(__dirname, '../../'),
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite development middleware attached');
  } else {
    // Production mode: Serve built static client assets
    const distPath = path.resolve(__dirname, '../../dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // Catch-all handler for Express 5
      app.use((req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================================`);
    console.log(` CONSENTGUARD: Beneficiary Consent & Privacy Fabric Active`);
    console.log(` KPC Inuka Fellowship Hackathon 2 - Domain 5, Problem 9`);
    console.log(` Web Dashboard: http://localhost:${PORT}`);
    console.log(` SSE Live Stream: http://localhost:${PORT}/api/events/sse`);
    console.log(`================================================================`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envResult = dotenv.config({ path: join(__dirname, '.env') });
if (envResult.error) {
  console.error('[Server] Failed to load .env:', envResult.error.message);
  throw envResult.error;
}
console.log('[Server] Loaded env from', join(__dirname, '.env'));

const { default: prescriptionRoutes } = await import('./routes/prescription.js');
const { default: billingRoutes } = await import('./routes/billing.js');
const { default: inventoryRoutes } = await import('./routes/inventory.js');
const { default: queueRoutes } = await import('./routes/queue.js');
const { default: setupRoutes } = await import('./routes/setup.js');
const { default: authRoutes } = await import('./routes/auth.js');
const { default: pharmacistPrescriptionRoutes } = await import('./routes/pharmacistPrescription.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.use('/api/prescription', prescriptionRoutes);
app.use('/api/prescription', pharmacistPrescriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'RxSmart API is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`RxSmart Backend running on http://localhost:${PORT}`);
});

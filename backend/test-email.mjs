import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('[TEST] GMAIL_USER:', process.env.GMAIL_USER);
console.log('[TEST] GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '***set***' : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

console.log('[TEST] Verifying transport...');
transporter.verify((err, success) => {
  if (err) {
    console.error('[TEST] VERIFY FAILED:', err.message);
    console.error('[TEST] Full error:', err);
    process.exit(1);
  } else {
    console.log('[TEST] VERIFY SUCCESS: Transport is ready!');
    process.exit(0);
  }
});

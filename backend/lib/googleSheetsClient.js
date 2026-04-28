import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account credentials
let credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!credentialsPath || !path.isAbsolute(credentialsPath)) {
  credentialsPath = path.join(__dirname, '..', 'credentials', 'google-service-account.json');
}

// Fallback to alternative credential file name
if (!fs.existsSync(credentialsPath)) {
  const altPath = path.join(__dirname, '..', 'credentials', 'civora-476813-dab671fb1afe.json');
  if (fs.existsSync(altPath)) {
    credentialsPath = altPath;
  }
}

console.log('[GoogleSheets] Loading credentials from:', credentialsPath);
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Create JWT client
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets.readonly']
);

// Create Sheets API client
const sheets = google.sheets({ version: 'v4', auth });

/**
 * Read data from Google Sheets
 * @param {string} spreadsheetId - The Google Sheet ID
 * @param {string} range - The range to read (e.g., 'Sheet1!A1:D100')
 * @returns {Array} - Array of row data
 */
export async function readSheet(spreadsheetId, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('[GoogleSheets] Error reading sheet:', error.message);
    throw error;
  }
}

/**
 * Get all medicine inventory data
 * Assumes sheet has headers: Medicine Name | Stock Quantity | Price Per Unit | Category | Reorder Level
 * @param {string} spreadsheetId - The Google Sheet ID
 * @returns {Array} - Array of medicine objects
 */
export async function getMedicineInventory(spreadsheetId) {
  try {
    const data = await readSheet(spreadsheetId, 'Sheet1!A2:E'); // Skip header row

    const inventory = data.map(row => ({
      name: row[0] || '',
      stockQuantity: parseInt(row[1]) || 0,
      pricePerUnit: parseFloat(row[2]) || 0,
      category: row[3] || '',
      reorderLevel: parseInt(row[4]) || 0,
    }));

    console.log(`[GoogleSheets] Loaded ${inventory.length} medicines from inventory`);
    return inventory;
  } catch (error) {
    console.error('[GoogleSheets] Error getting medicine inventory:', error.message);
    throw error;
  }
}
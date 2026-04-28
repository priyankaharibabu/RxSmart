import { getMedicineInventory } from '../lib/googleSheetsClient.js';

let cachedInventory = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load inventory from Google Sheets with caching
 */
async function loadInventory() {
  const now = Date.now();
  if (cachedInventory && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedInventory;
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured in .env');
    }

    cachedInventory = await getMedicineInventory(spreadsheetId);
    cacheTimestamp = now;
    return cachedInventory;
  } catch (error) {
    console.error('[InventoryAgent] Failed to load inventory:', error.message);
    throw error;
  }
}

/**
 * Find medicine in inventory using fuzzy matching
 */
function findMedicine(inventory, medicineName) {
  const normalizedName = medicineName.toLowerCase().trim();

  // Exact match first
  for (const item of inventory) {
    if (item.name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(item.name.toLowerCase())) {
      return item;
    }
  }

  // Fuzzy match on words
  const words = normalizedName.split(' ');
  for (const item of inventory) {
    const itemWords = item.name.toLowerCase().split(' ');
    for (const word of words) {
      if (word.length > 3 && itemWords.some(iw => iw.includes(word))) {
        return item;
      }
    }
  }

  return null;
}

/**
 * runInventoryAgent - Check medicine availability and pricing from Google Sheets
 * @param {Array} medicines - Array of medicine objects from NLP agent
 * @returns {Object} - Inventory check results
 */
export async function runInventoryAgent(medicines) {
  console.log('[InventoryAgent] Checking stock for', medicines.length, 'medicines from Google Sheets...');

  try {
    const inventory = await loadInventory();
    console.log(`[InventoryAgent] Loaded ${inventory.length} items from Google Sheets`);

    const results = medicines.map(medicine => {
      const found = findMedicine(inventory, medicine.name);

      if (found) {
        const quantity = medicine.quantity || 10;
        const totalPrice = found.pricePerUnit * quantity;

        return {
          ...medicine,
          inventoryStatus: found.stockQuantity >= quantity ? 'IN_STOCK' :
                           found.stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
          available: found.stockQuantity >= quantity,
          brand: found.name, // Use the sheet name as brand
          pricePerUnit: found.pricePerUnit,
          unit: 'unit', // Default unit
          currentStock: found.stockQuantity,
          totalPrice: Math.round(totalPrice * 100) / 100,
          category: found.category,
          reorderLevel: found.reorderLevel
        };
      } else {
        return {
          ...medicine,
          inventoryStatus: 'NOT_FOUND',
          available: false,
          brand: 'Unknown',
          pricePerUnit: 0,
          unit: 'unit',
          currentStock: 0,
          totalPrice: 0,
          category: 'Unknown',
          reorderLevel: 0
        };
      }
    });

    const available = results.filter(r => r.available);
    const unavailable = results.filter(r => !r.available);
    const allAvailable = results.every(r => r.available);
    const totalAmount = results.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

    console.log(`[InventoryAgent] Available: ${available.length}, Unavailable: ${unavailable.length}, Total: ₹${totalAmount}`);

    return {
      success: true,
      data: {
        medicines: results,
        available,
        unavailable,
        allAvailable,
        totalAmount: Math.round(totalAmount * 100) / 100,
        readyToPack: allAvailable
      },
      agent: 'Inventory Agent'
    };

  } catch (error) {
    console.error('[InventoryAgent] Error:', error.message);

    // Fallback to basic response if Sheets fail
    const fallbackResults = medicines.map(medicine => ({
      ...medicine,
      inventoryStatus: 'UNKNOWN',
      available: true, // Assume available for demo
      brand: 'Unknown',
      pricePerUnit: 10, // Default price
      unit: 'unit',
      currentStock: 100,
      totalPrice: (medicine.quantity || 10) * 10
    }));

    return {
      success: false,
      error: error.message,
      data: {
        medicines: fallbackResults,
        available: fallbackResults,
        unavailable: [],
        allAvailable: true,
        totalAmount: fallbackResults.reduce((sum, r) => sum + r.totalPrice, 0),
        readyToPack: true
      },
      agent: 'Inventory Agent',
      fallback: true
    };
  }
}

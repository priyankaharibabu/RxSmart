import express from 'express';
const router = express.Router();

const INVENTORY = {
  'paracetamol': { available: true, stock: 450, pricePerUnit: 2.5, brand: 'Calpol' },
  'azithromycin': { available: true, stock: 120, pricePerUnit: 18.5, brand: 'Azee' },
  'amoxicillin': { available: true, stock: 200, pricePerUnit: 12.0, brand: 'Mox' },
  'ibuprofen': { available: true, stock: 300, pricePerUnit: 5.0, brand: 'Brufen' },
  'cetirizine': { available: true, stock: 180, pricePerUnit: 3.5, brand: 'Cetzine' },
  'pantoprazole': { available: true, stock: 150, pricePerUnit: 8.0, brand: 'Pan' },
  'vitamin c': { available: true, stock: 500, pricePerUnit: 3.0, brand: 'Limcee' },
  'vitamin d': { available: true, stock: 250, pricePerUnit: 6.0, brand: 'D-Rise' },
  'omeprazole': { available: true, stock: 200, pricePerUnit: 7.5, brand: 'Omez' },
  'atorvastatin': { available: false, stock: 0, pricePerUnit: 15.0, brand: 'Lipitor' },
};

router.get('/list', (req, res) => {
  res.json({ success: true, data: INVENTORY });
});

export default router;

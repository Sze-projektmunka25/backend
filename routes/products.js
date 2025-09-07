const express = require('express');
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Segédfüggvény kategória id lekérésére/létrehozására
async function getCategoryIdByName(category_name) {
  if (!category_name) return null;

  let [rows] = await pool.query('SELECT id FROM categories WHERE name=?', [category_name]);
  if (rows.length > 0) {
    return rows[0].id;
  }

  // Ha nincs, létrehozzuk
  const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [category_name]);
  return result.insertId;
}

// --------------------
// Listázás (mindenki) - csak látható termékek
// --------------------
router.get('/', async (req, res) => {
  try {
    // Minden termék visszaadása adminnak
    const [products] = await pool.query(`
      SELECT p.*, c.name AS category 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `);

    const formatted = products.map(p => ({
      ...p,
      allergens: p.allergens ? p.allergens.split(',').map(s => s.trim()).filter(Boolean) : [],
      visible: !!p.visible
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Hiba a termékek lekérdezésekor' });
  }
});

// --------------------
// Egy termék lekérdezése
// --------------------
router.get('/:id', async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, c.name AS category 
       FROM products p LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`, 
      [req.params.id]
    );

    if (!products.length) return res.sendStatus(404);

    const product = products[0];
    product.allergens = product.allergens ? product.allergens.split(',').map(s => s.trim()) : [];

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Hiba a termék lekérdezésekor' });
  }
});

// --------------------
// Létrehozás (admin)
// --------------------
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, image_url, category_name, allergens, visible = 1 } = req.body;

    if (!name || !price || !category_name) {
      return res.status(400).json({ message: 'Hiányzó adat!' });
    }

    const category_id = await getCategoryIdByName(category_name);

    const allergenStr = Array.isArray(allergens) ? allergens.join(',') : (allergens || '');

    await pool.query(
      'INSERT INTO products (name, description, price, image_url, category_id, allergens, visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, image_url, category_id, allergenStr, visible ? 1 : 0]
    );

    res.json({ message: 'Termék sikeresen létrehozva!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Hiba a termék létrehozásakor' });
  }
});

// --------------------
// Módosítás (admin)
// --------------------
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, image_url, category_name, allergens, visible = 1 } = req.body;

    if (!name || !price || !category_name) {
      return res.status(400).json({ message: 'Hiányzó adat!' });
    }

    const category_id = await getCategoryIdByName(category_name);
    const allergenStr = Array.isArray(allergens) ? allergens.join(',') : (allergens || '');

    await pool.query(
      'UPDATE products SET name=?, description=?, price=?, image_url=?, category_id=?, allergens=?, visible=? WHERE id=?',
      [name, description, price, image_url, category_id, allergenStr, visible ? 1 : 0, req.params.id]
    );

    res.json({ message: 'Termék sikeresen módosítva!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Hiba a termék módosításakor' });
  }
});

// --------------------
// Törlés (admin)
// --------------------
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
    res.json({ message: 'Termék sikeresen törölve!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Hiba a termék törlésekor' });
  }
});

module.exports = router;

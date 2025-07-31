const express = require('express');
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Listázás (mindenki)
router.get('/', async (req, res) => {
  const [products] = await pool.query(
    `SELECT p.*, c.name AS category 
     FROM products p LEFT JOIN categories c ON p.category_id = c.id`
  );
  res.json(products);
});

// Egy termék lekérdezése
router.get('/:id', async (req, res) => {
  const [products] = await pool.query(
    `SELECT p.*, c.name AS category 
     FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`, 
    [req.params.id]
  );
  if (products.length === 0) return res.sendStatus(404);
  res.json(products[0]);
});

// Létrehozás (admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { name, description, price, image_url, category_id } = req.body;
  if (!name || !price) return res.status(400).json({message: "Hiányzó adat!"});
  await pool.query(
    'INSERT INTO products (name, description, price, image_url, category_id) VALUES (?, ?, ?, ?, ?)',
    [name, description, price, image_url, category_id]
  );
  res.json({message: 'Sikeres mentés!'});
});

// Módosítás (admin)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { name, description, price, image_url, category_id } = req.body;
  await pool.query(
    'UPDATE products SET name=?, description=?, price=?, image_url=?, category_id=? WHERE id=?',
    [name, description, price, image_url, category_id, req.params.id]
  );
  res.json({message: 'Sikeres módosítás!'});
});

// Törlés (admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({message: 'Törölve!'});
});

module.exports = router;
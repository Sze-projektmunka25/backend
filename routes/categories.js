const express = require('express');
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Listázás (mindenki)
router.get('/', async (req, res) => {
  const [categories] = await pool.query('SELECT * FROM categories');
  res.json(categories);
});

// Létrehozás (admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({message: "Hiányzó adat!"});
  await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
  res.json({message: 'Sikeres mentés!'});
});

// Módosítás (admin)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Hiányzó adat!" });

  await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
  res.json({ message: 'Kategória módosítva!' });
});

// Törlés (admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ message: 'Kategória törölve!' });
});



module.exports = router;
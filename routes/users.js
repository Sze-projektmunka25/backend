const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Saját profil lekérése
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err });
  }
});

// Saját profil módosítása
router.put('/profile', authenticateToken, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email) {
    return res.status(400).json({ message: 'Felhasználónév és email kötelező' });
  }

  try {
    let query = 'UPDATE users SET username = ?, email = ? WHERE id = ?';
    let params = [username, email, req.user.id];

    // ha jelszót is akar változtatni
    if (password && password.trim() !== '') {
      const hashed = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?';
      params = [username, email, hashed, req.user.id];
    }

    await pool.query(query, params);
    res.json({ message: 'Profil frissítve' });
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err });
  }
});

module.exports = router;

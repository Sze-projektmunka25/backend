const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Saját profil lekérése
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, phone, default_address FROM users WHERE id = ?',
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
  const { username, email, password, phone, default_address } = req.body;

  if (!username || !email) {
    return res.status(400).json({ message: 'Felhasználónév és email kötelező' });
  }

  try {
    // Email egyediség ellenőrzése (kivéve a saját felhasználó)
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Ez az email már regisztrálva van egy másik felhasználónál!' });
    }

    let query = 'UPDATE users SET username = ?, email = ?, phone = ?, default_address = ? WHERE id = ?';
    let params = [username, email, phone, default_address, req.user.id];

    // Ha jelszót is akar változtatni
    if (password && password.trim() !== '') {
      // Jelszó erősség ellenőrzése
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: 'A jelszónak legalább 6 karakterből kell állnia, tartalmaznia kell nagybetűt, kisbetűt és számot!'
        });
      }

      const hashed = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET username = ?, email = ?, password = ?, phone = ?, default_address = ? WHERE id = ?';
      params = [username, email, hashed, phone, default_address, req.user.id];
    }

    await pool.query(query, params);
    res.json({ message: 'Profil frissítve' });
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err });
  }
});



module.exports = router;

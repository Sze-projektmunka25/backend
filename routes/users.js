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
  const { username, email, password, old_password, phone, default_address } = req.body;

  if (!username || !email) {
    return res.status(400).json({ message: 'Felhasználónév és email kötelező' });
  }

  try {
    // Email egyediség ellenőrzése
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Ez az email már foglalt!' });
    }

    // Ha jelszót változtatna → kötelező megadni a jelenlegi jelszót
    if (password && password.trim() !== '') {
      if (!old_password) {
        return res.status(400).json({ message: 'A jelenlegi jelszó megadása kötelező!' });
      }

      // Jelenlegi jelszó lekérése
      const [userRows] = await pool.query(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
      );

      const validOldPass = await bcrypt.compare(old_password, userRows[0].password);
      if (!validOldPass) {
        return res.status(400).json({ message: 'A jelenlegi jelszó nem megfelelő!' });
      }

      // Új jelszó ellenőrzése
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: 'Az új jelszónak min. 6 karakter, nagybetű, kisbetű és szám szükséges!'
        });
      }

      // Hash és mentés
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET username=?, email=?, password=?, phone=?, default_address=? WHERE id=?',
        [username, email, hashed, phone, default_address, req.user.id]
      );

      return res.json({ message: 'Profil és jelszó frissítve!' });
    }

    // Ha nincs jelszó módosítás
    await pool.query(
      'UPDATE users SET username=?, email=?, phone=?, default_address=? WHERE id=?',
      [username, email, phone, default_address, req.user.id]
    );
    res.json({ message: 'Profil frissítve!' });

  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err });
  }
});




module.exports = router;

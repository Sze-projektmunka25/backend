const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* =======================
   PROFIL LEKÉRÉS
======================= */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, phone, default_address FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'DB hiba', error: err });
  }
});

/* =======================
   PROFIL MÓDOSÍTÁS
======================= */
router.put('/profile', authenticateToken, async (req, res) => {
  const {
    username,
    email,
    phone,
    default_address,
    old_password,
    new_password
  } = req.body;

  if (!username || !email) {
    return res.status(400).json({ message: 'Felhasználónév és email kötelező.' });
  }

  try {
    /* EMAIL EGYEDISÉG */
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );

    if (existing.length) {
      return res.status(400).json({ message: 'Ez az email már foglalt.' });
    }

    /* =======================
       JELSZÓ MÓDOSÍTÁS (OPCIONÁLIS)
    ======================= */
    let hashedPassword = null;

    if (new_password && new_password.trim() !== '') {
      if (!old_password) {
        return res.status(400).json({ message: 'A jelenlegi jelszó megadása kötelező.' });
      }

      const [userRows] = await pool.query(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!userRows.length) {
        return res.status(404).json({ message: 'Felhasználó nem található.' });
      }

      const validOldPass = await bcrypt.compare(old_password, userRows[0].password);
      if (!validOldPass) {
        return res.status(400).json({ message: 'A jelenlegi jelszó nem megfelelő.' });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(new_password)) {
        return res.status(400).json({
          message: 'Az új jelszónak min. 6 karakter, kis- és nagybetű, valamint szám kell.'
        });
      }

      hashedPassword = await bcrypt.hash(new_password, 10);
    }

    /* =======================
       UPDATE
    ======================= */
    const query = hashedPassword
      ? `UPDATE users
         SET username=?, email=?, password=?, phone=?, default_address=?
         WHERE id=?`
      : `UPDATE users
         SET username=?, email=?, phone=?, default_address=?
         WHERE id=?`;

    const params = hashedPassword
      ? [username, email, hashedPassword, phone, default_address, req.user.id]
      : [username, email, phone, default_address, req.user.id];

    await pool.query(query, params);

    res.json({
      message: hashedPassword
        ? 'Profil és jelszó sikeresen frissítve.'
        : 'Profil sikeresen frissítve.'
    });

  } catch (err) {
    res.status(500).json({ message: 'DB hiba', error: err });
  }
});

module.exports = router;

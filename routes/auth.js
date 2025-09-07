const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Regisztráció
// Regisztráció
router.post('/register', async (req, res) => {
  const { username, password, email, phone, default_address } = req.body;

  if (!username || !email || !password) 
    return res.status(400).json({ message: "Hiányzó adat!" });

  try {


      // Jelszó erősség ellenőrzése
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  // legalább 6 karakter, 1 nagybetű, 1 kisbetű, 1 szám
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: 'A jelszónak legalább 6 karakterből kell állnia, tartalmaznia kell nagybetűt, kisbetűt és számot!'
    });
  }

    // Ellenőrizzük az emailt
    const [usersByEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (usersByEmail.length > 0) 
      return res.status(400).json({ message: "Ez az email már regisztrálva van!" });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password, email, phone, default_address) VALUES (?, ?, ?, ?, ?)',
      [username, hashed, email, phone, default_address]
    );

    res.json({ message: 'Sikeres regisztráció!', email });
  } catch (err) {
    res.status(500).json({ message: 'Hiba a regisztráció során!', error: err });
  }
});


// Bejelentkezés
// Bejelentkezés email címmel
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Hiányzó adat!" });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0)
      return res.status(400).json({ message: "Hibás adatok!" });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Hibás adatok!" });

    // JWT token létrehozás
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Hiba!', error: err });
  }
});


module.exports = router;
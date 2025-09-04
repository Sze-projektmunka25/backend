const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Regisztráció
router.post('/register', async (req, res) => {
  const { username, password, email, phone, default_address } = req.body;
  if (!username || !password) return res.status(400).json({message: "Hiányzó adat!"});
  
  try {
    // Ellenőrizzük van-e ilyen user
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length > 0) return res.status(400).json({message: "A felhasználónév már foglalt!"});
    
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password, email, phone, default_address) VALUES (?, ?, ?,?,?)',
      [username, hashed, email, phone, default_address]
    );
    res.json({message: 'Sikeres regisztráció!'});
  } catch (err) {
    res.status(500).json({message: 'Hiba!', error: err});
  }
});

// Bejelentkezés
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({message: "Hiányzó adat!"});
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(400).json({message: "Hibás adatok!"});
    const user = users[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({message: "Hibás adatok!"});

    // JWT token létrehozás
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({message: 'Hiba!', error: err});
  }
});

module.exports = router;
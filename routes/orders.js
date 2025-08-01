const express = require('express');
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Saját rendelések lekérdezése (user)
router.get('/me', authenticateToken, async (req, res) => {
  const [orders] = await pool.query(
    `SELECT * FROM orders WHERE user_id = ?`, [req.user.id]
  );
  res.json(orders);
});

// Új rendelés leadása (user)
router.post('/', authenticateToken, async (req, res) => {
  const { items, address, delivery_time } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Nincs tétel a rendelésben!' });
  }

  if (!address || !delivery_time) {
    return res.status(400).json({ message: 'Szállítási cím és időpont kötelező!' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Új rendelés beszúrása
    const [orderResult] = await conn.query(
      'INSERT INTO orders (user_id, status, address, delivery_time) VALUES (?, ?, ?, ?)',
      [req.user.id, 'Beérkezett', address, delivery_time]
    );
    const orderId = orderResult.insertId;

    // Tételek beszúrása
    const insertItemQuery = `
      INSERT INTO order_items (order_id, product_id, quantity)
      VALUES (?, ?, ?)
    `;

    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        throw new Error('Hiányzó termékadat: product_id, quantity');
      }

      await conn.query(insertItemQuery, [
        orderId,
        item.product_id,
        item.quantity,
      ]);
    }

    await conn.commit();
    res.json({ message: 'Rendelés leadva!', orderId });

  } catch (err) {
    await conn.rollback();
    console.error('Rendelés hiba:', err);
    res.status(500).json({
      message: 'Hiba történt a rendelés során.',
      error: err.message
    });
  } finally {
    conn.release();
  }
});


// Minden rendelés listázása (admin)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  const [orders] = await pool.query(
    `SELECT o.*, u.username 
     FROM orders o LEFT JOIN users u ON o.user_id = u.id`
  );
  res.json(orders);
});

// Egy rendelés részletei (admin vagy saját)
router.get('/:id', authenticateToken, async (req, res) => {
  const [orders] = await pool.query('SELECT * FROM orders WHERE id=?', [req.params.id]);
  if (orders.length === 0) return res.sendStatus(404);

  // Csak saját vagy admin
  if (req.user.role !== 'admin' && orders[0].user_id !== req.user.id) return res.sendStatus(403);

  const [items] = await pool.query(`
    SELECT oi.*, p.name, p.price 
    FROM order_items oi 
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?`, [req.params.id]);

  res.json({ order: orders[0], items });
});


// Rendelés státuszának változtatása
const VALID_STATUSES = ['Beérkezett', 'Folyamatban', 'Kifizetve', 'Kiszállítva', 'Törölve', 'Félretéve']

router.put('/:id', async (req, res) => {
  const orderId = parseInt(req.params.id)
  const { status } = req.body

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Érvénytelen státusz' })
  }

try {
  const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  console.log('UPDATE eredmény:', result);
  res.json({ success: true });
} catch (err) {
  console.error('Adatbázis hiba:', err);
  res.status(500).json({ error: 'Adatbázis hiba' });
  }
  console.log(orderId, status)
})




module.exports = router;
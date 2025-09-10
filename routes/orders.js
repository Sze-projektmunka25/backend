const express = require('express');
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { DateTime } = require('luxon'); //szerver lokációja miatt időeltolódás kezelése

const router = express.Router();

// Saját rendelések lekérdezése (user)
router.get('/me', authenticateToken, async (req, res) => {
  const [orders] = await pool.query(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC`, [req.user.id]
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
const budapestNow = DateTime.now()
  .setZone("Europe/Budapest")
  .toFormat("yyyy-MM-dd HH:mm:ss");

const [orderResult] = await conn.query(
  'INSERT INTO orders (user_id, status, address, delivery_time, order_date) VALUES (?, ?, ?, ?, ?)',
  [req.user.id, 'Beérkezett', address, delivery_time, budapestNow]
);
    const orderId = orderResult.insertId;

    // Tételek beszúrása
// Tételek beszúrása
const insertItemQuery = `
  INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
  VALUES (?, ?, ?, ?, ?)
`;

for (const item of items) {
  if (!item.product_id || !item.quantity) {
    throw new Error('Hiányzó termékadat: product_id, quantity');
  }

  // Lekérdezzük az aktuális termék adatait
  const [prodRows] = await conn.query(
    'SELECT name, price FROM products WHERE id = ?',
    [item.product_id]
  );
  if (prodRows.length === 0) {
    throw new Error(`Nem létező termék ID: ${item.product_id}`);
  }
  const { name, price } = prodRows[0];

  await conn.query(insertItemQuery, [
    orderId,
    item.product_id,
    name,
    price,
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
     FROM orders o LEFT JOIN users u ON o.user_id = u.id `
  );
  res.json(orders);
});


// Egy rendelés részletei (admin vagy saját)
router.get('/:id', authenticateToken, async (req, res) => {
  const [orders] = await pool.query(`
    SELECT o.*, u.username, u.phone
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ? `,
    [req.params.id]
  );

  if (orders.length === 0) return res.sendStatus(404);

  // Csak saját rendelés vagy admin
  if (req.user.role !== 'admin' && orders[0].user_id !== req.user.id) {
    return res.sendStatus(401);
  }

  const [items] = await pool.query(`
    SELECT oi.product_id, oi.product_name AS name, oi.price, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = ?`,
    [req.params.id]
  );

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
  res.json({ success: true });
} catch (err) {
  console.error('Adatbázis hiba:', err);
  res.status(500).json({ error: 'Adatbázis hiba' });
  }
})




module.exports = router;
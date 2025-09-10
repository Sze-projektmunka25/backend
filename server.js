require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
const corsOptions = {
  origin: ['http://localhost:8080', 'https://szeproject22.netlify.app'], // több domain engedélyezése
  credentials: true // opcionális, ha sütiket vagy auth headert használsz
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend szerver: http://localhost:${PORT}`);
});

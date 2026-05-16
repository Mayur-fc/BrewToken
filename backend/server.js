const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const { db } = require('./firebase/firebase');
const analyticsRoutes = require('./analytics/analyticsRoutes');
const app = express();

// ✅ Explicitly allow your Live Server origin
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'https://brewtoken.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'BrewToken API is running' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
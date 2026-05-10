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
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5501',
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());
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
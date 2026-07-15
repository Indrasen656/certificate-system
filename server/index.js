// server/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import the routes in server/index.js
const certificateRoutes = require('./routes/certificate');

// Mount the routes
app.use('/api/certificates', certificateRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
// -----------------------------------------------

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
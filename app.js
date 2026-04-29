const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

// Local router DNS (10.100.102.1) refuses Node's UDP SRV queries,
// which breaks mongodb+srv:// lookups. Force public resolvers.
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/categories', categoryRoutes);

app.use(errorMiddleware);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Connection Failed!', err.message);
    process.exit(1);
  }
};

startServer();
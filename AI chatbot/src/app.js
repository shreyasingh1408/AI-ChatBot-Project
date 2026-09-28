const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('hello world');
});

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected!');
        console.log('MongoDB readyState:', mongoose.connection.readyState);
    } catch (err) {
        console.error('MongoDB error:', err);
        process.exit(1);
    }
}

connectDB();

module.exports = app;
const express = require('express');
const cors = require('cors');
const jobRoutes = require('./routes/jobRoutes');
const studentRoutes = require('./routes/studentRoutes');
const logger = require('./logger');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', jobRoutes);
app.use('/api', studentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handlers
process.on('unhandledRejection', (r) => logger.global('UnhandledRejection: ' + String(r)));
process.on('uncaughtException', (e) => logger.global('UncaughtException: ' + (e.stack || e)));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    logger.global(`Harvester server listening on http://localhost:${PORT}`);
});

module.exports = app; // For testing
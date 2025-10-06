// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// routes
const modelRoutes = require('./routes/modelRoutes');
app.use('/api/model', modelRoutes);

// other routes (existing ones) go here
// e.g., app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const { setIo, startSchedulers } = require('./services/alertsService');

setIo(io);
startSchedulers();

io.on('connection', socket => {
  console.log('🔌 Socket connected:', socket.id);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));

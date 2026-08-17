import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { logger } from './utils/logger';
import { BusService } from './services/bus.service';
import { connectDB } from './config/db';

// Connect to MongoDB Atlas
connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
     origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : [
          'https://www.vismayeeschool.com',
          'https://vismayeeschool.com'
        ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const busService = new BusService();

// Socket.IO event handler
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join a tracking room for a specific bus route
  socket.on('bus:join-route', (routeId: string) => {
    socket.join(`route:${routeId}`);
    logger.info(`Socket ${socket.id} joined room: route:${routeId}`);
  });

  // Leave route room
  socket.on('bus:leave-route', (routeId: string) => {
    socket.leave(`route:${routeId}`);
    logger.info(`Socket ${socket.id} left room: route:${routeId}`);
  });

  // Receive GPS updates from driver clients
  socket.on('bus:location-update', async (data: {
    routeId: string;
    latitude: number;
    longitude: number;
    etaMinutes?: number;
  }) => {
    const { routeId, latitude, longitude, etaMinutes } = data;
    logger.debug(`Bus route ${routeId} GPS update: [${latitude}, ${longitude}], ETA: ${etaMinutes}m`);

    try {
      // 1. Update status in database
      await busService.updateLiveLocation(routeId, latitude, longitude, etaMinutes);
      
      // 2. Broadcast live coordinates to all listening clients in that route room
      io.to(`route:${routeId}`).emit('bus:location-changed', {
        routeId,
        latitude,
        longitude,
        etaMinutes,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      logger.error(`Failed to handle socket bus update for route ${routeId}`, err);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start listening
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Socket.IO listening for real-time tracking events`);
  logger.info(`Health check endpoint: http://localhost:${PORT}/health`);
});

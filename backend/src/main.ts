import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // To be restricted in production
  }
});

const prisma = new PrismaClient();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

import { PostgresUserRepository } from './infrastructure/database/postgres-user.repository';
import { NodemailerNotificationSender } from './infrastructure/email/nodemailer-notification.sender';
import { RegisterUserUseCase } from './application/auth/register-user.use-case';
import { VerifyEmailNonceUseCase } from './application/auth/verify-email-nonce.use-case';
import { LoginUserUseCase } from './application/auth/login-user.use-case';
import { AuthController } from './presentation/http/controllers/auth.controller';
import { errorHandlerMiddleware } from './presentation/http/middlewares/error-handler.middleware';
import { authRateLimiter } from './presentation/http/middlewares/rate-limit.middleware';

// Initialize DI
const userRepository = new PostgresUserRepository(prisma);
const notificationSender = new NodemailerNotificationSender();

const registerUserUseCase = new RegisterUserUseCase(userRepository, notificationSender);
const verifyEmailNonceUseCase = new VerifyEmailNonceUseCase(userRepository);
const loginUserUseCase = new LoginUserUseCase(userRepository);

const authController = new AuthController(registerUserUseCase, verifyEmailNonceUseCase, loginUserUseCase);

// Routes
app.post('/api/auth/register', authRateLimiter, authController.register);
app.post('/api/auth/verify', authRateLimiter, authController.verifyEmail);
app.post('/api/auth/login', authRateLimiter, authController.login);

// Error Handling
app.use(errorHandlerMiddleware);


import { PostgresColonyRepository } from './infrastructure/database/postgres-colony.repository';
import { ProductionTickService } from './application/services/production-tick.service';
import jwt from 'jsonwebtoken';
import { Colony, Platform, Building } from './domain/entities/colony.entity';
import { v4 as uuidv4 } from 'uuid';
import { BuildingDefinitionRegistry } from '../../frontend/src/game/config/buildings';

// Initialize Repositories and Services
const colonyRepository = new PostgresColonyRepository(prisma);
const productionTickService = new ProductionTickService(colonyRepository, prisma, io);

// Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_please_change';
    const decoded = jwt.verify(token, secret) as any;
    socket.data.userId = decoded.sub;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log('New client connected:', socket.id, 'User:', userId);
  
  // Join user room for private notifications
  socket.join(`user:${userId}`);

  socket.on('building:place', async (data) => {
    console.log(`Building place request received from client ${socket.id}:`, data);
    try {
        let colony = await colonyRepository.findByUserId(userId);
        
        // Lazy create colony if it doesn't exist
        if (!colony) {
            const originPlatform = new Platform(uuidv4(), 'rocky', 0, 0, {}, new Date(), []);
            colony = new Colony(uuidv4(), userId, 0, 1, { leeks: 0 }, '', new Date(), new Date(), [originPlatform]);
            await colonyRepository.create(colony);
        }

        const platform = colony.platforms[0]; // Assuming building on first platform for now

        const def = BuildingDefinitionRegistry.get(data.typeKey);
        const costLeeks = def.getCost('leeks', 1);

        // Fetch user to check leek balance
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.leekBalance < costLeeks) {
            socket.emit('error', { message: 'Fonds insuffisants' });
            return;
        }

        // Deduct cost and save
        await prisma.user.update({
            where: { id: userId },
            data: { leekBalance: { decrement: costLeeks } }
        });

        // Add building to platform
        const newBuilding = new Building(
            uuidv4(),
            data.typeKey,
            data.col,
            data.row,
            { level: 1, botCount: 0 },
            new Date()
        );
        platform.buildings.push(newBuilding);
        await colonyRepository.save(colony);

        socket.emit('building:placed:success', {
            id: newBuilding.id,
            col: data.col,
            row: data.row,
            typeKey: data.typeKey
        });
        
        socket.emit('leek:update', (Number(user.leekBalance) - costLeeks).toString());

    } catch (err) {
        console.error('Error placing building:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('Connected to database');
    
    productionTickService.start();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

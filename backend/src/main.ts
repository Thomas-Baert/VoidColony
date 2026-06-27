import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

import { PostgresUserRepository } from './infrastructure/database/postgres-user.repository';
import { PostgresColonyRepository } from './infrastructure/database/postgres-colony.repository';
import { NodemailerNotificationSender } from './infrastructure/email/nodemailer-notification.sender';
import { SocketGameGateway } from './infrastructure/realtime/socket-game.gateway';

import { RegisterUserUseCase } from './application/auth/register-user.use-case';
import { VerifyEmailNonceUseCase } from './application/auth/verify-email-nonce.use-case';
import { LoginUserUseCase } from './application/auth/login-user.use-case';
import { EnsureColonyExistsService } from './application/colony/ensure-colony-exists.service';
import { PlaceBuildingUseCase } from './application/colony/place-building.use-case';
import { GetColonyStateUseCase } from './application/colony/get-colony-state.use-case';
import { ProductionTickService } from './application/services/production-tick.service';

import { AuthController } from './presentation/http/controllers/auth.controller';
import { errorHandlerMiddleware } from './presentation/http/middlewares/error-handler.middleware';
import { authRateLimiter } from './presentation/http/middlewares/rate-limit.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_please_change';
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // À restreindre en production
  },
});

const prisma = new PrismaClient();

app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ─── Infrastructure ─────────────────────────────────────────────────────────
const userRepository = new PostgresUserRepository(prisma);
const colonyRepository = new PostgresColonyRepository(prisma);
const notificationSender = new NodemailerNotificationSender();

// ─── Use cases & services applicatifs ───────────────────────────────────────
const registerUserUseCase = new RegisterUserUseCase(userRepository, notificationSender);
const verifyEmailNonceUseCase = new VerifyEmailNonceUseCase(userRepository);
const loginUserUseCase = new LoginUserUseCase(userRepository);
const ensureColonyExistsService = new EnsureColonyExistsService(colonyRepository);
const placeBuildingUseCase = new PlaceBuildingUseCase(colonyRepository, userRepository, ensureColonyExistsService);
const getColonyStateUseCase = new GetColonyStateUseCase(ensureColonyExistsService);

// ─── Présentation HTTP ───────────────────────────────────────────────────────
const authController = new AuthController(registerUserUseCase, verifyEmailNonceUseCase, loginUserUseCase);

app.post('/api/auth/register', authRateLimiter, authController.register);
app.post('/api/auth/verify', authRateLimiter, authController.verifyEmail);
app.post('/api/auth/login', authRateLimiter, authController.login);

app.use(errorHandlerMiddleware);

// ─── Temps réel ───────────────────────────────────────────────────────────────
const socketGameGateway = new SocketGameGateway(io, JWT_SECRET, placeBuildingUseCase, getColonyStateUseCase);
socketGameGateway.register();

// ─── Services de fond ────────────────────────────────────────────────────────
const productionTickService = new ProductionTickService(colonyRepository, prisma, io);

async function bootstrap(): Promise<void> {
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

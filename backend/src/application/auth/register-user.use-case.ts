import { IUserRepository } from '../../domain/interfaces/repositories/user-repository.interface';
import { INotificationSender } from '../../domain/interfaces/services/notification-sender.interface';
import { User } from '../../domain/entities/user.entity';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { DomainError } from '../../shared/errors/domain.error';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly notificationSender: INotificationSender
  ) {}

  async execute(email: string, passwordPlain: string): Promise<User> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new DomainError('Email already in use');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);
    
    // Generate 6 digit nonce
    const nonce = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 mins expiry

    const newUser = new User(
      crypto.randomUUID(),
      email,
      passwordHash,
      false, // not verified yet
      nonce,
      expiresAt,
      0n, // 0 leekBalance
      {},
      new Date(),
      null
    );

    await this.userRepository.create(newUser);
    await this.notificationSender.sendEmailVerificationNonce(email, nonce);

    return newUser;
  }
}

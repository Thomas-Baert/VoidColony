import { IUserRepository } from '../../domain/interfaces/repositories/user-repository.interface';
import { DomainError } from '../../shared/errors/domain.error';
import { NotFoundError } from '../../shared/errors/not-found.error';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class LoginUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(email: string, passwordPlain: string): Promise<{ token: string, user: any }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new DomainError('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new DomainError('Email not verified');
    }

    const isValidPassword = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValidPassword) {
      throw new DomainError('Invalid credentials');
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_please_change';
    const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '24h' });

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        leekBalance: user.leekBalance.toString()
      }
    };
  }
}

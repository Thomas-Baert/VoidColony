import { IUserRepository } from '../../domain/interfaces/repositories/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { PrismaClient } from '@prisma/client';

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(record: any): User {
    return new User(
      record.id,
      record.email,
      record.passwordHash,
      record.emailVerified,
      record.emailVerificationNonce,
      record.nonceExpiresAt,
      BigInt(record.leekBalance),
      record.avatarConfig,
      record.createdAt,
      record.lastLoginAt
    );
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        emailVerified: user.emailVerified,
        emailVerificationNonce: user.emailVerificationNonce,
        nonceExpiresAt: user.nonceExpiresAt,
        leekBalance: user.leekBalance,
        avatarConfig: user.avatarConfig,
        lastLoginAt: user.lastLoginAt
      }
    });
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        emailVerified: user.emailVerified,
        emailVerificationNonce: user.emailVerificationNonce,
        nonceExpiresAt: user.nonceExpiresAt,
        leekBalance: user.leekBalance,
        avatarConfig: user.avatarConfig,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  }
}

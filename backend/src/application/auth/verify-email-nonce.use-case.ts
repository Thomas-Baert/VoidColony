import { IUserRepository } from '../../domain/interfaces/repositories/user-repository.interface';
import { DomainError } from '../../shared/errors/domain.error';
import { NotFoundError } from '../../shared/errors/not-found.error';

export class VerifyEmailNonceUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(email: string, nonce: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User', email);
    }

    const now = new Date();
    const isSuccess = user.verifyEmail(nonce, now);
    
    if (isSuccess) {
      await this.userRepository.save(user);
    } else {
      throw new DomainError('Invalid or expired verification code');
    }

    return true;
  }
}

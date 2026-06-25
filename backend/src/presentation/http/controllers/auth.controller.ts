import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '../../../application/auth/register-user.use-case';
import { VerifyEmailNonceUseCase } from '../../../application/auth/verify-email-nonce.use-case';
import { LoginUserUseCase } from '../../../application/auth/login-user.use-case';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly verifyEmailNonceUseCase: VerifyEmailNonceUseCase,
    private readonly loginUserUseCase: LoginUserUseCase
  ) {}

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      await this.registerUserUseCase.execute(email, password);
      res.status(201).json({ message: 'User registered. Verification email sent.' });
    } catch (error) {
      next(error);
    }
  }

  public verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, nonce } = req.body;
      if (!email || !nonce) {
        return res.status(400).json({ error: 'Email and nonce are required' });
      }

      await this.verifyEmailNonceUseCase.execute(email, nonce);
      res.json({ message: 'Email successfully verified' });
    } catch (error) {
      next(error);
    }
  }

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await this.loginUserUseCase.execute(email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

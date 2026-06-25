export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public passwordHash: string,
    public emailVerified: boolean,
    public emailVerificationNonce: string | null,
    public nonceExpiresAt: Date | null,
    public leekBalance: bigint,
    public avatarConfig: any,
    public readonly createdAt: Date,
    public lastLoginAt: Date | null
  ) {}

  public verifyEmail(nonce: string, now: Date): boolean {
    if (this.emailVerified) return true;
    if (!this.emailVerificationNonce || !this.nonceExpiresAt) return false;
    if (now > this.nonceExpiresAt) return false;
    if (this.emailVerificationNonce !== nonce) return false;

    this.emailVerified = true;
    this.emailVerificationNonce = null;
    this.nonceExpiresAt = null;
    return true;
  }
}

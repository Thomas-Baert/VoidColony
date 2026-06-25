export interface INotificationSender {
  sendEmailVerificationNonce(email: string, nonce: string): Promise<void>;
}

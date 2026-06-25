import { INotificationSender } from '../../domain/interfaces/services/notification-sender.interface';
import nodemailer from 'nodemailer';

export class NodemailerNotificationSender implements INotificationSender {
  private transporter: nodemailer.Transporter;

  constructor() {
  this.transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'ssl0.ovh.net',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    // On force un booléen propre. Si SMTP_SECURE n'est pas défini, on met true par défaut pour le 465
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    auth: {
      user: process.env.SMTP_USER || 'no-reply@thomasbaert.fr',
      pass: process.env.SMTP_PASS || ''
    },
    // Si tu veux activer le pool de manière à ce que TypeScript l'accepte sans râler :
    pool: true,
    maxMessages: Infinity,
    maxConnections: 1 
  });
}

  async sendEmailVerificationNonce(email: string, nonce: string): Promise<void> {
    // On récupère l'utilisateur SMTP ou on met ton mail par défaut
    const smtpUser = process.env.SMTP_USER || 'no-reply@thomasbaert.fr';

    const mailOptions = {
      // Format "Nom <email>" pour un affichage propre dans la boîte de réception
      from: `"Void Colony" <${smtpUser}>`,
      to: email,
      subject: 'Code de vérification - Void Colony',
      text: `Bienvenue sur Void Colony !\n\nVoici votre code de vérification : ${nonce}\n\nCe code expirera dans 15 minutes.`
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      // Optionnel : throw error; si tu veux que ton API renvoie une erreur 500 à l'utilisateur
    }
  }
}

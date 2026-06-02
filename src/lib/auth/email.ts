import 'dotenv/config';
import nodemailer, { type Transporter } from 'nodemailer';

const FROM = process.env.SMTP_FROM || 'cosmin.cg22@gmail.com';

let transport: Transporter | null = null;
function getTransport(): Transporter | null {
  if (transport) return transport;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null; // dev: no SMTP
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS on 587
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

async function send(to: string, subject: string, text: string): Promise<void> {
  const t = getTransport();
  if (!t) {
    // Dev fallback (no SMTP configured): print the link so flows can be tested.
    // Never reached in production, where SMTP_* are set.
    console.log(`[email:dev] to=${to} | ${subject}\n${text}\n`);
    return;
  }
  await t.sendMail({ from: FROM, to, subject, text });
}

export const sendVerificationEmail = (to: string, url: string) =>
  send(to, 'Verify your MapSwitch email', `Confirm your email address:\n${url}\n\nIf you didn't sign up, ignore this message.`);

export const sendResetPasswordEmail = (to: string, url: string) =>
  send(to, 'Reset your MapSwitch password', `Reset your password:\n${url}\n\nThis link expires in 1 hour. If you didn't request it, ignore this message.`);

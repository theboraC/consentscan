import nodemailer from 'nodemailer';
const { SMTP_HOST, SMTP_PORT = 587, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
const transport = SMTP_HOST
  ? nodemailer.createTransport({ host: SMTP_HOST, port: +SMTP_PORT, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null;

export async function mail(to, subject, html) {
  if (!transport) return console.log(`\n[mail -> ${to}] ${subject}\n${html}\n`);
  await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, html }).catch((e) => console.error('mail failed:', e.message));
}

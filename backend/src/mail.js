const { RESEND_API_KEY } = process.env;
const FROM = process.env.MAIL_FROM || 'ConsentScan <onboarding@resend.dev>';

// Returns true when the email was handed to Resend, false otherwise.
export async function mail(to, subject, html) {
  if (!RESEND_API_KEY) { console.log(`\n[mail -> ${to}] ${subject}\n${html}\n`); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!r.ok) { console.error('mail failed:', r.status, await r.text()); return false; }
    return true;
  } catch (e) { console.error('mail failed:', e.message); return false; }
}
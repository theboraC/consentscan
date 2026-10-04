   const { RESEND_API_KEY } = process.env;
   const FROM = process.env.MAIL_FROM || 'ConsentScan <onboarding@resend.dev>';

   export async function mail(to, subject, html) {
     if (!RESEND_API_KEY) return console.log(`\n[mail -> ${to}] ${subject}\n${html}\n`);
     try {
       const r = await fetch('https://api.resend.com/emails', {
         method: 'POST',
         headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ from: FROM, to: [to], subject, html }),
       });
       if (!r.ok) console.error('mail failed:', r.status, await r.text());
     } catch (e) { console.error('mail failed:', e.message); }
   }
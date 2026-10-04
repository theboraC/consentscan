import { Shell } from './pages.jsx';
import { card } from './ui.jsx';

// Change this to the address people should write to about their data.
// It is shown publicly on both pages.
const CONTACT_EMAIL = 'thebora1622@gmail.com';
const UPDATED = 'October 2026';

const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>;
const H = ({ children }) => <h2 className="font-display font-bold text-2xl mb-2">{children}</h2>;
const P = ({ children }) => <p className="text-mute">{children}</p>;
const L = ({ items }) => <ul className="list-disc pl-5 space-y-1 text-mute">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

function Doc({ title, children }) {
  return (
    <Shell>
      <article className="max-w-3xl mx-auto py-8">
        <h1 className="font-display font-bold text-4xl">{title}</h1>
        <p className="text-sm text-mute mt-2">Last updated: {UPDATED}</p>
        <div className="mt-8 space-y-8 leading-relaxed">{children}</div>
      </article>
    </Shell>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy Policy">
      <section>
        <H>Who we are</H>
        <P>ConsentScan is a tool that checks websites for cookie consent practices. This notice explains what personal data we collect when you use it, why we collect it, and what choices you have. It is written to follow the notice requirements of India's Digital Personal Data Protection Act, 2023. It is available in English. If you need it in another Indian language listed in the Eighth Schedule of the Constitution, write to us at <Mail />.</P>
      </section>

      <section>
        <H>What we collect</H>
        <L items={[
          'Account details: your name, your email address, and either a password (stored only in scrambled, hashed form) or, if you use Google sign-in, the name and email address Google shares with us.',
          'Content you save: scan results, location names, and workspace and team information you add.',
          'Messages you send us through the contact form: your name, email address and message.',
          'Technical data: our hosting providers may record your IP address and browser details in server logs to keep the service running and secure.',
        ]} />
      </section>

      <section>
        <H>Why we use it</H>
        <L items={[
          'To create your account, sign you in and keep you signed in.',
          'To run website scans and store the results you choose to save.',
          'To send emails you need, such as email verification, password reset and workspace invitations.',
          'To reply to your messages.',
          'To keep the service secure and prevent misuse.',
          'To understand how the site is used, only if you accept analytics cookies.',
        ]} />
      </section>

      <section>
        <H>Your consent</H>
        <P>We use your personal data on the basis of your consent, which you give by creating an account, using Google sign-in, sending a message, or accepting optional cookies in our cookie banner. Optional cookies stay off until you choose them. You can withdraw consent at any time, as easily as you gave it: change your cookie choices from the Cookie settings link, or ask us to delete your account by writing to <Mail />. Withdrawing consent does not affect what was done before you withdrew it.</P>
      </section>

      <section>
        <H>Who we share it with</H>
        <P>We do not sell your data. We use the following service providers to run ConsentScan, and they process data on our behalf:</P>
        <L items={[
          'Vercel: hosts the website.',
          'Render: hosts our server (Singapore region).',
          'MongoDB Atlas: stores our database (Mumbai region).',
          'Google: provides Google sign-in and Google Fonts, and Google Analytics only if you accept analytics cookies.',
          'OneTrust: provides our cookie banner and records your cookie choices.',
        ]} />
      </section>

      <section>
        <H>How long we keep it</H>
        <P>We keep your account data and saved scans until you delete them or ask us to delete your account. Contact messages are kept only as long as needed to deal with your request. Server logs are kept for a short period by our hosting providers.</P>
      </section>

      <section>
        <H>Your rights</H>
        <P>Under the Digital Personal Data Protection Act, 2023, you have the right to:</P>
        <L items={[
          'get a summary of the personal data we hold about you and how we use it',
          'ask us to correct or complete your data',
          'ask us to erase your data',
          'withdraw your consent',
          'have your grievance dealt with, and nominate another person to exercise these rights for you if you die or cannot act',
        ]} />
        <P>To use any of these rights, or to raise a concern, write to <Mail />. We will respond as soon as we reasonably can. If you are not satisfied with our response, you may complain to the Data Protection Board of India.</P>
      </section>

      <section>
        <H>Children</H>
        <P>ConsentScan is for people aged 18 and over. We do not knowingly collect personal data from anyone under 18. If you believe a child has given us data, write to <Mail /> and we will delete it.</P>
      </section>

      <section>
        <H>Security</H>
        <P>We protect your data with encrypted connections (HTTPS), hashed passwords and access controls. No system is completely secure, so we cannot promise absolute security.</P>
      </section>

      <section>
        <H>Changes to this notice</H>
        <P>If we change how we use your data, we will update this page and the date at the top.</P>
      </section>

      <p className="text-sm text-mute">See also our <a className="underline" href="/cookies">Cookie Policy</a>.</p>
    </Doc>
  );
}

const COOKIES = [
  ['OptanonConsent', 'OneTrust', 'Remembers your cookie choices.', 'Strictly necessary', 'Up to 1 year'],
  ['_ga', 'Google Analytics', 'Tells visitors apart so we can count visits.', 'Performance', 'Up to 1 year'],
  ['_ga_L10RKE2PEE', 'Google Analytics', 'Keeps track of your visit session.', 'Performance', 'Up to 1 year'],
];
const STORAGE = [
  ['cs_token', 'Keeps you signed in.', 'Strictly necessary'],
  ['cs_ws', 'Remembers which workspace you are using.', 'Strictly necessary'],
];

export function CookiePolicy() {
  return (
    <Doc title="Cookie Policy">
      <section>
        <H>What cookies are</H>
        <P>Cookies are small text files that a website stores in your browser. We also use your browser's local storage, which works in a similar way. Some are needed for the site to work. Others help us understand how the site is used, and we only use those if you agree.</P>
      </section>

      <section>
        <H>Cookies we use</H>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-mute border-b border-line">{['Name', 'Provider', 'Purpose', 'Category', 'Lasts'].map((h) => <th key={h} className="font-medium py-2 px-3">{h}</th>)}</tr></thead>
            <tbody>{COOKIES.map((c) => <tr key={c[0]} className="border-b border-line/60 last:border-0">{c.map((v, i) => <td key={i} className={`py-2 px-3 ${i === 0 ? 'font-medium' : 'text-mute'}`}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <P>Google Analytics cookies are set only after you allow performance cookies. Until then they stay off.</P>
      </section>

      <section>
        <H>Browser storage we use</H>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-mute border-b border-line">{['Name', 'Purpose', 'Category'].map((h) => <th key={h} className="font-medium py-2 px-3">{h}</th>)}</tr></thead>
            <tbody>{STORAGE.map((c) => <tr key={c[0]} className="border-b border-line/60 last:border-0">{c.map((v, i) => <td key={i} className={`py-2 px-3 ${i === 0 ? 'font-medium' : 'text-mute'}`}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <section>
        <H>Other services that load on our pages</H>
        <L items={[
          'Google Fonts loads the typefaces used on the site. This sends your IP address to Google.',
          'Google sign-in loads only on the sign-in and sign-up pages.',
        ]} />
      </section>

      <section>
        <H>Your choices</H>
        <P>Optional cookies are off until you choose them. You can change or withdraw your choice at any time:</P>
        <button type="button" onClick={() => window.OneTrust?.ToggleInfoDisplay()} className="ot-sdk-show-settings mt-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-ink text-white hover:bg-ink/85 cursor-pointer">Cookie settings</button>
        <P>You can also block or delete cookies in your browser settings. If you block the necessary ones, parts of the site, such as signing in, may stop working.</P>
      </section>

      <section>
        <H>Questions</H>
        <P>Write to <Mail /> if you have a question about how we use cookies. Our <a className="underline" href="/privacy">Privacy Policy</a> explains how we handle your personal data.</P>
      </section>
    </Doc>
  );
}
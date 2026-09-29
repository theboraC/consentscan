import { chromium } from 'playwright';
import dns from 'node:dns/promises';
import net from 'node:net';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// ---- concurrency queue (max 2 scans at once) ----
let active = 0; const queue = [];
export const enqueue = (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); pump(); });
function pump() {
  while (active < 1 && queue.length) {
    const { fn, resolve, reject } = queue.shift(); active++;
    fn().then(resolve, reject).finally(() => { active--; pump(); });
  }
}

// ---- SSRF protection ----
const isPrivate = (ip) => /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|::ffff:|fc|fd|fe80)/i.test(ip);
async function safeUrl(input) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input); } catch { throw new Error('That is not a valid URL'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http and https URLs can be scanned');
  const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true }).catch(() => { throw new Error('Domain not found'); });
  if (addrs.some((a) => isPrivate(a.address))) throw new Error('Private or local addresses cannot be scanned');
  return u.href;
}

// ---- cookie categories ----
const NECESSARY = /^(csrf|xsrf|__host-|__secure-|session|sess|phpsessid|jsessionid|asp\.net_sessionid|cf_|__cf|awsalb|cookieconsent|cookie_consent|cookielawinfo|optanon|cookiebot|cconsent|euconsent|consent|cmplz|borlabs|didomi|_cmpc|__stripe|wordpress_test|wp-settings)/i;
const ANALYTICS = /^(_ga|_gid|_gat|_hj|hjid|_clck|_clsk|ajs_|amplitude|mp_|_pk_|__utm|_utm|_vwo|_vis_opt|mixpanel|ki_|_dc_gtm)/i;
const MARKETING = /^(_fbp|_fbc|fr$|ide$|test_cookie|_gcl|_uet|muid|anonymousid|_tt_|_ttp|tt_|_pin|_scid|li_|lidc|bcookie|personalization_id|guest_id|nid$|1p_jar|dsid|__gads|__gpi|_kuid|criteo|cto_|uuid2|_rdt|ar_debug|receive-cookie)/i;
const FUNCTIONAL = /^(lang|locale|i18n|currency|theme|wp-|woocommerce_|cart|country|timezone|remember|preferences)/i;
const category = (n) => NECESSARY.test(n) ? 'Strictly necessary' : ANALYTICS.test(n) ? 'Analytics' : MARKETING.test(n) ? 'Marketing' : FUNCTIONAL.test(n) ? 'Functional' : 'Unknown';
const nonEssential = (list) => (list || []).filter((c) => c.category === 'Analytics' || c.category === 'Marketing');
const TRACKERS = /google-analytics|googletagmanager|doubleclick|googlesyndication|connect\.facebook|facebook\.com\/tr|hotjar|clarity\.ms|segment\.(io|com)|mixpanel|analytics\.tiktok|adsystem|criteo|px\.ads\.linkedin|snap\.licdn|ads-twitter|pinterest\.com\/ct|amplitude\.com/i;

// ---- runs inside the page (must be self-contained) ----
function detect() {
  const visible = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 40 && r.height > 20 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const TXT = /cookie|consent|gdpr|privacy/i;
  const KNOWN = '#onetrust-banner-sdk,#onetrust-consent-sdk,#CybotCookiebotDialog,.cky-consent-container,#usercentrics-root,#termly-code-snippet-support,.cmplz-cookiebanner,.osano-cm-window,#didomi-host,#truste-consent-track,[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[aria-label*="cookie" i],[role="dialog"],[role="alertdialog"]';
  const fixed = [...document.querySelectorAll('div,section,aside,dialog,form')].filter((e) => { const p = getComputedStyle(e).position; return (p === 'fixed' || p === 'sticky') && TXT.test(e.innerText || ''); });
  const cands = [...new Set([...document.querySelectorAll(KNOWN), ...fixed])].filter((e) => visible(e) && TXT.test(e.innerText || '') && (e.innerText || '').length < 4000);
  const BTN = 'button,a,[role="button"],input[type="button"],input[type="submit"]';
  const withBtns = cands.map((c) => ({ c, b: [...c.querySelectorAll(BTN)].filter(visible) })).filter((x) => x.b.length);
  withBtns.sort((a, b) => a.c.innerText.length - b.c.innerText.length);
  const pick = withBtns[0];
  const RE = {
    reject: /(reject|decline|deny|refuse|only necessary|necessary only|essential only|only essential|ablehnen|refuser|rechazar|rifiuta|weigeren)/i,
    accept: /^(accept|allow|agree|i agree|i accept|got it|ok|okay|yes|akzeptieren|alle akzeptieren|accepter|tout accepter|aceptar|accetta|accepteren)/i,
    manage: /(manage|preferences|settings|customi[sz]e|options|choices|einstellungen|paramètres|configurar|personalizar|impostazioni)/i,
  };
  const buttons = { accept: null, reject: null, manage: null };
  if (pick) {
    pick.c.setAttribute('data-cs-banner', '1');
    for (const el of pick.b) {
      const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
      if (!t || t.length > 60) continue;
      for (const k of ['reject', 'accept', 'manage']) {
        if (!buttons[k] && RE[k].test(t)) { buttons[k] = t; el.setAttribute('data-cs', k); break; }
      }
    }
  }
  return { found: !!pick, buttons };
}
function getLinks() {
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({ t: (a.textContent || '').trim().slice(0, 80), h: a.href })).filter((l) => /^https?:/.test(l.h));
  const cookie = links.find((l) => (/cookie/i.test(l.t) && /polic|notice|statement|settings/i.test(l.t)) || /cookie-?(policy|notice|statement)/i.test(l.h));
  const privacy = links.find((l) => /privacy/i.test(l.t) || /privacy/i.test(l.h));
  return { cookie, privacy };
}

async function checkLink(l) {
  if (!l) return { found: false };
  try {
    const u = await safeUrl(l.h);
    const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    return { found: true, url: l.h, text: l.t, status: r.status, ok: r.status < 400 };
  } catch { return { found: true, url: l.h, text: l.t, status: 0, ok: false }; }
}

export async function scan(input) {
  const url = await safeUrl(input);
  const host = new URL(url).hostname;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const mapCookies = (list) => list.map((c) => {
    const d = c.domain.replace(/^\./, '');
    return {
      name: c.name, domain: c.domain, path: c.path, category: category(c.name),
      party: host === d || host.endsWith('.' + d) || d.endsWith('.' + host) ? 'First-party' : 'Third-party',
      expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString().slice(0, 10) : 'Session',
      secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
    };
  });

  async function run(action) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, userAgent: UA, locale: 'en-US' });
    try {
      const page = await ctx.newPage(); const hosts = new Set();
      page.on('request', (r) => { if (TRACKERS.test(r.url())) { try { hosts.add(new URL(r.url()).hostname); } catch {} } });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const title = await page.title().catch(() => '');
      const banner = await page.evaluate(detect);
      let cookies = mapCookies(await ctx.cookies()), shot = null, links = null;
      if (!action) {
        const el = page.locator('[data-cs-banner]').first();
        const buf = banner.found ? await el.screenshot({ type: 'jpeg', quality: 55 }).catch(() => null) : null;
        shot = (buf || await page.screenshot({ type: 'jpeg', quality: 45 }).catch(() => null))?.toString('base64') || null;
        links = await page.evaluate(getLinks);
      } else if (banner.buttons[action]) {
        await page.locator(`[data-cs="${action}"]`).first().click({ timeout: 5000 });
        await page.waitForTimeout(3000);
        cookies = mapCookies(await ctx.cookies());
      } else cookies = null;
      return { title, banner, cookies, hosts: [...hosts], shot, links };
    } finally { await ctx.close(); }
  }

  try {
    const pre = await run(null);
    const acc = pre.banner.buttons.accept ? await run('accept').catch(() => null) : null;
    const rej = pre.banner.buttons.reject ? await run('reject').catch(() => null) : null;
    const [cookiePol, privacyPol] = await Promise.all([checkLink(pre.links?.cookie), checkLink(pre.links?.privacy)]);

    const checks = []; let penalty = 0;
    const add = (id, title, status, detail, weight) => { checks.push({ id, title, status, detail }); penalty += status === 'fail' ? weight : status === 'warn' ? weight / 2 : 0; };
    if (/just a moment|access denied|attention required|captcha|are you a robot/i.test(pre.title)) add('blocked', 'Scan may be blocked', 'warn', 'The site showed a bot-protection page, so results may be incomplete.', 10);
    const b = pre.banner;
    add('banner', 'Cookie banner', b.found ? 'pass' : 'fail', b.found ? 'A cookie banner was detected.' : 'No cookie banner was detected on the page.', 25);
    if (b.found) {
      add('accept', 'Accept button', b.buttons.accept ? 'pass' : 'fail', b.buttons.accept ? `Found "${b.buttons.accept}".` : 'No accept button found.', 5);
      add('reject', 'Reject button', b.buttons.reject ? 'pass' : 'fail', b.buttons.reject ? `Found "${b.buttons.reject}".` : 'No reject button on the first layer of the banner.', 15);
      add('manage', 'Manage preferences', b.buttons.manage ? 'pass' : 'warn', b.buttons.manage ? `Found "${b.buttons.manage}".` : 'No manage-preferences option found.', 5);
    }
    const ne = nonEssential(pre.cookies);
    add('pre', 'Cookies before consent', ne.length ? 'fail' : 'pass', ne.length ? `${ne.length} analytics/marketing cookie(s) were set before any consent: ${ne.slice(0, 6).map((c) => c.name).join(', ')}.` : 'No analytics or marketing cookies were set before consent.', 30);
    add('trackers', 'Tracker requests before consent', pre.hosts.length ? 'warn' : 'pass', pre.hosts.length ? `Requests sent to: ${pre.hosts.slice(0, 6).join(', ')}.` : 'No known tracker requests before consent.', 10);
    if (rej?.cookies) { const n = nonEssential(rej.cookies); add('rejectWorks', 'Reject is respected', n.length ? 'fail' : 'pass', n.length ? `${n.length} non-essential cookie(s) still present after rejecting.` : 'No non-essential cookies after rejecting.', 10); }
    add('cookiePolicy', 'Cookie policy link', cookiePol.found ? (cookiePol.ok ? 'pass' : 'warn') : 'fail', cookiePol.found ? `${cookiePol.url} (HTTP ${cookiePol.status || 'no response'})` : 'No cookie policy link found.', 10);
    add('privacyPolicy', 'Privacy policy link', privacyPol.found ? (privacyPol.ok ? 'pass' : 'warn') : 'fail', privacyPol.found ? `${privacyPol.url} (HTTP ${privacyPol.status || 'no response'})` : 'No privacy policy link found.', 10);

    return {
      url, title: pre.title, score: Math.max(0, Math.round(100 - penalty)), checks, banner: b,
      policies: { cookie: cookiePol, privacy: privacyPol },
      cookies: { pre: pre.cookies, accept: acc?.cookies || null, reject: rej?.cookies || null },
      trackers: pre.hosts, screenshot: pre.shot ? 'data:image/jpeg;base64,' + pre.shot : null, scannedAt: new Date().toISOString(),
    };
  } catch (e) {
    if (/Timeout|net::/i.test(e.message)) throw new Error('The site did not load in time or refused the connection. Try again or check the URL.');
    throw e;
  } finally { await browser.close(); }
}

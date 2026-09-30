// End-to-End-Rauchtest: steuert den Web-Export in Chrome per DevTools-Protokoll.
// Nutzung: npx expo export --platform web --output-dir dist-web && node scripts/e2e-web.mjs dist-web
// Braucht Node ≥ 22 (globales WebSocket) und Google Chrome.
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, statSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist-web');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_PORT = 8791;
const CDP_PORT = 9341;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  let file = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(file) || statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(APP_PORT);

const chrome = spawn(CHROME, [
  '--headless', '--disable-gpu', `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'cr-e2e-'))}`, '--window-size=430,932', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const problems = [];

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome startet noch */ }
    await sleep(500);
  }
  throw new Error('Chrome nicht erreichbar');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    problems.push(`Exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    problems.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const n = ++id;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'evaluate failed');
  return r.result.result.value;
};

const text = () => js('document.body.innerText');
async function waitFor(desc, fn, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(150);
  }
  throw new Error(`Timeout: ${desc}\n--- Seite ---\n${(await text()).slice(0, 600)}`);
}
// innerText liefert Text mit text-transform (z. B. Großbuchstaben), daher ohne Groß-/Kleinschreibung vergleichen.
const has = (haystack, t) => haystack.toLowerCase().includes(t.toLowerCase());
const hasText = (t) => async () => has(await text(), t);
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` ${extra}`}`);
};
const esc = JSON.stringify;

// Klickt das kleinste klickbare Element, das den Text (oder das aria-label) enthält.
const click = (label, { exact = false } = {}) =>
  js(`(() => {
    const want = ${esc(label)};
    const els = [...document.querySelectorAll('[role=button],[role=radio],[role=tab],[role=switch],a,[tabindex="0"]')];
    const hit = els.filter((e) => {
      const t = (e.getAttribute('aria-label') || e.innerText || '').trim();
      return ${exact ? 't === want' : 't.toLowerCase().includes(want.toLowerCase())'};
    }).sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
    if (!hit) return false;
    hit.click();
    return true;
  })()`);
const mustClick = async (label, opts) => {
  await waitFor(`Element „${label}“`, () => click(label, opts), 15000);
  await sleep(250);
};
// Klickt +/− im Stepper der Zeile mit dem Label.
const stepper = (rowLabel, aria, times) =>
  js(`(async () => {
    const label = [...document.querySelectorAll('div,span')].find((e) => e.childElementCount === 0 && e.innerText?.trim() === ${esc(rowLabel)});
    let row = label;
    while (row && !row.querySelector('[aria-label=${esc(aria)}]')) row = row.parentElement;
    if (!row) return false;
    for (let i = 0; i < ${times}; i++) { row.querySelector('[aria-label=${esc(aria)}]').click(); await new Promise((r) => setTimeout(r, 60)); }
    return true;
  })()`);
const storage = async () => JSON.parse(await js(`localStorage.getItem('cr.state.v1') || 'null'`) ?? 'null');

async function run() {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: `http://127.0.0.1:${APP_PORT}/` });

  // --- Start
  await waitFor('Startseite', hasText('Elixier-Trainer'));
  check('Startseite rendert', true);
  check('Serie startet bei 0/3', has(await text(), 'Heute 0/3 Runden'));

  // --- Eigene Runde: 3 Fragen, 2× Tempo
  await mustClick('Eigene Einstellungen');
  await waitFor('Einstellungen', hasText('Fragen pro Runde'));
  check('Fragen verringern', await stepper('Fragen pro Runde', 'Weniger', 7));
  check('Tempo erhöhen', await stepper('Tempo', 'Mehr', 4));
  check('Lernhilfe einschalten', await click('Lernhilfe'));
  await mustClick('Training starten');

  await waitFor('Countdown', hasText('Gegner startet mit 5 Elixier'));
  check('Countdown zeigt Gegnerdeck', has(await text(), 'Gegnerdeck:'));

  for (let q = 1; q <= 3; q++) {
    await waitFor(`Frage ${q}`, hasText('Wie viel Elixier hat der Gegner jetzt?'), 60000);
    const t = await text();
    check(`Frage ${q}: Zähler`, t.includes(`Frage ${q}/3`));
    if (q === 1) {
      check('Eigenes Elixier sichtbar', has(t, 'Du ·'));
      check('Lernhilfe sichtbar', has(t, 'Lernhilfe') && has(t, 'ausgegeben: du'));
    }
    await mustClick(`${(q * 3) % 10} Elixier`);
    await waitFor('Auflösung', hasText('Gegner hatte'), 8000);
    const r = await text();
    check(`Frage ${q}: Auflösung mit Rechenweg`, has(r, 'Rechenweg') || has(r, 'Elixier-Handel'));
    check(`Frage ${q}: Elixier-Handel`, has(r, 'Elixier-Handel'));
    await mustClick(q === 3 ? 'Ergebnis ansehen' : 'Weiter', { exact: false });
  }

  await waitFor('Ergebnis', hasText('/ 300'));
  const res = await text();
  check('Ergebnis-Screen mit Punkten', /\d+\s*\/ 300/.test(res));
  check('Ergebnis: Rang und Statistik', has(res, 'Exakt') && has(res, 'Ø Reaktion'));
  const st = await storage();
  check('Runde genau einmal gespeichert', st?.history?.length === 1, JSON.stringify(st?.history?.length));
  check('Gespeicherte Runde hat 3 Fragen', st?.history?.[0]?.questions === 3);

  await mustClick('Zurück', { exact: true });
  await waitFor('Startseite nach Runde', hasText('Tagesziel'));
  await waitFor('Serie aktualisiert', hasText('Heute 1/3 Runden'), 5000);
  check('Serie nach Runde: 1 Tag, 1/3', has(await text(), 'Heute 1/3 Runden'));

  // --- Übungsmodus
  await mustClick('Übungsmodus: Ein Zug');
  await waitFor('Übung', hasText('Wie viel Elixier hat er jetzt?'));
  await mustClick('4 Elixier');
  await waitFor('Übung Auflösung', hasText('Nächste Aufgabe'), 5000);
  check('Übung: Rechenweg', has(await text(), 'Ergebnis:'));
  await mustClick('Nächste Aufgabe');
  await mustClick('Doppeltes Elixier');
  await waitFor('Übung Stufe 3', hasText('Wie viel Elixier hat er jetzt?'));
  check('Übung: Stufe wechseln', /[23]× Elixier/.test(await text()));
  await mustClick('Übung beenden');
  await waitFor('zurück', hasText('Tagesziel'));

  // --- Zufallsdeck
  await mustClick('Zufallsdeck');
  await waitFor('Zufallsdeck', hasText('Spielbarkeit'));
  for (let i = 0; i < 5; i++) {
    const bad = await js(`[...document.body.innerText.split('\\n')].filter((l) => l.startsWith('✗')).length`);
    const tiles = await js(`document.querySelectorAll('[aria-label$=" Elixier"], [aria-label*=" Elixier, fixiert"]').length`);
    check(`Zufallsdeck ${i + 1}: alle Regeln erfüllt`, bad === 0, `(${bad} Regeln verletzt)`);
    if (i === 0) check('Zufallsdeck: 8 Karten', tiles >= 8, `(${tiles})`);
    await mustClick('Neu würfeln');
  }

  // --- Deck-Finder
  await mustClick('Deck-Finder');
  await waitFor('Deck-Finder', hasText('#1'));
  const finder = await text();
  check('Deck-Finder: Liste mit 15 Decks', has(finder, '#15'));
  check('Deck-Finder: Stärke sortiert (5★ zuerst)', /#1[\s\S]{0,80}★★★★★/.test(finder));

  // --- Profil
  await mustClick('Profil');
  await waitFor('Profil', hasText('Clash-Royale-Konto'));
  const prof = await text();
  check('Profil: offizieller Disclaimer', has(prof, 'This material is unofficial and is not endorsed by Supercell'));
  check('Profil: Verlauf zeigt Runde', has(prof, 'Trainingsverlauf') && !has(prof, 'Noch keine Runden'));
  await mustClick('Profil laden');
  await waitFor('Tag-Fehler', hasText('Ungültiger Tag'), 5000);
  check('Profil: leerer Tag wird abgelehnt', true);

  // Ungültiger Proxy → lesbare Fehlermeldung statt Absturz
  await js(`(() => {
    const set = (el, v) => { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const tag = document.querySelector('input[placeholder="#ABC123"]');
    const proxy = document.querySelector('input[placeholder^="https://"]');
    set(tag, '#2PP'); set(proxy, 'http://127.0.0.1:9');
  })()`);
  await sleep(300);
  await mustClick('Profil laden');
  await waitFor('Proxy-Fehler', hasText('Keine Verbindung zum Proxy'), 25000);
  check('Profil: unerreichbarer Proxy → Fehlermeldung', true);
  const s2 = await storage();
  check('Profil: Tag normalisiert gespeichert', s2?.settings?.playerTag === '#2PP', JSON.stringify(s2?.settings?.playerTag));

  // --- Neuladen: Zustand bleibt
  await send('Page.reload');
  await waitFor('nach Reload', hasText('Clash-Royale-Konto'), 15000);
  await sleep(800);
  const s3 = await storage();
  check('Nach Reload: Verlauf bleibt erhalten', s3?.history?.length === 1);
}

let failed = false;
try {
  await run();
} catch (e) {
  failed = true;
  console.log(`FAIL  ${e.message}`);
}
const noise = /pointerEvents|shadow\*|Download the React DevTools|useNativeDriver|Unexpected text node|Failed to load resource/;
const real = problems.filter((p) => !noise.test(p));
console.log(`\nKonsole: ${real.length} Fehler${real.length ? '\n' + [...new Set(real)].join('\n') : ''}`);
const bad = results.filter((r) => !r.ok).length;
console.log(`${results.length - bad}/${results.length} Prüfungen bestanden${failed ? ', Abbruch durch Fehler' : ''}`);
ws.close();
chrome.kill();
server.close();
process.exit(failed || bad || real.length ? 1 : 0);

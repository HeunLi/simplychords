// Renders icon.svg / icon-small.svg to the PNG sizes Chrome needs, using a headless Edge/Chrome.
// Run: node icons/make-icons.js
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const PORT = 9343;
// [size, source, padding]. The 128 px icon follows the Chrome Web Store guideline:
// 96 px of artwork with 16 px of transparent padding on each side.
const SIZES = [[16, 'icon-small.svg', 0], [32, 'icon-small.svg', 0], [48, 'icon.svg', 0], [128, 'icon.svg', 16]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const exe = BROWSERS.find((b) => fs.existsSync(b));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  try {
    let tabs;
    for (let i = 0; i < 60 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(250); } }
    const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const call = (expression) => new Promise((res, rej) => {
      const i = ++id;
      ws.addEventListener('message', function on(e) {
        const m = JSON.parse(e.data);
        if (m.id !== i) return;
        ws.removeEventListener('message', on);
        if (m.result.exceptionDetails) rej(new Error(m.result.exceptionDetails.text)); else res(m.result.result.value);
      });
      ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
    });
    for (const [size, file, pad] of SIZES) {
      const svg = fs.readFileSync(path.join(__dirname, file), 'utf8');
      const b64 = await call(`new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = ${size};
          const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, ${pad}, ${pad}, ${size - 2 * pad}, ${size - 2 * pad});
          res(c.toDataURL('image/png').split(',')[1]); };
        img.onerror = () => rej(new Error('svg failed'));
        img.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))};
      })`);
      const out = path.join(__dirname, `icon${size}.png`);
      fs.writeFileSync(out, Buffer.from(b64, 'base64'));
      console.log('wrote', path.basename(out));
    }
    ws.close();
  } finally {
    proc.kill();
  }
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });

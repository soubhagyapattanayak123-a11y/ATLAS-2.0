// ATLAS 2.0 - PWA & Offline Cache Manager

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstallerRegistered = false;

export function registerServiceWorkerAndPWA(): void {
  if (typeof window === 'undefined') return;

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[ATLAS PWA] ServiceWorker registered successfully:', registration.scope);
        })
        .catch((error) => {
          console.warn('[ATLAS PWA] ServiceWorker registration failed:', error);
        });
    });
  }

  // Intercept beforeinstallprompt for native install button
  if (!isInstallerRegistered) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new CustomEvent('atlas_pwa_installable', { detail: { installable: true } }));
      console.log('[ATLAS PWA] App is installable on this device.');
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      window.dispatchEvent(new CustomEvent('atlas_pwa_installed'));
      console.log('[ATLAS PWA] App successfully installed on device.');
    });

    isInstallerRegistered = true;
  }
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function canPromptNativeInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptNativeInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
  if (!deferredPrompt) {
    return 'unsupported';
  }
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice.outcome;
  } catch (err) {
    console.warn('[ATLAS PWA] Install prompt failed:', err);
    return 'unsupported';
  }
}

// Pre-cache all active assets for full zero-net offline guarantee
export async function preCacheAllOfflineAssets(): Promise<{ success: boolean; cachedCount: number }> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { success: false, cachedCount: 0 };
  }

  const urlsToCache = [
    '/',
    '/index.html',
    '/atlas-logo.png',
    '/favicon.svg',
    '/manifest.webmanifest',
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map((l) => l.href),
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map((s) => s.src),
  ].filter(Boolean);

  try {
    const cache = await caches.open('atlas-cache-v2.1');
    let count = 0;
    for (const url of urlsToCache) {
      try {
        await cache.add(url);
        count++;
      } catch {
        // Continue if single asset fails
      }
    }
    return { success: true, cachedCount: count };
  } catch (err) {
    console.warn('[ATLAS PWA] Cache error:', err);
    return { success: false, cachedCount: 0 };
  }
}

// Download Standalone Self-Contained Offline HTML file for any laptop or phone
export function downloadStandaloneOfflineHtml(): void {
  const offlineHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATLAS 2.0 - Standalone Portable Offline Workspace</title>
  <style>
    :root {
      --bg: #080a10;
      --surface: #0f172a;
      --card: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #6366f1;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 1.5rem;
      line-height: 1.5;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 1.5rem;
    }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 1.25rem; font-weight: 700; }
    .badge {
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
    .card {
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    .card h3 { font-size: 1.05rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 8px; }
    input, textarea, select, button {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      margin-bottom: 0.75rem;
    }
    input, textarea, select {
      background: var(--card);
      border: 1px solid rgba(255,255,255,0.15);
      color: var(--text);
    }
    button {
      background: var(--accent);
      color: #fff;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .result-box {
      background: var(--card);
      padding: 12px;
      border-radius: 8px;
      font-size: 0.88rem;
      min-height: 80px;
      white-space: pre-wrap;
      border: 1px dashed rgba(255,255,255,0.15);
    }
    .step-item {
      padding: 6px 8px;
      margin-bottom: 4px;
      background: rgba(255,255,255,0.04);
      border-left: 3px solid var(--accent);
      border-radius: 4px;
    }
    canvas {
      width: 100%;
      height: 200px;
      background: #000;
      border-radius: 8px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span>🎓 ATLAS 2.0</span>
      <span class="badge">100% Offline Portable Workspace</span>
    </div>
    <span style="font-size:0.8rem; color:var(--text-muted);">Runs completely in this browser tab</span>
  </div>

  <div class="grid">
    <!-- Math Solver Card -->
    <div class="card">
      <h3>➗ Deterministic Math Solver</h3>
      <input type="text" id="math-input" placeholder="e.g. solve 2x + 6 = 14 or sin(30) + cos(60) or sqrt(144)">
      <select id="math-lang">
        <option value="English">English</option>
        <option value="Hindi">Hindi (हिन्दी)</option>
        <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
      </select>
      <button onclick="solveMath()">Solve Problem Step-by-Step</button>
      <div class="result-box" id="math-result">Solution steps will appear here.</div>
    </div>

    <!-- 2D Function Visualizer -->
    <div class="card">
      <h3>📈 2D Function Graph Plotter</h3>
      <input type="text" id="graph-input" value="sin(x) * cos(x/2)" placeholder="e.g. sin(x), x^2 - 4, cos(2*x)">
      <button onclick="plotGraph()">Plot Function Graph</button>
      <canvas id="graph-canvas"></canvas>
    </div>

    <!-- Academic Q&A Knowledge Base -->
    <div class="card">
      <h3>💭 Academic Q&A Knowledge Base</h3>
      <input type="text" id="qa-input" placeholder="e.g. Newton's laws, Photosynthesis, Quadratic Formula">
      <button onclick="askKnowledge()">Search Academic Concept</button>
      <div class="result-box" id="qa-result">Concept explanation will appear here.</div>
    </div>

    <!-- Quick Quiz Duel -->
    <div class="card">
      <h3>⚔️ Battle of Brains Offline Quiz</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">Test your knowledge locally against Atlas AI bot.</p>
      <div id="quiz-box">
        <button onclick="startQuiz()">Start 5-Question Quiz Duel</button>
      </div>
      <div class="result-box" id="quiz-result" style="display:none; margin-top:10px;"></div>
    </div>
  </div>

  <script>
    function gcdVal(a, b) {
      a = Math.abs(Math.round(a));
      b = Math.abs(Math.round(b));
      while (b) { var t = b; b = a % b; a = t; }
      return a || 1;
    }

    function toFrac(val) {
      if (Math.abs(val - Math.round(val)) < 1e-6) return Math.round(val).toString();
      var sign = val < 0 ? '-' : '';
      var pos = Math.abs(val);
      for (var d = 2; d <= 200; d++) {
        var n = Math.round(pos * d);
        if (Math.abs(pos - n / d) < 1e-5) {
          var g = gcdVal(n, d);
          var num = n / g;
          var den = d / g;
          return den === 1 ? (sign + num) : (sign + num + '/' + den);
        }
      }
      return val.toFixed(4).replace(/\.?0+$/, '');
    }

    function parsePolySide(sideStr, v) {
      var a = 0, b = 0, c = 0;
      var s = sideStr.trim().replace(/²/g, '^2').replace(new RegExp('([' + v + '])2(?!\\\\d)', 'gi'), '$1^2').replace(/×/g, '*').replace(/\\s+/g, '');
      if (!s) return { a: a, b: b, c: c };

      var factRegex = new RegExp('^(?:([+-]?\\\\d*\\\\.?\\\\d*)\\\\*?)?\\\\(([+-]?\\\\d*\\\\.?\\\\d*)' + v + '([+-]\\\\d+\\\\.?\\\\d*)\\\\)\\\\*?\\\\(([+-]?\\\\d*\\\\.?\\\\d*)' + v + '([+-]\\\\d+\\\\.?\\\\d*)\\\\)$', 'i');
      var factMatch = s.match(factRegex);
      if (factMatch) {
        var k = factMatch[1] ? (factMatch[1] === '-' ? -1 : parseFloat(factMatch[1])) : 1;
        var a1 = factMatch[2] === '' || factMatch[2] === '+' ? 1 : (factMatch[2] === '-' ? -1 : parseFloat(factMatch[2]));
        var b1 = parseFloat(factMatch[3]);
        var a2 = factMatch[4] === '' || factMatch[4] === '+' ? 1 : (factMatch[4] === '-' ? -1 : parseFloat(factMatch[4]));
        var b2 = parseFloat(factMatch[5]);
        return { a: k * (a1 * a2), b: k * (a1 * b2 + a2 * b1), c: k * (b1 * b2) };
      }

      var sqRegex = new RegExp('^(?:([+-]?\\\\d*\\\\.?\\\\d*)\\\\*?)?\\\\(([+-]?\\\\d*\\\\.?\\\\d*)' + v + '([+-]\\\\d+\\\\.?\\\\d*)\\\\)\\\\^2$', 'i');
      var sqMatch = s.match(sqRegex);
      if (sqMatch) {
        var k2 = sqMatch[1] ? (sqMatch[1] === '-' ? -1 : parseFloat(sqMatch[1])) : 1;
        var a1_2 = sqMatch[2] === '' || sqMatch[2] === '+' ? 1 : (sqMatch[2] === '-' ? -1 : parseFloat(sqMatch[2]));
        var b1_2 = parseFloat(sqMatch[3]);
        return { a: k2 * (a1_2 * a1_2), b: k2 * (2 * a1_2 * b1_2), c: k2 * (b1_2 * b1_2) };
      }

      var monoRegex = new RegExp('^(?:([+-]?\\\\d*\\\\.?\\\\d*)\\\\*?)?' + v + '\\\\*?\\\\(([+-]?\\\\d*\\\\.?\\\\d*)' + v + '([+-]\\\\d+\\\\.?\\\\d*)\\\\)$', 'i');
      var monoMatch = s.match(monoRegex);
      if (monoMatch) {
        var k3 = monoMatch[1] ? (monoMatch[1] === '-' ? -1 : parseFloat(monoMatch[1])) : 1;
        var a1_3 = monoMatch[2] === '' || monoMatch[2] === '+' ? 1 : (monoMatch[2] === '-' ? -1 : parseFloat(monoMatch[2]));
        var b1_3 = parseFloat(monoMatch[3]);
        return { a: k3 * a1_3, b: k3 * b1_3, c: 0 };
      }

      var terms = s.match(/([+-]?[^+-]+)/g);
      if (!terms) return { a: a, b: b, c: c };

      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (!t) continue;
        var m2 = t.match(new RegExp('^([+-]?\\\\d*\\\\.?\\\\d*)\\\\*?' + v + '(?:\\\\^2|\\\\*' + v + ')$', 'i'));
        if (m2) {
          var cStr = m2[1];
          var coeff = (cStr === '' || cStr === '+') ? 1 : (cStr === '-' ? -1 : parseFloat(cStr));
          if (!isNaN(coeff)) a += coeff;
          continue;
        }
        var m1 = t.match(new RegExp('^([+-]?\\\\d*\\\\.?\\\\d*)\\\\*?' + v + '$', 'i'));
        if (m1) {
          var cStr1 = m1[1];
          var coeff1 = (cStr1 === '' || cStr1 === '+') ? 1 : (cStr1 === '-' ? -1 : parseFloat(cStr1));
          if (!isNaN(coeff1)) b += coeff1;
          continue;
        }
        var cVal = parseFloat(t);
        if (!isNaN(cVal)) c += cVal;
      }
      return { a: a, b: b, c: c };
    }

    function parseEquation(input) {
      var clean = input.replace(/^[^:]*:\\s*/, '').replace(/solve(?:\\s+for\\s+[a-zA-Z])?/gi, '').replace(/find\\s+roots?\\s+of/gi, '').replace(/roots?\\s+of/gi, '').replace(/equation[:\\s]*/gi, '').replace(/²/g, '^2').trim();
      var vMatch = clean.match(/\\b([xXyYzZtTnN])\\b/) || clean.match(/([xXyYzZtTnN])/);
      if (!vMatch) return null;
      var v = vMatch[1].toLowerCase();

      var lhsStr = clean;
      var rhsStr = '0';
      if (clean.indexOf('=') !== -1) {
        var parts = clean.split('=');
        lhsStr = parts[0];
        rhsStr = parts.slice(1).join('=');
      }

      var left = parsePolySide(lhsStr, v);
      var right = parsePolySide(rhsStr, v);
      var a = Math.round((left.a - right.a) * 1e6) / 1e6;
      var b = Math.round((left.b - right.b) * 1e6) / 1e6;
      var c = Math.round((left.c - right.c) * 1e6) / 1e6;
      if (a === 0 && b === 0 && c === 0) return null;
      return { a: a, b: b, c: c, v: v };
    }

    function solveMath() {
      var p = document.getElementById('math-input').value.trim();
      var lang = document.getElementById('math-lang').value;
      var res = document.getElementById('math-result');
      if (!p) { res.innerText = 'Please enter a mathematical expression.'; return; }

      var isOdia = ['odia', 'or', 'or-in'].indexOf(lang.toLowerCase()) !== -1;
      var isHindi = ['hindi', 'hi', 'hi-in'].indexOf(lang.toLowerCase()) !== -1;

      var poly = parseEquation(p);
      if (poly) {
        var v = poly.v;
        if (poly.a !== 0) {
          var a = poly.a, b = poly.b, c = poly.c;
          var D = Math.round((b * b - 4 * a * c) * 1e6) / 1e6;
          var std = (a === 1 ? '' : (a === -1 ? '-' : a)) + v + '²' + (b > 0 ? ' + ' + (b === 1 ? '' : b) : (b < 0 ? ' - ' + (Math.abs(b) === 1 ? '' : Math.abs(b)) : '')) + (b !== 0 ? v : '') + (c > 0 ? ' + ' + c : (c < 0 ? ' - ' + Math.abs(c) : '')) + ' = 0';
          var steps = [];
          var finalAns = '';

          if (D > 0) {
            var sqrtD = Math.sqrt(D);
            var isSq = Math.abs(sqrtD - Math.round(sqrtD)) < 1e-6;
            var r1 = (-b + sqrtD) / (2 * a);
            var r2 = (-b - sqrtD) / (2 * a);
            var r1Str = toFrac(r1), r2Str = toFrac(r2);
            finalAns = v + '₁ = ' + r1Str + ', ' + v + '₂ = ' + r2Str;

            if (isOdia) {
              steps.push('ପଦକ୍ଷେପ ୧ (ମାନକ ରୂପ): ଦ୍ୱିଘାତ ସମୀକରଣ ax² + bx + c = 0:\n' + std);
              steps.push('ପଦକ୍ଷେପ ୨ (ସହଗ ଚିହ୍ନଟ): a = ' + a + ', b = ' + b + ', c = ' + c);
              steps.push('ପଦକ୍ଷେପ ୩ (ପ୍ରଭେଦକ D ନିରୂପଣ): D = b² - 4ac = (' + b + ')² - 4(' + a + ')(' + c + ') = ' + D);
              steps.push('ପଦକ୍ଷେପ ୪ (ବୀଜର ପ୍ରକୃତି): ଯେହେତୁ D = ' + D + ' > 0, ଏହି ସମୀକରଣର ଦୁଇଟି ବାସ୍ତବ ଓ ଅସମାନ ମୂଳ (Two Distinct Real Roots) ଅଛି।');
              steps.push('ପଦକ୍ଷେପ ୫ (ଦ୍ୱିଘାତ ସୂତ୍ର ପ୍ରୟୋଗ): ' + v + ' = (-b ± √D) / (2a) = (' + (-b) + ' ± ' + (isSq ? Math.round(sqrtD) : sqrtD.toFixed(4)) + ') / ' + (2 * a));
              steps.push('ପଦକ୍ଷେପ ୬ (ଅନ୍ତିମ ମୂଳ): ' + v + '₁ = ' + r1Str + ', ' + v + '₂ = ' + r2Str);
            } else if (isHindi) {
              steps.push('चरण 1 (मानक रूप): मानक द्विघात समीकरण ax² + bx + c = 0:\n' + std);
              steps.push('चरण 2 (गुणांक पहचान): a = ' + a + ', b = ' + b + ', c = ' + c);
              steps.push('चरण 3 (विविक्तकर D की गणना): D = b² - 4ac = (' + b + ')² - 4(' + a + ')(' + c + ') = ' + D);
              steps.push('चरण 4 (मूलों की प्रकृति): चूँकि D = ' + D + ' > 0, समीकरण के दो भिन्न वास्तविक मूल (Distinct Real Roots) हैं।');
              steps.push('चरण 5 (द्विघाती सूत्र): ' + v + ' = (-b ± √D) / (2a) = (' + (-b) + ' ± ' + (isSq ? Math.round(sqrtD) : sqrtD.toFixed(4)) + ') / ' + (2 * a));
              steps.push('चरण 6 (अंतिम मूल): ' + v + '₁ = ' + r1Str + ', ' + v + '₂ = ' + r2Str);
            } else {
              steps.push('Step 1 (Standard Form): Standard quadratic form ax² + bx + c = 0:\n' + std);
              steps.push('Step 2 (Coefficients): a = ' + a + ', b = ' + b + ', c = ' + c);
              steps.push('Step 3 (Discriminant D): D = b² - 4ac = (' + b + ')² - 4(' + a + ')(' + c + ') = ' + D);
              steps.push('Step 4 (Nature of Roots): Since D = ' + D + ' > 0, the equation has two distinct real roots.');
              steps.push('Step 5 (Quadratic Formula): ' + v + ' = (-b ± √D) / (2a) = (' + (-b) + ' ± ' + (isSq ? Math.round(sqrtD) : sqrtD.toFixed(4)) + ') / ' + (2 * a));
              steps.push('Step 6 (Final Roots): ' + v + '₁ = ' + r1Str + ', ' + v + '₂ = ' + r2Str);
            }
          } else if (D === 0) {
            var r = -b / (2 * a);
            var rStr = toFrac(r);
            finalAns = v + ' = ' + rStr + ' (Double Root)';
            if (isOdia) {
              steps.push('ପଦକ୍ଷେପ ୧ (ମାନକ ରୂପ): ' + std);
              steps.push('ପଦକ୍ଷେପ ୨ (ପ୍ରଭେଦକ): D = 0');
              steps.push('ପଦକ୍ଷେପ ୩ (ବୀଜର ପ୍ରକୃତି): ଦୁଇଟି ସମାନ ବାସ୍ତବ ମୂଳ (Two Equal Real Roots)');
              steps.push('ପଦକ୍ଷେପ ୪ (ମୂଳ ନିର୍ଣ୍ଣୟ): ' + v + ' = -b / (2a) = ' + rStr);
            } else if (isHindi) {
              steps.push('चरण 1 (मानक रूप): ' + std);
              steps.push('चरण 2 (विविक्तकर): D = 0');
              steps.push('चरण 3 (मूलों की प्रकृति): दो बराबर वास्तविक मूल (Equal Real Roots)');
              steps.push('चरण 4 (मूल गणना): ' + v + ' = -b / (2a) = ' + rStr);
            } else {
              steps.push('Step 1 (Standard Form): ' + std);
              steps.push('Step 2 (Discriminant): D = 0');
              steps.push('Step 3 (Nature of Roots): Two equal real roots (double root)');
              steps.push('Step 4 (Calculate Root): ' + v + ' = -b / (2a) = ' + rStr);
            }
          } else {
            var rp = -b / (2 * a);
            var ip = Math.sqrt(-D) / Math.abs(2 * a);
            var rpStr = toFrac(rp), ipStr = toFrac(ip);
            var iSym = ipStr === '1' ? 'i' : ipStr + 'i';
            finalAns = v + '₁ = ' + (rp === 0 ? iSym : rpStr + ' + ' + iSym) + ', ' + v + '₂ = ' + (rp === 0 ? '-' + iSym : rpStr + ' - ' + iSym);
            if (isOdia) {
              steps.push('ପଦକ୍ଷେପ ୧ (ମାନକ ରୂପ): ' + std);
              steps.push('ପଦକ୍ଷେପ ୨ (ପ୍ରଭେଦକ): D = ' + D + ' < 0');
              steps.push('ପଦକ୍ଷେପ ୩ (ବୀଜର ପ୍ରକୃତି): କୌଣସି ବାସ୍ତବ ମୂଳ ନାହିଁ, ଦୁଇଟି ଜଟିଳ/କାଳ୍ପନିକ ଅନୁବନ୍ଧୀ ମୂଳ (Complex Conjugate Roots) ରହିଛି।');
              steps.push('ପଦକ୍ଷେପ ୪ (ଜଟିଳ ସୂତ୍ର): ' + v + ' = (-b ± i√|D|) / (2a) = ' + finalAns);
            } else if (isHindi) {
              steps.push('चरण 1 (मानक रूप): ' + std);
              steps.push('चरण 2 (विविक्तकर): D = ' + D + ' < 0');
              steps.push('चरण 3 (मूलों की प्रकृति): कोई वास्तविक मूल नहीं है, दो काल्पनिक/सम्मिश्र संयुग्मी मूल (Complex Conjugate Roots) हैं।');
              steps.push('चरण 4 (सम्मिश्र सूत्र): ' + v + ' = (-b ± i√|D|) / (2a) = ' + finalAns);
            } else {
              steps.push('Step 1 (Standard Form): ' + std);
              steps.push('Step 2 (Discriminant): D = ' + D + ' < 0');
              steps.push('Step 3 (Nature of Roots): No real roots; two complex conjugate roots.');
              steps.push('Step 4 (Complex Formula): ' + v + ' = (-b ± i√|D|) / (2a) = ' + finalAns);
            }
          }

          res.innerHTML = '<strong>' + (isOdia ? 'ସମାଧାନ ଉତ୍ତର: ' : (isHindi ? 'अंतिम हल: ' : 'Final Answer: ')) + finalAns + '</strong><br><br>' +
            steps.map(function(s) { return '<div class="step-item">' + s.replace(/\\n/g, '<br>&nbsp;&nbsp;') + '</div>'; }).join('');
          return;
        } else if (poly.b !== 0) {
          var linRoot = -poly.c / poly.b;
          var linRootStr = toFrac(linRoot);
          var linAns = v + ' = ' + linRootStr;
          var linSteps = [
            'Standard Linear Form: ' + poly.b + v + (poly.c >= 0 ? ' + ' + poly.c : ' - ' + Math.abs(poly.c)) + ' = 0',
            'Transpose constant: ' + poly.b + v + ' = ' + (-poly.c),
            'Divide by coefficient of ' + v + ': ' + v + ' = ' + (-poly.c) + ' / ' + poly.b,
            'Final Root: ' + linAns
          ];
          res.innerHTML = '<strong>' + (isOdia ? 'ସମାଧାନ ଉତ୍ତର: ' : (isHindi ? 'अंतिम हल: ' : 'Final Answer: ')) + linAns + '</strong><br><br>' +
            linSteps.map(function(s) { return '<div class="step-item">' + s + '</div>'; }).join('');
          return;
        }
      }

      // Arithmetic & Fraction fallback
      try {
        var sanitized = p.replace(/sin/g, 'Math.sin')
                         .replace(/cos/g, 'Math.cos')
                         .replace(/tan/g, 'Math.tan')
                         .replace(/sqrt/g, 'Math.sqrt')
                         .replace(/\\^/g, '**');
        var evaluated = Function('"use strict"; return (' + sanitized + ')')();
        var fVal = toFrac(evaluated);
        var resText = fVal && fVal !== evaluated.toString() ? fVal + ' (' + evaluated + ')' : evaluated.toString();
        var arithSteps = [
          'Input parsed: ' + p,
          'Applied standard PEMDAS / BODMAS operations.',
          'Calculated result = ' + resText
        ];
        res.innerHTML = '<strong>Final Answer:</strong> ' + resText + '<br><br>' +
          arithSteps.map(function(s, i) { return '<div class="step-item">Step ' + (i+1) + ': ' + s + '</div>'; }).join('');
      } catch(e) {
        res.innerHTML = '<strong>Expression:</strong> ' + p + '<br><br><div class="step-item">Unable to evaluate directly offline. Please check formatting.</div>';
      }
    }

    function plotGraph() {
      const expr = document.getElementById('graph-input').value.trim() || 'sin(x)';
      const canvas = document.getElementById('graph-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // Axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
      ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
      ctx.stroke();

      // Plot
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const scaleX = 25;
      const scaleY = 30;
      let first = true;

      for (let px = 0; px < w; px++) {
        const x = (px - w/2) / scaleX;
        let y = 0;
        try {
          const evalExpr = expr.replace(/sin/g, 'Math.sin')
                               .replace(/cos/g, 'Math.cos')
                               .replace(/tan/g, 'Math.tan')
                               .replace(/sqrt/g, 'Math.sqrt')
                               .replace(/x/g, '(' + x + ')');
          y = Function('"use strict"; return (' + evalExpr + ')')();
        } catch(e) { y = 0; }

        const py = h/2 - y * scaleY;
        if (first) { ctx.moveTo(px, py); first = false; }
        else { ctx.lineTo(px, py); }
      }
      ctx.stroke();
    }
    setTimeout(plotGraph, 200);

    const KNOWLEDGE_BASE = {
      'newton': 'Newton\\'s Laws of Motion form the foundation of classical mechanics: 1st Law (Inertia), 2nd Law (F = ma), and 3rd Law (Action-Reaction).',
      'photosynthesis': 'Photosynthesis: 6CO2 + 6H2O + Light Energy -> C6H12O6 + 6O2. Plants convert sunlight, water, and CO2 into chemical glucose energy.',
      'quadratic': 'Quadratic Formula: x = (-b ± √(b² - 4ac)) / (2a) for ax² + bx + c = 0. The discriminant D = b² - 4ac reveals root nature.',
      'pythagoras': 'Pythagorean Theorem: In a right triangle, a² + b² = c², where c is the hypotenuse.'
    };

    function askKnowledge() {
      const q = document.getElementById('qa-input').value.toLowerCase().trim();
      const res = document.getElementById('qa-result');
      if (!q) { res.innerText = 'Please enter an academic topic.'; return; }

      for (var key in KNOWLEDGE_BASE) {
        if (q.indexOf(key) !== -1) {
          res.innerText = KNOWLEDGE_BASE[key];
          return;
        }
      }
      res.innerText = 'Concept overview for "' + q + '": Foundational academic topic with established empirical, mathematical and structural properties. Practice key definitions and formulas.';
    }

    const QUIZ_QUESTIONS = [
      { q: "What is the speed of light in vacuum?", a: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "1.5 × 10⁸ m/s"], c: 0 },
      { q: "Which organelle is called the powerhouse of the cell?", a: ["Ribosome", "Mitochondria", "Nucleus"], c: 1 },
      { q: "What is the derivative of sin(x)?", a: ["cos(x)", "-cos(x)", "tan(x)"], c: 0 },
      { q: "What is the capital of Odisha?", a: ["Cuttack", "Bhubaneswar", "Puri"], c: 1 },
      { q: "What is the sum of angles in a triangle?", a: ["180°", "360°", "90°"], c: 0 }
    ];

    let currentQ = 0;
    let score = 0;

    function startQuiz() {
      currentQ = 0; score = 0;
      renderQuestion();
    }

    function renderQuestion() {
      const qBox = document.getElementById('quiz-box');
      const rBox = document.getElementById('quiz-result');
      rBox.style.display = 'block';

      if (currentQ >= QUIZ_QUESTIONS.length) {
        rBox.innerHTML = '<strong>Quiz Completed!</strong><br>Your Score: ' + score + ' / ' + QUIZ_QUESTIONS.length + '<br><button onclick="startQuiz()" style="margin-top:8px;">Play Again</button>';
        return;
      }

      const item = QUIZ_QUESTIONS[currentQ];
      rBox.innerHTML = '<div style="margin-bottom:8px;"><strong>Q' + (currentQ+1) + ':</strong> ' + item.q + '</div>' +
        item.a.map(function(ans, i) {
          return '<button onclick="answerQuiz(' + i + ')" style="background:#334155; margin-bottom:6px; text-align:left;">' + String.fromCharCode(65+i) + ') ' + ans + '</button>';
        }).join('');
    }

    function answerQuiz(idx) {
      if (idx === QUIZ_QUESTIONS[currentQ].c) { score++; }
      currentQ++;
      renderQuestion();
    }
  </script>
</body>
</html>`;

  const blob = new Blob([offlineHtmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ATLAS-2.0-Offline-Workspace.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

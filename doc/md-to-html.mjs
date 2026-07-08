import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = '/tmp/mdconv';
execSync(`npm install marked@15 --no-save --prefix ${tmp}`, { stdio: 'pipe' });
const require = createRequire(import.meta.url);
const { marked } = require(path.join(tmp, 'node_modules/marked'));

marked.setOptions({ gfm: true, breaks: false });

const mdPath = path.join(__dirname, 'clinical-wellness-and-diary-ru.md');
const outPath = path.join(__dirname, 'clinical-wellness-and-diary-ru.html');
const md = fs.readFileSync(mdPath, 'utf8');
let body = marked.parse(md);

body = body.replace(
  /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
  (_, code) => {
    const decoded = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
    return `<pre class="mermaid">${decoded}</pre>`;
  },
);

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AllerGuide: индекс самочувствия, дневник и источники данных</title>
  <style>
    :root {
      --bg: #fafbfc;
      --text: #1a1a2e;
      --muted: #5c6370;
      --border: #d8dee4;
      --accent: #0d6e6e;
      --code-bg: #f0f3f6;
      --table-stripe: #f6f8fa;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
      margin: 0;
      padding: 2rem 1rem 4rem;
    }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.75rem; border-bottom: 2px solid var(--accent); padding-bottom: 0.5rem; }
    h2 { font-size: 1.35rem; margin-top: 2.5rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; }
    h3 { font-size: 1.1rem; margin-top: 1.75rem; }
    h4, h5 { font-size: 1rem; margin-top: 1.25rem; }
    p { margin: 0.75rem 0; }
    a { color: var(--accent); }
    strong { font-weight: 600; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
    code { background: var(--code-bg); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
    pre:not(.mermaid) { background: var(--code-bg); padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border); }
    pre code { background: none; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem; }
    th, td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #e8f4f4; font-weight: 600; }
    tr:nth-child(even) { background: var(--table-stripe); }
    blockquote { margin: 1rem 0; padding: 0.75rem 1rem; border-left: 4px solid var(--accent); background: #eef7f7; color: var(--muted); }
    ul, ol { padding-left: 1.5rem; }
    li { margin: 0.35rem 0; }
    .mermaid { margin: 1.5rem 0; text-align: center; background: #fff; padding: 1rem; border: 1px solid var(--border); border-radius: 8px; }
    .doc-footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--muted); font-style: italic; }
    @media print {
      body { background: white; padding: 0; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
  </script>
</head>
<body>
  <div class="container">
${body}
    <p class="doc-footer">Сгенерировано из clinical-wellness-and-diary-ru.md · AllerGuide</p>
  </div>
</body>
</html>`;

fs.writeFileSync(outPath, html);
console.log(`Wrote ${outPath} (${html.length} bytes)`);

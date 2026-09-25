// Privacy-First JSON ⇄ YAML Converter API — formatho.com
// Supports the common YAML subset: block maps/sequences, flow [..]{..}, quoted
// scalars, comments, block scalars (| and > with chomping), scalar typing.
// Anchors/aliases, tags, multiple documents and complex keys return clean 400s.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://json-yaml-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/json-yaml';
const MAX_BYTES = 262144; // 256 KB
const MAX_LINES = 20000;
const MAX_DEPTH = 100;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JSON to YAML Converter Online — Free &amp; Private API</title>
<meta name="description" content="Convert JSON to YAML and YAML to JSON free at the edge — clean 2-space output, strict validation, zero tracking. Full browser tool on formatho.com.">
<link rel="canonical" href="${HOST}/">
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem 3rem; line-height: 1.6; }
header { border-bottom: 1px solid #8884; margin-bottom: 1.5rem; padding-bottom: 1rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.tagline { color: #888; margin: 0; }
.badges { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1rem 0; }
.badge { background: #8882; border-radius: 999px; padding: .15rem .7rem; font-size: .8rem; }
pre { background: #8882; padding: .8rem 1rem; border-radius: 8px; overflow-x: auto; font-size: .85rem; }
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
</style>
</head>
<body>
<header>
  <h1>JSON ⇄ YAML Converter — Free &amp; Private API</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<p>JSON → YAML (GET):</p>
<pre><code>curl "${HOST}/api?json=%7B%22name%22%3A%22formatho%22%2C%22private%22%3Atrue%7D"</code></pre>
<p>YAML → JSON (GET):</p>
<pre><code>curl "${HOST}/api?yaml=name%3A%20formatho%0Aprivate%3A%20true"</code></pre>
<p>Or POST the raw content to <code>${HOST}/api</code> — JSON and YAML are auto-detected.
POST <code>?format=json</code> or <code>?format=yaml</code> to force the input type.</p>
<p>Supports the common YAML subset: block maps &amp; sequences, flow <code>[..]</code>/<code>{..}</code>,
quoted strings, comments, block scalars (<code>|</code>, <code>&gt;</code>), null/bool/int/float typing.
Anchors, aliases, tags and multi-document YAML return clean 400 errors.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> conversion happens in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Convert JSON ⇄ YAML entirely client-side: <a href="${FULL_TOOL}">JSON ⇄ YAML Converter on formatho.com</a>.</p>
<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>
<footer>© formatho.com · <a href="${HOST}/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${HOST}/api</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;

// ---------- YAML → JSON (subset parser) ----------

class YamlError extends Error {}

function fail(msg, lineNo) {
  throw new YamlError(lineNo !== undefined ? `${msg} (line ${lineNo})` : msg);
}

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q === "'") {
      if (c === "'") { if (line[i + 1] === "'") i++; else q = null; }
      continue;
    }
    if (q === '"') { if (c === '\\') i++; else if (c === '"') q = null; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === '#' && (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t')) return line.slice(0, i);
  }
  return line;
}

function inferScalar(s) {
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE') return false;
  if (/^[+-]?[0-9]+$/.test(s)) return Number(s);
  if (/^0o[0-7]+$/.test(s)) return Number.parseInt(s.slice(2), 8);
  if (/^0x[0-9a-fA-F]+$/.test(s)) return Number.parseInt(s.slice(2), 16);
  if (/^[+-]?(\d+\.\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) || /^[+-]?\d+[eE][+-]?\d+$/.test(s)) return Number(s);
  return s;
}

// Parses a single-line value: flow collections, quoted scalars, plain scalars.
// Rejects trailing junk after the value.
function parseValueLine(s, lineNo) {
  let p = 0;
  const skipWs = () => { while (p < s.length && s[p] === ' ') p++; };
  function readDouble() {
    p++; let out = '';
    for (;;) {
      if (p >= s.length) fail('Unterminated double-quoted string', lineNo);
      const c = s[p++];
      if (c === '"') return out;
      if (c === '\\') {
        const e = s[p++];
        if (e === 'n') out += '\n'; else if (e === 't') out += '\t'; else if (e === 'r') out += '\r';
        else if (e === '0') out += '\0'; else if (e === 'b') out += '\b'; else if (e === 'f') out += '\f';
        else if (e === '/') out += '/'; else if (e === '\\') out += '\\'; else if (e === '"') out += '"';
        else if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(p, p + 4))) { out += String.fromCharCode(Number.parseInt(s.slice(p, p + 4), 16)); p += 4; }
        else if (e === 'x' && /^[0-9a-fA-F]{2}$/.test(s.slice(p, p + 2))) { out += String.fromCharCode(Number.parseInt(s.slice(p, p + 2), 16)); p += 2; }
        else fail(`Invalid escape sequence \\${e}`, lineNo);
      } else out += c;
    }
  }
  function readSingle() {
    p++; let out = '';
    for (;;) {
      if (p >= s.length) fail('Unterminated single-quoted string', lineNo);
      const c = s[p++];
      if (c === "'") { if (s[p] === "'") { out += "'"; p++; } else return out; }
      else out += c;
    }
  }
  function readValue() {
    skipWs();
    if (p >= s.length) fail('Unexpected end of value', lineNo);
    const c = s[p];
    if (c === '[') {
      p++; const arr = []; skipWs();
      if (s[p] === ']') { p++; return arr; }
      for (;;) {
        arr.push(readValue()); skipWs();
        if (s[p] === ',') { p++; skipWs(); if (s[p] === ']') { p++; return arr; } continue; }
        if (s[p] === ']') { p++; return arr; }
        fail('Expected "," or "]" in flow sequence', lineNo);
      }
    }
    if (c === '{') {
      p++; const obj = {}; skipWs();
      if (s[p] === '}') { p++; return obj; }
      for (;;) {
        const k = readValue(); skipWs();
        if (s[p] !== ':') fail('Expected ":" in flow mapping', lineNo);
        p++; obj[String(k)] = readValue(); skipWs();
        if (s[p] === ',') { p++; skipWs(); if (s[p] === '}') { p++; return obj; } continue; }
        if (s[p] === '}') { p++; return obj; }
        fail('Expected "," or "}" in flow mapping', lineNo);
      }
    }
    if (c === '"') return readDouble();
    if (c === "'") return readSingle();
    const start = p;
    while (p < s.length) {
      const ch = s[p];
      if (ch === ',' || ch === ']' || ch === '}') break;
      if (ch === ':' && (p + 1 >= s.length || s[p + 1] === ' ')) break;
      p++;
    }
    return inferScalar(s.slice(start, p).trim());
  }
  const value = readValue();
  skipWs();
  if (p < s.length) fail('Unexpected content after value', lineNo);
  return value;
}

function splitKey(s, lineNo) {
  if (!s) return null;
  if (s[0] === '&') fail('Anchors are not supported by this API', lineNo);
  if (s[0] === '!') fail('Tags are not supported by this API', lineNo);
  if (s[0] === '?') fail('Complex keys are not supported by this API', lineNo);
  if (s[0] === '"' || s[0] === "'") {
    const q = s[0];
    let i = 1;
    let key = '';
    for (;;) {
      if (i >= s.length) fail('Unterminated quoted key', lineNo);
      const c = s[i++];
      if (q === '"' && c === '\\') {
        const e = s[i++];
        if (e === 'n') key += '\n'; else if (e === 't') key += '\t'; else if (e === '"') key += '"';
        else if (e === '\\') key += '\\'; else if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i, i + 4))) { key += String.fromCharCode(Number.parseInt(s.slice(i, i + 4), 16)); i += 4; }
        else key += e;
        continue;
      }
      if (c === q) { if (q === "'" && s[i] === "'") { key += "'"; i++; continue; } break; }
      key += c;
    }
    let rest = s.slice(i).replace(/^\s+/, '');
    if (rest[0] !== ':') fail('Expected ":" after quoted key', lineNo);
    return { key, rest: rest.slice(1).replace(/^\s+/, '') };
  }
  const idx = s.search(/:(\s|$)/);
  if (idx === -1) return null;
  const key = s.slice(0, idx).trim();
  if (key === '') return null;
  if (key === '<<') fail('Merge keys (<<) are not supported by this API', lineNo);
  if (key[0] === '*') fail('Aliases are not supported by this API', lineNo);
  return { key, rest: s.slice(idx + 1).replace(/^\s+/, '') };
}

function checkUnsupportedValue(rest, lineNo) {
  if (rest[0] === '&') fail('Anchors are not supported by this API', lineNo);
  if (rest[0] === '*') fail('Aliases are not supported by this API', lineNo);
  if (rest[0] === '!') fail('Tags are not supported by this API', lineNo);
}

function foldBlockLines(relLines) {
  let out = '';
  for (let i = 0; i < relLines.length; i++) {
    const line = relLines[i];
    if (i === 0) { out += line; continue; }
    const prev = relLines[i - 1];
    if (line === '') out += '\n';
    else if (prev === '') out += line;
    else if (line.startsWith(' ') || prev.startsWith(' ')) out += '\n' + line;
    else out += ' ' + line;
  }
  return out;
}

function parseYaml(text) {
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  if (rawLines.length > MAX_LINES) fail(`Input exceeds ${MAX_LINES} lines`);
  const L = rawLines.map((l) => {
    if (/^ *\t/.test(l)) fail('Tabs are not allowed in YAML indentation — use spaces');
    return l;
  });

  let pos = 0;
  let sawDocStart = false;
  let returnedAny = false;
  function peek() {
    while (pos < L.length) {
      const stripped = stripComment(L[pos]).trimEnd();
      if (stripped.trim() === '') { pos++; continue; }
      if (stripped.trim() === '---') {
        if (sawDocStart || returnedAny) fail('Multiple YAML documents are not supported by this API', pos + 1);
        sawDocStart = true; pos++; continue;
      }
      if (stripped.trim() === '...') fail('Multiple YAML documents are not supported by this API', pos + 1);
      const indent = stripped.match(/^ */)[0].length;
      returnedAny = true;
      return { indent, content: stripped.slice(indent), lineNo: pos + 1 };
    }
    return null;
  }
  const consume = () => { pos++; };

  function plainFold(firstText, indent) {
    let text = firstText;
    for (;;) {
      const nx = peek();
      if (!nx || nx.indent <= indent) break;
      if (/^-(\s|$)/.test(nx.content)) break;
      if (splitKey(nx.content, nx.lineNo)) break;
      text += ' ' + nx.content;
      consume();
    }
    return inferScalar(text);
  }

  // caller must have consumed the header line; pos points after it
  function parseBlockScalar(parentIndent, header, lineNo) {
    const m = header.match(/^([|>])(?:(\d)([+-])?|([+-])(\d)?)?$/);
    if (!m) fail(`Invalid block scalar header "${header}"`, lineNo);
    const folded = m[1] === '>';
    const explicit = (m[2] !== undefined || m[5] !== undefined) ? Number(m[2] !== undefined ? m[2] : m[5]) : null;
    const chomp = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : '');
    let blockIndent = explicit !== null ? parentIndent + explicit : null;
    const relLines = [];
    let j = pos;
    for (; j < L.length; j++) {
      const rawLine = L[j];
      if (rawLine.trim() === '') { relLines.push(''); continue; }
      const ind = rawLine.match(/^ */)[0].length;
      if (ind <= parentIndent) break;
      if (blockIndent === null) blockIndent = ind;
      if (ind < blockIndent) fail('Bad indentation inside block scalar', j + 1);
      relLines.push(rawLine.slice(blockIndent));
    }
    pos = j;
    const body = folded ? foldBlockLines(relLines) : relLines.join('\n');
    const noTrail = body.replace(/\n+$/, '');
    if (chomp === '-') return noTrail;
    if (chomp === '+') return body + '\n';
    return noTrail === '' ? '' : noTrail + '\n';
  }

  function parseBlockNode(minIndent, depth) {
    if (depth > MAX_DEPTH) fail(`Nesting exceeds ${MAX_DEPTH} levels`);
    const ln = peek();
    if (!ln) return null;
    if (/^-(\s|$)/.test(ln.content)) return parseSeq(ln.indent, depth);
    return parseMap(ln.indent, depth);
  }

  function parseSeq(indent, depth) {
    const arr = [];
    for (;;) {
      const ln = peek();
      if (!ln || ln.indent !== indent) {
        if (ln && ln.indent > indent) fail('Bad indentation in sequence', ln.lineNo);
        break;
      }
      if (!/^-(\s|$)/.test(ln.content)) break;
      const rest = ln.content === '-' ? '' : ln.content.replace(/^-\s+/, '');
      if (rest === '') {
        consume();
        const nx = peek();
        if (nx && nx.indent > indent) arr.push(parseBlockNode(indent + 1, depth + 1));
        else arr.push(null);
      } else if (/^-(\s|$)/.test(rest) || splitKey(rest, ln.lineNo)) {
        L[pos] = ' '.repeat(indent + 2) + rest; // inline nested seq/map
        arr.push(parseBlockNode(indent + 1, depth + 1));
      } else if (/^[|>][\d+-]*$/.test(rest)) {
        consume();
        arr.push(parseBlockScalar(indent, rest, ln.lineNo));
      } else {
        checkUnsupportedValue(rest, ln.lineNo);
        consume();
        arr.push(parseValueLine(rest, ln.lineNo));
      }
    }
    return arr;
  }

  function parseMap(indent, depth) {
    const obj = {};
    for (;;) {
      const ln = peek();
      if (!ln || ln.indent !== indent) {
        if (ln && ln.indent > indent) fail('Bad indentation in mapping (check nesting)', ln.lineNo);
        break;
      }
      if (/^-(\s|$)/.test(ln.content)) break;
      const kv = splitKey(ln.content, ln.lineNo);
      if (!kv) fail('Invalid mapping line — expected "key: value"', ln.lineNo);
      consume();
      const rest = kv.rest;
      let value;
      if (rest === '') {
        const nx = peek();
        if (nx && nx.indent > indent) value = parseBlockNode(indent + 1, depth + 1);
        else value = null;
      } else if (/^[|>][\d+-]*$/.test(rest)) {
        value = parseBlockScalar(indent, rest, ln.lineNo);
      } else {
        checkUnsupportedValue(rest, ln.lineNo);
        value = parseValueLine(rest, ln.lineNo);
        if (typeof value === 'string') {
          // allow plain multi-line folding for unquoted strings
          const nx = peek();
          if (nx && nx.indent > indent && !/^-(\s|$)/.test(nx.content) && !splitKey(nx.content, nx.lineNo)) {
            value = plainFold(rest, indent);
          }
        }
      }
      obj[kv.key] = value;
    }
    return obj;
  }

  const first = peek();
  if (!first) return null; // empty document → null
  if (!/^-(\s|$)/.test(first.content) && !splitKey(first.content, first.lineNo)) {
    // whole document is a plain scalar
    const v = plainFold(first.content, -1);
    const leftover = peek();
    if (leftover) fail('Bad indentation or trailing content after document', leftover.lineNo);
    return v;
  }
  const result = parseBlockNode(0, 0);
  const leftover = peek();
  if (leftover) fail('Bad indentation or trailing content after document', leftover.lineNo);
  return result;
}

// ---------- JSON → YAML (emitter) ----------

function emitScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const s = String(v);
  if (
    s.length > 0 &&
    s.trim() === s &&
    !/[:#{}\[\],&*!|>'"%@`\\\n\t]/.test(s) &&
    !/^[-?:](\s|$)/.test(s) &&
    typeof inferScalar(s) === 'string'
  ) return s;
  return JSON.stringify(s);
}

function emitKey(k) {
  const s = String(k);
  if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(s) && typeof inferScalar(s) === 'string') return s;
  return JSON.stringify(s);
}

function toYamlLines(value, level, depth) {
  if (depth > MAX_DEPTH) fail(`Nesting exceeds ${MAX_DEPTH} levels`);
  const pad = '  '.repeat(level);
  if (value === null || value === undefined) return [pad + 'null'];
  if (typeof value !== 'object') return [pad + emitScalar(value)];
  if (Array.isArray(value)) {
    if (!value.length) return [pad + '[]'];
    const out = [];
    const innerPad = '  '.repeat(level + 1);
    for (const item of value) {
      const hasNesting = item !== null && typeof item === 'object' && (Array.isArray(item) ? item.length : Object.keys(item).length);
      if (hasNesting) {
        const nested = toYamlLines(item, level + 1, depth + 1);
        const first = nested[0].startsWith(innerPad) ? nested[0].slice(innerPad.length) : nested[0];
        out.push(pad + '- ' + first);
        for (let i = 1; i < nested.length; i++) out.push(nested[i]);
      } else {
        out.push(pad + '- ' + emitScalar(item === null || item === undefined ? null : item));
      }
    }
    return out;
  }
  const keys = Object.keys(value);
  if (!keys.length) return [pad + '{}'];
  const out = [];
  for (const k of keys) {
    const v = value[k];
    const keyStr = emitKey(k);
    if (v === null || v === undefined) out.push(pad + keyStr + ': null');
    else if (typeof v !== 'object') out.push(pad + keyStr + ': ' + emitScalar(v));
    else if (Array.isArray(v) && !v.length) out.push(pad + keyStr + ': []');
    else if (!Array.isArray(v) && !Object.keys(v).length) out.push(pad + keyStr + ': {}');
    else {
      out.push(pad + keyStr + ':');
      out.push(...toYamlLines(v, level + 1, depth + 1));
    }
  }
  return out;
}

// ---------- HTTP ----------

function jsonToYaml(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { throw new SyntaxError(e.message); }
  const yamlOut = toYamlLines(parsed, 0, 0).join('\n') + '\n';
  return { direction: 'json→yaml', input_bytes: text.length, yaml: yamlOut, decoded_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL };
}

function yamlToJson(text) {
  const parsed = parseYaml(text);
  return { direction: 'yaml→json', input_bytes: text.length, json: parsed, decoded_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL };
}

function handleGet(request) {
  const url = new URL(request.url);
  const json = url.searchParams.get('json');
  const yaml = url.searchParams.get('yaml');
  if (json && yaml) return Response.json({ error: 'Provide either ?json= or ?yaml=, not both' }, { status: 400, headers: JSON_HEADERS });
  if (!json && !yaml) return Response.json({ error: 'Missing required parameter: json or yaml' }, { status: 400, headers: JSON_HEADERS });
  const input = json || yaml;
  if (input.length > MAX_BYTES) return Response.json({ error: `Input exceeds ${MAX_BYTES / 1024} KB limit` }, { status: 413, headers: JSON_HEADERS });
  try {
    if (json) return Response.json(jsonToYaml(json), { headers: JSON_HEADERS });
    return Response.json(yamlToJson(yaml), { headers: JSON_HEADERS });
  } catch (e) {
    if (e instanceof YamlError) return Response.json({ error: `Invalid YAML: ${e.message}` }, { status: 400, headers: JSON_HEADERS });
    if (e instanceof SyntaxError) return Response.json({ error: `Invalid JSON: ${e.message}` }, { status: 400, headers: JSON_HEADERS });
    return Response.json({ error: 'Conversion failed', detail: String(e.message || e) }, { status: 400, headers: JSON_HEADERS });
  }
}

async function handlePost(request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get('format') || 'auto').toLowerCase();
  const text = await request.text();
  if (!text.trim()) return Response.json({ error: 'Empty request body' }, { status: 400, headers: JSON_HEADERS });
  if (text.length > MAX_BYTES) return Response.json({ error: `Input exceeds ${MAX_BYTES / 1024} KB limit` }, { status: 413, headers: JSON_HEADERS });
  try {
    if (format === 'yaml') return Response.json(yamlToJson(text), { headers: JSON_HEADERS });
    if (format === 'json') return Response.json(jsonToYaml(text), { headers: JSON_HEADERS });
    // auto-detect: valid JSON wins, otherwise treat as YAML
    try { return Response.json(jsonToYaml(text), { headers: JSON_HEADERS }); }
    catch (e) { if (e instanceof SyntaxError) return Response.json(yamlToJson(text), { headers: JSON_HEADERS }); throw e; }
  } catch (e) {
    if (e instanceof YamlError) return Response.json({ error: `Invalid YAML: ${e.message}` }, { status: 400, headers: JSON_HEADERS });
    if (e instanceof SyntaxError) return Response.json({ error: `Invalid JSON: ${e.message}` }, { status: 400, headers: JSON_HEADERS });
    return Response.json({ error: 'Conversion failed', detail: String(e.message || e) }, { status: 400, headers: JSON_HEADERS });
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api') {
      if (request.method === 'POST') return handlePost(request);
      if (request.method === 'GET') return handleGet(request);
      return Response.json({ error: 'Method not allowed. Use GET or POST.' }, { status: 405, headers: { ...JSON_HEADERS, Allow: 'GET, POST' } });
    }
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};

export async function extractTextFromUrl(url, { maxChars = 12000 } = {}) {
  if (!url) return '';
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return '';
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const buffer = Buffer.from(await res.arrayBuffer());
    if (contentType.includes('msword') || contentType.includes('officedocument.wordprocessing') || url.toLowerCase().endsWith('.docx')) {
      return cleanText(await extractDocx(buffer), maxChars);
    }
    if (contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
      return cleanText(extractPdfText(buffer), maxChars);
    }
    const text = buffer.toString('utf8');
    return cleanText(text, maxChars);
  } catch {
    return '';
  }
}

async function extractDocx(buffer) {
  try {
    const mammoth = (await import('mammoth')).default || (await import('mammoth'));
    const result = await mammoth.extractRawText({ buffer });
    return result && result.value ? result.value : '';
  } catch {
    return '';
  }
}

function decodePdfLiteral(s) {
  if (s == null) return '';
  return s
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

function extractPdfText(buffer) {
  try {
    const raw = buffer.toString('latin1');
    const chunks = [];
    const regex = /\((?:\\.|[^()\\]|\([^()]*\))*\)/g;
    let m;
    let total = 0;
    while ((m = regex.exec(raw)) !== null && total < 60000) {
      let literal = m[0].slice(1, -1);
      literal = decodePdfLiteral(literal);
      if (literal && /[A-Za-zÀ-ÿ0-9]/.test(literal)) {
        chunks.push(literal);
        total += literal.length;
      }
    }
    return chunks.join(' ');
  } catch {
    return '';
  }
}

function cleanText(text, maxChars = 12000) {
  if (!text) return '';
  let t = text.replace(/\u0000/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > maxChars) t = t.slice(0, maxChars);
  return t;
}

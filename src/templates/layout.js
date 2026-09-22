/**
 * Shared building blocks for the per-site email templates. Email clients
 * ignore <style> and modern CSS, so everything is table-based with inline styles.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes and keeps the user's line breaks. */
const multiline = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>');

export function formatDate(date, timeZone = process.env.TIMEZONE || 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}

/** Two-column table of submitted fields. */
export function fieldsTable(fields, theme) {
  const rows = fields
    .map(
      ({ label, value }, i) => `
        <tr>
          <td style="padding:12px 16px;background:${i % 2 ? '#ffffff' : theme.muted};width:150px;vertical-align:top;font-size:13px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">${escapeHtml(label)}</td>
          <td style="padding:12px 16px;background:${i % 2 ? '#ffffff' : theme.muted};vertical-align:top;font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;word-break:break-word;">${multiline(value)}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${rows}</table>`;
}

export function button(href, label, theme) {
  if (!href) return '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr><td style="background:${theme.primary};border-radius:6px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:${theme.onPrimary};text-decoration:none;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

/**
 * Wraps body HTML in the branded shell.
 * theme: { primary, onPrimary, accent, muted, font }
 */
export function renderLayout({ theme, brand, tagline, preheader, heading, bodyHtml, footer }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:${theme.font};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08);">
        <tr><td style="background:${theme.primary};padding:24px 28px;border-bottom:4px solid ${theme.accent};">
          <div style="font-size:22px;font-weight:700;color:${theme.onPrimary};letter-spacing:.2px;">${escapeHtml(brand)}</div>
          ${tagline ? `<div style="font-size:13px;color:${theme.onPrimary};opacity:.85;margin-top:4px;">${escapeHtml(tagline)}</div>` : ''}
        </td></tr>
        <tr><td style="padding:28px;color:#0f172a;font-size:15px;line-height:1.6;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0f172a;">${escapeHtml(heading)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.5;">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative (improves deliverability and accessibility). */
export function renderText(lines, fields) {
  const table = fields.map(({ label, value }) => `${label}: ${value}`).join('\n');
  return [...lines, '', table].join('\n');
}

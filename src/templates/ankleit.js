import { button, escapeHtml, fieldsTable, formatDate, renderLayout, renderText } from './layout.js';

const theme = {
  primary: '#5b21b6',
  onPrimary: '#ffffff',
  accent: '#06b6d4',
  muted: '#f5f3ff',
  font: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
};
const tagline = 'IT services & solutions for growing businesses';

/** Email sent to the AnkleIT team. */
function adminEmail({ data, fields, site, meta }) {
  const about = data.service ? ` – ${data.service}` : '';
  const subject = `AnkleIT lead: ${data.name}${data.company ? ` @ ${data.company}` : ''}${about}`;
  const html = renderLayout({
    theme,
    brand: site.name,
    tagline,
    preheader: `New lead from ${data.name}`,
    heading: 'New business lead',
    bodyHtml: `
      <p style="margin:0 0 20px;">A new lead was submitted on the <strong>AnkleIT</strong> website on ${escapeHtml(formatDate(meta.receivedAt))}. Replying to this email goes straight to <strong>${escapeHtml(data.name)}</strong>.</p>
      ${fieldsTable(fields, theme)}
      ${button(`mailto:${data.email}`, 'Respond to lead', theme)}`,
    footer: `Sent from ${escapeHtml(meta.origin || 'the AnkleIT website')} · IP ${escapeHtml(meta.ip)}`,
  });
  const text = renderText([`New AnkleIT lead (${formatDate(meta.receivedAt)})`], fields);
  return { subject, html, text };
}

/** Acknowledgement sent to the person who filled the form. */
function userEmail({ data, fields, site }) {
  const subject = 'AnkleIT – We have received your request';
  const html = renderLayout({
    theme,
    brand: site.name,
    tagline,
    preheader: 'A consultant will contact you within one business day.',
    heading: `Dear ${data.name},`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Thank you for your interest in <strong>AnkleIT</strong>. We have received your request and one of our consultants will contact you <strong>within one business day</strong> to discuss your requirements.</p>
      <p style="margin:0 0 20px;">Summary of your request:</p>
      ${fieldsTable(fields, theme)}
      ${button(site.websiteUrl, 'Visit AnkleIT', theme)}
      <p style="margin:20px 0 0;">Best regards,<br><strong>AnkleIT Team</strong></p>`,
    footer: `This is an automated confirmation for the request submitted on the AnkleIT website. If you did not submit it, please disregard this email.`,
  });
  const text = renderText(
    [
      `Dear ${data.name},`,
      '',
      'Thank you for your interest in AnkleIT. We have received your request and a consultant will contact you within one business day.',
      '',
      'Summary of your request:',
    ],
    fields,
  );
  return { subject, html, text };
}

export default { adminEmail, userEmail };

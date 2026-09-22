import { button, escapeHtml, fieldsTable, formatDate, renderLayout, renderText } from './layout.js';

const theme = {
  primary: '#0b3d91',
  onPrimary: '#ffffff',
  accent: '#f5a623',
  muted: '#f0f5ff',
  font: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};
const tagline = 'Engineering digital products that scale';

/** Email sent to the Motivity Labs team. */
function adminEmail({ data, fields, site, meta }) {
  const subject = `New enquiry from ${data.name}${data.company ? ` (${data.company})` : ''} – Motivity Labs`;
  const html = renderLayout({
    theme,
    brand: site.name,
    tagline,
    preheader: `${data.name} sent a message via the Motivity Labs contact form`,
    heading: 'New website enquiry',
    bodyHtml: `
      <p style="margin:0 0 20px;">A new enquiry arrived through the <strong>Motivity Labs</strong> contact form on ${escapeHtml(formatDate(meta.receivedAt))}. Reply to this email to respond directly to <strong>${escapeHtml(data.name)}</strong>.</p>
      ${fieldsTable(fields, theme)}
      ${button(`mailto:${data.email}`, `Reply to ${data.name}`, theme)}`,
    footer: `Sent from ${escapeHtml(meta.origin || 'the Motivity Labs website')} · IP ${escapeHtml(meta.ip)}`,
  });
  const text = renderText([`New enquiry via Motivity Labs contact form (${formatDate(meta.receivedAt)})`], fields);
  return { subject, html, text };
}

/** Acknowledgement sent to the person who filled the form. */
function userEmail({ data, fields, site }) {
  const subject = 'Thanks for contacting Motivity Labs – we received your enquiry';
  const html = renderLayout({
    theme,
    brand: site.name,
    tagline,
    preheader: 'Our team will get back to you within 1–2 business days.',
    heading: `Hi ${data.name}, thank you for reaching out!`,
    bodyHtml: `
      <p style="margin:0 0 16px;">We've received your enquiry and a member of the Motivity Labs team will get back to you within <strong>1–2 business days</strong>.</p>
      <p style="margin:0 0 20px;">Here's a copy of what you sent us:</p>
      ${fieldsTable(fields, theme)}
      ${button(site.websiteUrl, 'Visit Motivity Labs', theme)}
      <p style="margin:20px 0 0;">Warm regards,<br><strong>Team Motivity Labs</strong></p>`,
    footer: `You're receiving this because you submitted the contact form on the Motivity Labs website. If this wasn't you, you can ignore this email.`,
  });
  const text = renderText(
    [
      `Hi ${data.name},`,
      '',
      "Thank you for contacting Motivity Labs. We've received your enquiry and will get back to you within 1–2 business days.",
      '',
      'Your submission:',
    ],
    fields,
  );
  return { subject, html, text };
}

export default { adminEmail, userEmail };

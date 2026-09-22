import { button, escapeHtml, fieldsTable, formatDate, renderLayout, renderText } from './layout.js';

const theme = {
  primary: '#111827',
  onPrimary: '#ffffff',
  accent: '#22c55e',
  muted: '#f0fdf4',
  font: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const tagline = 'Ride smarter. Ride together.';

/** Email sent to the WeemRide team. */
function adminEmail({ data, fields, site, meta }) {
  const type = data.enquiryType ? `[${data.enquiryType}] ` : '';
  const subject = `${type}New WeemRide enquiry from ${data.name}${data.city ? ` – ${data.city}` : ''}`;
  const html = renderLayout({
    theme,
    brand: site.name,
    tagline,
    preheader: `${data.name} contacted WeemRide`,
    heading: '🚗 New contact request',
    bodyHtml: `
      <p style="margin:0 0 20px;">Someone just reached out through the <strong>WeemRide</strong> website on ${escapeHtml(formatDate(meta.receivedAt))}. Hit reply to respond to <strong>${escapeHtml(data.name)}</strong> directly.</p>
      ${fieldsTable(fields, theme)}
      ${button(`mailto:${data.email}`, 'Reply now', theme)}`,
    footer: `Sent from ${escapeHtml(meta.origin || 'the WeemRide website')} · IP ${escapeHtml(meta.ip)}`,
  });
  const text = renderText([`New WeemRide enquiry (${formatDate(meta.receivedAt)})`], fields);
  return { subject, html, text };
}

/** Acknowledgement sent to the person who filled the form. */
function userEmail({ data, fields, site }) {
  const subject = "We've got your message – WeemRide";
  const html = renderLayout({
    theme,
    brand: site.name,
    tagline,
    preheader: "Thanks for getting in touch. We'll be in touch shortly.",
    heading: `Thanks, ${data.name}! 🙌`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Your message is in the right hands. The WeemRide team reviews every request and we'll get back to you <strong>within 24 hours</strong>.</p>
      <p style="margin:0 0 20px;">For your records, here's what you shared:</p>
      ${fieldsTable(fields, theme)}
      ${button(site.websiteUrl, 'Explore WeemRide', theme)}
      <p style="margin:20px 0 0;">See you on the road,<br><strong>The WeemRide Team</strong></p>`,
    footer: `You're receiving this because you contacted WeemRide through our website. Didn't send this? Just ignore this email.`,
  });
  const text = renderText(
    [
      `Hi ${data.name},`,
      '',
      "Thanks for contacting WeemRide! We've received your message and will get back to you within 24 hours.",
      '',
      'What you shared:',
    ],
    fields,
  );
  return { subject, html, text };
}

export default { adminEmail, userEmail };

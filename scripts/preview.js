// Renders every site's emails with sample data into previews/*.html.
// Usage: npm run preview
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadSites } from '../src/config/sites.js';
import { validateSubmission } from '../src/validate.js';

const sample = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+91 98765 43210',
  subject: 'Partnership enquiry',
  message: 'Hi team,\nWe would like to discuss a project with you.\nThanks!',
  company: 'Acme Pvt Ltd',
  service: 'Mobile app development',
  budget: '₹5–10 lakh',
  city: 'Hyderabad',
  enquiryType: 'Driver partner',
};

mkdirSync('previews', { recursive: true });
for (const site of Object.values(loadSites({ ...process.env, MAIL_FROM_EMAIL: 'x@example.com' }))) {
  const { data, fields } = validateSubmission(sample, site);
  const ctx = { data, fields, site, meta: { receivedAt: new Date(), ip: '203.0.113.7', origin: 'https://example.com' } };
  for (const kind of ['adminEmail', 'userEmail']) {
    const { subject, html } = site.template[kind](ctx);
    const file = `previews/${site.id}-${kind === 'adminEmail' ? 'team' : 'user'}.html`;
    writeFileSync(file, html);
    console.log(`${file}  —  ${subject}`);
  }
}

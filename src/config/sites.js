import motivitylabs from '../templates/motivitylabs.js';
import weemride from '../templates/weemride.js';
import ankleit from '../templates/ankleit.js';

/**
 * One entry per website. The key is the site id used in the URL:
 *   POST /api/contact/<siteId>
 *
 * Secrets and per-deployment values (recipient emails, allowed origins) come
 * from environment variables named <envPrefix>_TO_EMAILS, etc.
 *
 * `extraFields` are optional, site-specific form fields. Anything not listed
 * here (or in the common fields) is ignored.
 */
const SITE_DEFINITIONS = {
  motivitylabs: {
    name: 'Motivity Labs',
    envPrefix: 'MOTIVITYLABS',
    template: motivitylabs,
    extraFields: {
      company: { label: 'Company', max: 150 },
      service: { label: 'Service of interest', max: 150 },
    },
  },
  weemride: {
    name: 'WeemRide',
    envPrefix: 'WEEMRIDE',
    template: weemride,
    extraFields: {
      city: { label: 'City', max: 100 },
      enquiryType: { label: 'Enquiry type', max: 100 },
    },
  },
  ankleit: {
    name: 'AnkleIT',
    envPrefix: 'ANKLEIT',
    template: ankleit,
    extraFields: {
      company: { label: 'Company', max: 150 },
      service: { label: 'Service of interest', max: 150 },
      budget: { label: 'Budget', max: 100 },
    },
  },
};

const splitList = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Builds the runtime site config from SITE_DEFINITIONS + environment. */
export function loadSites(env = process.env) {
  const sites = {};
  for (const [id, def] of Object.entries(SITE_DEFINITIONS)) {
    const p = def.envPrefix;
    // Each site can log in with its own Gmail account; SMTP_USER/SMTP_PASS
    // are the shared fallback.
    const smtp = {
      user: env[`${p}_SMTP_USER`] || env.SMTP_USER,
      pass: env[`${p}_SMTP_PASS`] || env.SMTP_PASS,
    };
    // Default: enquiries go to the site's own Gmail inbox.
    const toEmails = splitList(env[`${p}_TO_EMAILS`] || smtp.user);
    sites[id] = {
      id,
      ...def,
      smtp,
      toEmails,
      ccEmails: splitList(env[`${p}_CC_EMAILS`]),
      allowedOrigins: splitList(env[`${p}_ALLOWED_ORIGINS`]),
      fromName: env[`${p}_FROM_NAME`] || def.name,
      // Gmail only sends as the account you log in with (or its verified aliases).
      fromEmail: env[`${p}_FROM_EMAIL`] || env.MAIL_FROM_EMAIL || smtp.user,
      // Where the user's reply to the acknowledgement email goes.
      replyTo: env[`${p}_REPLY_TO`] || toEmails[0],
      websiteUrl: env[`${p}_WEBSITE_URL`] || '',
      sendUserAck: env[`${p}_SEND_USER_ACK`] !== 'false',
    };
  }
  return sites;
}

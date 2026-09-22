import nodemailer from 'nodemailer';

/**
 * Creates one Nodemailer transport per SMTP login. Defaults to Gmail
 * (smtp.gmail.com:465); set SMTP_HOST/SMTP_PORT to use another provider.
 */
function createTransporter({ user, pass }, env) {
  const host = env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host,
    port,
    // true only for implicit TLS (465); 587/2525 upgrade via STARTTLS.
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    // Google shows App Passwords as "abcd efgh ijkl mnop"; the spaces aren't part of it.
    auth: { user, pass: host.includes('gmail') ? pass?.replace(/\s+/g, '') : pass },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

/**
 * Returns { [siteId]: transporter }. Sites that share a login share a
 * transport, so the connection pool isn't duplicated.
 */
export function createTransporters(sites, env = process.env) {
  const byUser = new Map();
  const transporters = {};
  for (const site of Object.values(sites)) {
    const key = site.smtp.user ?? '';
    if (!byUser.has(key)) byUser.set(key, createTransporter(site.smtp, env));
    transporters[site.id] = byUser.get(key);
  }
  return transporters;
}

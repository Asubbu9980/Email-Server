const COMMON_FIELDS = {
  name: { label: 'Name', max: 100, required: true },
  email: { label: 'Email', max: 254, required: true },
  phone: { label: 'Phone', max: 30 },
  subject: { label: 'Subject', max: 200 },
  message: { label: 'Message', max: 5000, required: true },
};

// Simple, deliberately permissive check; the real proof is the inbox.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Name of the hidden field bots tend to fill in. Must stay empty. */
export const HONEYPOT_FIELD = 'website';

/**
 * Validates a contact-form body against the common fields plus the site's
 * extra fields. Returns { data, fields } on success or { errors } on failure.
 * `fields` is an ordered list of { key, label, value } for the templates.
 */
export function validateSubmission(body, site) {
  const schema = { ...COMMON_FIELDS, ...site.extraFields };
  const errors = {};
  const data = {};

  for (const [key, rule] of Object.entries(schema)) {
    const raw = body?.[key];
    const value = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';

    if (!value) {
      if (rule.required) errors[key] = `${rule.label} is required`;
      continue;
    }
    if (value.length > rule.max) {
      errors[key] = `${rule.label} must be at most ${rule.max} characters`;
      continue;
    }
    data[key] = value;
  }

  if (data.email && !EMAIL_RE.test(data.email)) errors.email = 'Email is not valid';

  if (Object.keys(errors).length) return { errors };

  const fields = Object.entries(schema)
    .filter(([key]) => data[key] !== undefined)
    .map(([key, rule]) => ({ key, label: rule.label, value: data[key] }));

  return { data, fields };
}

import { FormEvent, useState } from 'react';
import { FORMSPREE_ENDPOINT } from '../config';

interface FormState {
  name: string;
  email: string;
  reason: string;
  message: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMAIL_MAX_LENGTH = 254;
const LOCAL_PART_MAX_LENGTH = 64;
const DOMAIN_MAX_LENGTH = 253;

const BASIC_EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_PART_CHARS = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_CHARS = /^[A-Za-z0-9-]+$/;
const ASCII_TLD = /^[A-Za-z]{2,63}$/;
const PUNYCODE_TLD = /^xn--[A-Za-z0-9-]{2,59}$/;

export const getEmailValidationError = (rawEmail: string): string | null => {
  const email = rawEmail.trim();

  if (!email) {
    return 'Please enter an email address.';
  }

  if (email.length > EMAIL_MAX_LENGTH) {
    return 'Email address is too long.';
  }

  if (!BASIC_EMAIL_FORMAT.test(email)) {
    return 'Please enter a valid email format.';
  }

  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return 'Please enter a valid email format.';
  }

  if (localPart.length > LOCAL_PART_MAX_LENGTH) {
    return 'Email address is not valid.';
  }

  if (!LOCAL_PART_CHARS.test(localPart) || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return 'Email address is not valid.';
  }

  if (domain.length > DOMAIN_MAX_LENGTH) {
    return 'Email domain is too long.';
  }

  const labels = domain.split('.');

  if (labels.length < 2) {
    return 'Email must include a domain ending such as .com.';
  }

  for (const label of labels) {
    if (!label || label.length > 63) {
      return 'Email domain is not valid.';
    }

    if (!DOMAIN_LABEL_CHARS.test(label) || label.startsWith('-') || label.endsWith('-')) {
      return 'Email domain is not valid.';
    }
  }

  const topLevelLabel = labels.at(-1) ?? '';
  if (!ASCII_TLD.test(topLevelLabel) && !PUNYCODE_TLD.test(topLevelLabel)) {
    return 'Email must end with a valid domain suffix.';
  }

  return null;
};

export default function Contact() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', reason: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const emailValidationError = getEmailValidationError(form.email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      setStatus('idle');
      setError(null);
      return;
    }

    setStatus('submitting');
    setError(null);
    setEmailError(null);

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      reason: form.reason.trim(),
      message: form.message.trim()
    };

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send');
      }

      setStatus('success');
      setForm({ name: '', email: '', reason: '', message: '' });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-10">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Contact</h1>
        <p className="text-gray-300">
          For collaborations, productions, and technical direction inquiries. I respond quickly to projects in development and touring contexts.
        </p>
        <div className="space-y-2 text-gray-300">
          <a href="mailto:newultravioletsound@gmail.com" className="block underline">
            newultravioletsound@gmail.com
          </a>
          <a href="https://github.com/" className="block underline">
            GitHub
          </a>
          <a href="https://linkedin.com/" className="block underline">
            LinkedIn
          </a>
          <a href="https://instagram.com/" className="block underline">
            Instagram
          </a>
        </div>
      </div>

      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm">
              <span className="text-gray-300">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-gray-300">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => {
                  const nextEmail = e.target.value;
                  setForm({ ...form, email: nextEmail });

                  if (emailError) {
                    setEmailError(getEmailValidationError(nextEmail));
                  }
                }}
                onBlur={(e) => setEmailError(getEmailValidationError(e.target.value))}
                autoComplete="email"
                inputMode="email"
                maxLength={EMAIL_MAX_LENGTH}
                aria-invalid={emailError ? 'true' : undefined}
                aria-describedby={emailError ? 'contact-email-error' : undefined}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
              {emailError && (
                <span id="contact-email-error" className="block text-xs text-red-400">
                  {emailError}
                </span>
              )}
            </label>
          </div>
          <label className="space-y-2 text-sm block">
            <span className="text-gray-300">Reason</span>
            <select
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            >
              <option value="">Select</option>
              <option value="collaboration">Collaboration</option>
              <option value="production">Production / Technical Direction</option>
              <option value="code">Code / Tools</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="space-y-2 text-sm block">
            <span className="text-gray-300">Message</span>
            <textarea
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
          </label>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="px-5 py-3 rounded-lg bg-accent text-foreground font-semibold disabled:opacity-60"
            >
              {status === 'submitting' ? 'Sending…' : 'Send Message'}
            </button>
            {status === 'success' && <span className="text-sm text-green-400">Sent! Talk soon.</span>}
            {status === 'error' && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { FORMSPREE_ENDPOINT } from '../config';

interface FormState {
  name: string;
  email: string;
  reason: string;
  message: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function Contact() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', reason: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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
          For collaborations, productions, and technical direction inquiries. I respond quickly to projects in development and
          touring contexts.
        </p>
        <div className="space-y-2 text-gray-300">
          <a href="mailto:leo@example.com" className="block underline">
            leo@example.com
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
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
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

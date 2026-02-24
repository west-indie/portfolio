import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Contact, { getEmailValidationError } from './Contact';
import { FORMSPREE_ENDPOINT } from '../config';

describe('getEmailValidationError', () => {
  it('rejects emails without a valid domain suffix', () => {
    expect(getEmailValidationError('user@example.c')).toBe('Email must end with a valid domain suffix.');
  });

  it('accepts valid email addresses', () => {
    expect(getEmailValidationError('user.name+tag@example.com')).toBeNull();
  });
});

describe('Contact', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks submit when email domain suffix is invalid', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    await act(async () => {
      await user.type(screen.getByLabelText(/Name/i), 'Test User');
      await user.type(screen.getByLabelText(/Email/i), 'test@example.c');
      await user.type(screen.getByLabelText(/Message/i), 'Test message');
      await user.click(screen.getByRole('button', { name: /Send Message/i }));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Email must end with a valid domain suffix.')).toBeInTheDocument();
  });

  it('submits valid emails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const user = userEvent.setup();
    render(<Contact />);

    await act(async () => {
      await user.type(screen.getByLabelText(/Name/i), 'Test User');
      await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/Message/i), 'Test message');
      await user.click(screen.getByRole('button', { name: /Send Message/i }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      FORMSPREE_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const [, requestInit] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message'
    });

    expect(await screen.findByText('Sent! Talk soon.')).toBeInTheDocument();
  });
});

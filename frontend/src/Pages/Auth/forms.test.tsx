import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHost } from '@/runtime';
import { resetEmail } from '@/runtime';
import ForgotPassword from './ForgotPassword';
import Login from './Login';
import Register from './Register';
import ResetPassword from './ResetPassword';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function Host() {
    return <AppHost navigate={useNavigate()} />;
}

describe('auth forms', () => {
    beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

    function answer(impl: (url: string, method: string) => Response | Promise<Response>) {
        fetchMock().mockImplementation((input: RequestInfo, init?: RequestInit) => {
            const url = String(input);
            const method = (init?.method ?? 'GET').toUpperCase();
            if (url.includes('csrf')) return Promise.resolve(new Response(null, { status: 204 }));
            return Promise.resolve(impl(url, method));
        });
    }

    function fillRegister() {
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } });
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password' } });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    }

    it('ties a real label to the forgot-password email field', () => {
        render(
            <MemoryRouter>
                <ForgotPassword />
            </MemoryRouter>,
        );
        const input = screen.getByLabelText('Email');
        expect(input.tagName).toBe('INPUT');
        expect(input.id).toBe('email');
        expect(input.getAttribute('type')).toBe('email');
        expect(screen.getByText('Email').tagName).toBe('LABEL');
    });

    it('shows the server message when registration is closed and stops the form', async () => {
        answer((url, method) => {
            if (method === 'POST' && url.includes('/api/register')) return json({ message: 'Registration is closed.' }, 403);
            return json({});
        });
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>,
        );

        fillRegister();

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('Registration is closed.');
        expect(alert.textContent).not.toContain('Request failed');
        expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
        expect((screen.getByLabelText('Name') as HTMLInputElement).disabled).toBe(true);
        expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(true);
        expect((screen.getByRole('button', { name: 'Register' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('still shows field errors when registration is open but the input is invalid', async () => {
        answer((url, method) => {
            if (method === 'POST' && url.includes('/api/register')) {
                return json({ message: 'The given data was invalid.', errors: { email: ['The email has already been taken.'] } }, 422);
            }
            return json({});
        });
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>,
        );

        fillRegister();

        expect(await screen.findByText('The email has already been taken.')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
    });

    it('explains a blank registration 429 without closing the form', async () => {
        answer((url, method) => {
            if (method === 'POST' && url.includes('/api/register')) return json({ message: '' }, 429);
            return json({});
        });
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>,
        );
        fillRegister();
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('Registration is busy right now. Wait a moment and try again.');
        expect(alert.textContent).not.toContain('Request failed');
        expect((screen.getByLabelText('Name') as HTMLInputElement).disabled).toBe(false);
        expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
    });

    it('shows login failures on the email field, including the attempt limit', async () => {
        answer((url, method) => {
            if (method === 'POST' && url.includes('/api/login')) {
                return json({
                    message: 'Too many login attempts. Please try again in 39 seconds.',
                    errors: { email: ['Too many login attempts. Please try again in 39 seconds.'] },
                }, 422);
            }
            return json({});
        });
        render(
            <MemoryRouter>
                <Login canResetPassword canRegister={false} />
            </MemoryRouter>,
        );
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
        expect(await screen.findByText('Too many login attempts. Please try again in 39 seconds.')).toBeTruthy();
        expect(screen.queryByText(/Request failed/)).toBeNull();
        expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
    });

    it('shows a forgot-password email error and a 429 message', async () => {
        answer((url, method) => {
            if (method === 'POST' && url.includes('/api/forgot-password')) {
                return json({ message: 'The given data was invalid.', errors: { email: ['The email field must be a valid email address.'] } }, 422);
            }
            return json({});
        });
        const view = render(
            <MemoryRouter>
                <ForgotPassword />
            </MemoryRouter>,
        );
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Email Password Reset Link' }));
        expect(await screen.findByText('The email field must be a valid email address.')).toBeTruthy();

        view.unmount();
        answer((url, method) => {
            if (method === 'POST' && url.includes('/api/forgot-password')) return json({ message: 'Too Many Attempts.' }, 429);
            return json({});
        });
        render(
            <MemoryRouter>
                <ForgotPassword />
            </MemoryRouter>,
        );
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Email Password Reset Link' }));
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('Too Many Attempts.');
    });

    it('shows the forgot-password status sentence', () => {
        render(
            <MemoryRouter>
                <ForgotPassword status="If that email exists, we sent a reset link." />
            </MemoryRouter>,
        );
        expect(screen.getByRole('status').textContent).toContain('If that email exists, we sent a reset link.');
    });

    it('decodes the reset link email', () => {
        expect(resetEmail(new URLSearchParams('email=ada%40example.com'))).toBe('ada@example.com');
        expect(resetEmail(new URLSearchParams('email=a%2Bb%40ex.com'))).toBe('a+b@ex.com');
    });

    it('shows reset-password field errors and the summary message', async () => {
        answer((url, method) => {
            if (method === 'POST' && url.includes('/api/reset-password')) {
                return json({
                    message: 'The given data was invalid.',
                    errors: {
                        email: ['This password reset token is invalid.'],
                        password: ['The password must be at least 8 characters.'],
                    },
                }, 422);
            }
            return json({});
        });
        render(
            <MemoryRouter>
                <ResetPassword token="tok" email="ada@example.com" />
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('The given data was invalid.');
        expect(screen.getByText('This password reset token is invalid.')).toBeTruthy();
        expect(screen.getByText('The password must be at least 8 characters.')).toBeTruthy();
        expect(alert.textContent).not.toContain('{');
        expect((screen.getByLabelText('Password') as HTMLInputElement).disabled).toBe(false);
        expect((screen.getByRole('button', { name: 'Reset Password' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('shows the reset status on the login screen after a successful reset', async () => {
        answer((url, method) => {
            if (method === 'GET' && url.includes('/api/bootstrap')) return json({ auth: { user: null }, canRegister: false });
            if (method === 'POST' && url.includes('/api/reset-password')) return json({ status: 'Your password has been reset.' });
            return json({});
        });
        render(
            <MemoryRouter initialEntries={['/reset-password/abc123?email=ada%40example.com']}>
                <Host />
            </MemoryRouter>,
        );

        expect(await screen.findByRole('button', { name: 'Reset Password' })).toBeTruthy();
        expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('ada@example.com');
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'new-password' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'new-password' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

        const status = await screen.findByRole('status');
        expect(status.textContent).toContain('Your password has been reset.');
        const sent = fetchMock().mock.calls.find((call) => String(call[0]).includes('/api/reset-password'));
        const body = JSON.parse(String(sent?.[1]?.body)) as { token: string; email: string };
        expect(body.token).toBe('abc123');
        expect(body.email).toBe('ada@example.com');
        expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Reset Password' })).toBeNull();
    });
});

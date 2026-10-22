import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, route, useForm } from '@/runtime';
import { FormEventHandler, useState } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [closedMessage, setClosedMessage] = useState<string | null>(null);
    const [busyMessage, setBusyMessage] = useState<string | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setBusyMessage(null);

        post(route('register'), {
            onError: (_errors, problem) => {
                if (!problem) return;
                if (problem.status === 403) {
                    setClosedMessage(problem.stated ?? 'Registration is closed.');
                    return;
                }
                // Two first-user signups can race. The loser gets 429 {message:""}.
                if (problem.status === 429) {
                    setBusyMessage(problem.stated ?? 'Registration is busy right now. Wait a moment and try again.');
                }
            },
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const closed = closedMessage !== null;
    const notice = closedMessage ?? busyMessage;

    return (
        <GuestLayout>
            <Head title="Register" />

            {notice && (
                <div role="alert" className="mb-4 rounded-lg border-2 border-ink bg-pink-soft p-3 text-sm font-semibold text-ink">
                    <p>{notice}</p>
                    <Link href={route('login')} className="mt-2 inline-flex font-bold underline">
                        Log in
                    </Link>
                </div>
            )}

            <form onSubmit={submit}>
                <fieldset disabled={processing || closed} className="min-w-0 border-0 p-0">
                <div>
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        disabled={processing || closed}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />

                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        disabled={processing || closed}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        disabled={processing || closed}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />

                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        disabled={processing || closed}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <Link
                        href={route('login')}
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Already registered?
                    </Link>

                    <PrimaryButton className="ms-4" disabled={processing || closed}>
                        Register
                    </PrimaryButton>
                </div>
                </fieldset>
            </form>
        </GuestLayout>
    );
}

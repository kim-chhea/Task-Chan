import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, route, useForm } from '@/runtime';
import { FormEventHandler, useState } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });
    const [limitMessage, setLimitMessage] = useState<string | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setLimitMessage(null);

        post(route('password.email'), {
            onError: (_errors, problem) => {
                if (problem?.status === 429) setLimitMessage(problem.stated ?? problem.message);
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="mb-4 text-sm text-gray-600">
                Forgot your password? No problem. Just let us know your email
                address and we will email you a password reset link that will
                allow you to choose a new one.
            </div>

            {status && (
                <div role="status" className="mb-4 text-sm font-medium text-green-700">
                    {status}
                </div>
            )}

            {limitMessage && (
                <div role="alert" className="mb-4 rounded-lg border-2 border-ink bg-pink-soft p-3 text-sm font-semibold text-ink">
                    {limitMessage}
                </div>
            )}

            <form onSubmit={submit}>
                <InputLabel htmlFor="email" value="Email" />

                <TextInput
                    id="email"
                    type="email"
                    name="email"
                    value={data.email}
                    className="mt-1 block w-full"
                    isFocused={true}
                    onChange={(e) => setData('email', e.target.value)}
                />

                <InputError message={errors.email} className="mt-2" />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton className="ms-4" disabled={processing}>
                        Email Password Reset Link
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}

<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    /** Opened from the emailed link, so it redirects to the frontend rather than returning JSON. */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        if (! $request->user()->hasVerifiedEmail() && $request->user()->markEmailAsVerified()) {
            event(new Verified($request->user()));
        }

        return redirect(rtrim((string) config('app.frontend_url'), '/').'/today?verified=1');
    }
}

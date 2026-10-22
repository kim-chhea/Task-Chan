<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetLinkController extends Controller
{
    /**
     * Same body for every well-formed address: a sent link, an unknown address, and the
     * broker's own per-user cooldown. A different answer would reveal which emails have accounts.
     */
    public const STATUS = 'If that email exists, we sent a reset link.';

    public function store(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink($request->only('email'));

        if (in_array($status, [Password::RESET_LINK_SENT, Password::INVALID_USER, Password::RESET_THROTTLED], true)) {
            return response()->json(['status' => self::STATUS]);
        }

        throw ValidationException::withMessages(['email' => [trans($status)]]);
    }
}

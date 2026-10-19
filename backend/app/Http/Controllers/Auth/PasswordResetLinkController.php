<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetLinkController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink($request->only('email'));

        // Same answer for known and unknown emails, so this endpoint cannot be used to find out which address has an account.
        if ($status === Password::RESET_LINK_SENT || $status === Password::INVALID_USER) {
            return response()->json(['status' => __(Password::RESET_LINK_SENT)]);
        }

        throw ValidationException::withMessages(['email' => [trans($status)]]);
    }
}

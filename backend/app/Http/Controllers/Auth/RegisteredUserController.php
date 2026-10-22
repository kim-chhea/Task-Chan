<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\BootstrapController;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        abort_if(User::query()->exists(), 403, 'Registration is closed.');

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Two simultaneous requests must not both pass the "no user yet" check.
        $lock = Cache::lock('register-first-user', 10);
        abort_unless($lock->get(), 429, 'Registration is busy. Try again.');

        try {
            abort_if(User::query()->exists(), 403, 'Registration is closed.');

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);
        } finally {
            $lock->release();
        }

        event(new Registered($user));

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => BootstrapController::userPayload($user)], 201);
    }
}

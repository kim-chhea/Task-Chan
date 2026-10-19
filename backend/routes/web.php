<?php

use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

// The backend is API-only. The React app lives in ../frontend; Sanctum's /sanctum/csrf-cookie is registered by the package.
Route::get('/', fn () => response()->json(['name' => config('app.name'), 'api' => url('/api')]));

// Opened from the emailed link (a browser navigation, not an XHR); it redirects back to the frontend.
Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['auth', 'signed', 'throttle:6,1'])
    ->name('verification.verify');
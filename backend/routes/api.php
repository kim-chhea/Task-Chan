<?php

use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\CustomFieldController;
use App\Http\Controllers\Api\ItemApiController;
use App\Http\Controllers\Api\ItemColumns;
use App\Http\Controllers\Api\ItemLinkController;
use App\Http\Controllers\Api\LockerApiController;
use App\Http\Controllers\Api\SubTaskController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\BootstrapController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\InboxController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\LockerController;
use App\Http\Controllers\MasterRecordController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\TodayController;
use Illuminate\Support\Facades\Route;

// Cookie-authenticated SPA requests (Sanctum stateful guard). The frontend first calls GET /sanctum/csrf-cookie.

// Public: app state for the shell (user is null when logged out) and the auth endpoints.
Route::get('bootstrap', BootstrapController::class);

// Six per minute, on its own limiter. Inside the 60/min group it would share that counter and trip early.
Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
    ->middleware('throttle:6,1');

Route::middleware('throttle:60,1')->group(function () {
    Route::post('register', [RegisteredUserController::class, 'store']);
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
    Route::post('reset-password', [NewPasswordController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'throttle:240,1'])->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy']);
    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1');
    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);
    Route::put('password', [PasswordController::class, 'update']);

    // Screen data (one endpoint per screen).
    Route::get('today', [TodayController::class, 'index']);
    Route::get('inbox', [InboxController::class, 'index']);
    Route::get('calendar', [CalendarController::class, 'index']);
    Route::get('review', [ReviewController::class, 'index']);
    Route::get('locker', [LockerController::class, 'index']);
    Route::get('profile', [ProfileController::class, 'edit']);
    Route::patch('profile', [ProfileController::class, 'update']);
    Route::delete('profile', [ProfileController::class, 'destroy']);
    Route::apiResource('master-records', MasterRecordController::class);
    Route::post('master-records/{masterRecord}/spawn', [MasterRecordController::class, 'spawn']);

    Route::get('items', [ItemController::class, 'index']);
    Route::get('items/{item}', [ItemController::class, 'show']);
    Route::post('items', [ItemApiController::class, 'store']);
    Route::patch('items/{item}', [ItemApiController::class, 'update']);
    Route::patch('items/{item}/status', [ItemApiController::class, 'status']);
    Route::delete('items/{item}', [ItemApiController::class, 'destroy']);

    Route::post('items/{item}/sub-tasks', [SubTaskController::class, 'store']);
    Route::patch('sub-tasks/{subTask}', [SubTaskController::class, 'update']);
    Route::delete('sub-tasks/{subTask}', [SubTaskController::class, 'destroy']);

    Route::post('items/{item}/attachments', [AttachmentController::class, 'store']);
    Route::get('attachments/{attachment}', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy']);

    Route::post('items/{item}/follow-ups', [ItemApiController::class, 'followUps']);
    Route::post('items/{item}/links', [ItemLinkController::class, 'store']);
    Route::delete('items/{item}/links/{linked}', [ItemLinkController::class, 'destroy']);

    Route::post('custom-fields', [CustomFieldController::class, 'store']);
    Route::patch('custom-fields/{field}', [CustomFieldController::class, 'update']);
    Route::delete('custom-fields/{field}', [CustomFieldController::class, 'destroy']);
    Route::put('preferences/items-columns', [ItemColumns::class, 'update']);

    Route::post('locker/buy', [LockerApiController::class, 'buy']);
    Route::post('locker/equip', [LockerApiController::class, 'equip']);
    Route::post('locker/mascot', [LockerApiController::class, 'mascot']);
});

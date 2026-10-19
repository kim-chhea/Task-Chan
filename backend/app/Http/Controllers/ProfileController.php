<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Attachment;
use App\Models\Item;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function edit(Request $request): JsonResponse
    {
        return response()->json([
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
        ]);
    }

    public function update(ProfileUpdateRequest $request): JsonResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return response()->json(BootstrapController::userPayload($request->user()));
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Database rows cascade, but uploaded files live on a disk and would be orphaned.
        Attachment::whereIn('item_id', Item::withTrashed()->where('user_id', $user->id)->select('id'))
            ->get(['disk', 'path'])
            ->groupBy('disk')
            ->each(fn ($files, $disk) => Storage::disk($disk)->delete($files->pluck('path')->all()));

        Auth::guard('web')->logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }
}

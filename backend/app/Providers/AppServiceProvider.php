<?php

namespace App\Providers;

use App\Models\CustomField;
use App\Models\Item;
use App\Models\MasterRecord;
use App\Policies\CustomFieldPolicy;
use App\Policies\ItemPolicy;
use App\Policies\MasterRecordPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // The API has no password.reset route. The link in the email opens the SPA.
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontend = rtrim((string) config('app.frontend_url'), '/');
            $email = rawurlencode($notifiable->getEmailForPasswordReset());

            return "{$frontend}/reset-password/{$token}?email={$email}";
        });

        Gate::policy(Item::class, ItemPolicy::class);
        Gate::policy(MasterRecord::class, MasterRecordPolicy::class);
        Gate::policy(CustomField::class, CustomFieldPolicy::class);
    }
}

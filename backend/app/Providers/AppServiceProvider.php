<?php

namespace App\Providers;

use App\Models\Item;
use App\Models\MasterRecord;
use App\Policies\ItemPolicy;
use App\Policies\MasterRecordPolicy;
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
        Gate::policy(Item::class, ItemPolicy::class);
        Gate::policy(MasterRecord::class, MasterRecordPolicy::class);
        Gate::policy(\App\Models\CustomField::class, \App\Policies\CustomFieldPolicy::class);
    }
}
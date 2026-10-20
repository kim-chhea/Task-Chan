<?php

namespace App\Providers;

use App\Console\ServeCommand;
use App\Models\CustomField;
use App\Models\Item;
use App\Models\MasterRecord;
use App\Policies\CustomFieldPolicy;
use App\Policies\ItemPolicy;
use App\Policies\MasterRecordPolicy;
use Illuminate\Console\Application as ArtisanApplication;
use Illuminate\Foundation\Console\ServeCommand as FrameworkServeCommand;
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
        // The framework rebinds `serve` while booting the console kernel, after this
        // provider. Swap it back once Artisan starts, before the command is resolved.
        // The request worker is a child process, so php.ini has to be on that command line.
        ArtisanApplication::starting(function () {
            $this->app->singleton(FrameworkServeCommand::class, fn () => new ServeCommand);
        });

        Gate::policy(Item::class, ItemPolicy::class);
        Gate::policy(MasterRecord::class, MasterRecordPolicy::class);
        Gate::policy(CustomField::class, CustomFieldPolicy::class);
    }
}

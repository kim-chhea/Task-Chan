<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('token_ledger', function (Blueprint $table) {
            $table->enum('reason', [
                'item_done',
                'item_undone',
                'early_bonus',
                'streak_bonus',
                'purchase',
                'focus_bonus',
            ])->change();
        });
    }

    public function down(): void
    {
        DB::table('token_ledger')->where('reason', 'focus_bonus')->delete();

        Schema::table('token_ledger', function (Blueprint $table) {
            $table->enum('reason', [
                'item_done',
                'item_undone',
                'early_bonus',
                'streak_bonus',
                'purchase',
            ])->change();
        });
    }
};

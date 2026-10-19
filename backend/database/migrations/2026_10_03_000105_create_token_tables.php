<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('token_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('delta');
            $table->enum('reason', ['item_done', 'item_undone', 'early_bonus', 'streak_bonus', 'purchase']);
            $table->foreignId('item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('locker_item_key', 64)->nullable();
            $table->integer('balance_after');
            // Idempotency guard, e.g. "item_done:12:1" (item 12, completion cycle 1).
            $table->string('ref', 120)->nullable()->unique();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('owned_cosmetics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category', 16);
            $table->string('key', 32);
            $table->timestamps();
            $table->unique(['user_id', 'category', 'key']);
        });

        Schema::create('streaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('current')->default(0);
            $table->unsignedInteger('best')->default(0);
            $table->date('last_day')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('streaks');
        Schema::dropIfExists('owned_cosmetics');
        Schema::dropIfExists('token_ledger');
    }
};
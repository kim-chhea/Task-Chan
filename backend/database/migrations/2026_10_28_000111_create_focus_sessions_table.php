<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('focus_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('planned_minutes');
            $table->timestamp('started_at');
            $table->timestamp('ends_at');
            $table->enum('status', ['running', 'completed', 'canceled'])->default('running');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->unsignedInteger('awarded_tokens')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('focus_sessions');
    }
};

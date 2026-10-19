<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->string('title');
            $table->enum('type', ['ticket', 'request', 'meeting', 'task'])->default('task');
            $table->enum('status', ['not_started', 'in_progress', 'done'])->default('not_started');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->string('sector')->nullable();
            $table->date('deadline')->nullable();
            $table->date('received_at');
            $table->json('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('reward_tokens')->default(0);
            // Bumped every time the item reaches Done; makes the award idempotent per completion.
            $table->unsignedInteger('completion_cycle')->default(0);
            $table->foreignId('master_record_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'number']);
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'deadline']);
            $table->index(['user_id', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
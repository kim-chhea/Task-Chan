<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->enum('type', ['text', 'number', 'date', 'select', 'checkbox']);
            $table->json('options')->nullable(); // choices for "select"
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'name']);
        });

        Schema::table('items', function (Blueprint $table) {
            $table->json('custom_values')->nullable(); // {"<field id>": value}
        });

        Schema::table('users', function (Blueprint $table) {
            $table->json('items_columns')->nullable(); // ordered visible columns on All items
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('items_columns'));
        Schema::table('items', fn (Blueprint $t) => $t->dropColumn('custom_values'));
        Schema::dropIfExists('custom_fields');
    }
};

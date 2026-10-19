<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sub_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->boolean('done')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->string('disk', 32);
            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 128)->nullable();
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });

        Schema::create('item_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('linked_item_id')->constrained('items')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['item_id', 'linked_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_links');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('sub_tasks');
    }
};
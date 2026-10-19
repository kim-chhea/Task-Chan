<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('mascot', 16)->default('kai');
            $table->string('active_stage', 32)->default('paper');
            $table->string('equipped_hair', 32)->default('teal');
            $table->string('equipped_outfit', 32)->default('black');
            $table->string('equipped_gear', 32)->default('headphones');
            $table->string('equipped_partner', 32)->default('ember');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['mascot', 'active_stage', 'equipped_hair', 'equipped_outfit', 'equipped_gear', 'equipped_partner']);
        });
    }
};
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password',
        'mascot', 'items_columns', 'active_stage', 'equipped_hair', 'equipped_outfit', 'equipped_gear', 'equipped_partner',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'items_columns' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // Free cosmetics are owned from the start.
        static::created(function (User $user) {
            $rows = [];
            foreach (config('locker.items') as $category => $items) {
                foreach ($items as $key => $def) {
                    if (($def['price'] ?? 0) === 0) {
                        $rows[] = ['user_id' => $user->id, 'category' => $category, 'key' => $key, 'created_at' => now(), 'updated_at' => now()];
                    }
                }
            }
            OwnedCosmetic::insert($rows);
        });
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function masterRecords(): HasMany
    {
        return $this->hasMany(MasterRecord::class);
    }

    public function customFields(): HasMany
    {
        return $this->hasMany(CustomField::class)->orderBy('position');
    }

    public function ledger(): HasMany
    {
        return $this->hasMany(TokenLedger::class);
    }

    public function ownedCosmetics(): HasMany
    {
        return $this->hasMany(OwnedCosmetic::class);
    }

    public function streak(): HasOne
    {
        return $this->hasOne(Streak::class);
    }

    /** Balance is always derived from the ledger. */
    public function balance(): int
    {
        return (int) $this->ledger()->sum('delta');
    }
}
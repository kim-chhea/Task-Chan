<?php

namespace App\Models;

use App\Enums\FocusSessionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FocusSession extends Model
{
    protected $fillable = [
        'user_id', 'item_id', 'planned_minutes', 'started_at', 'ends_at', 'status',
        'completed_at', 'canceled_at', 'awarded_tokens',
    ];

    protected function casts(): array
    {
        return [
            'planned_minutes' => 'integer',
            'started_at' => 'datetime',
            'ends_at' => 'datetime',
            'status' => FocusSessionStatus::class,
            'completed_at' => 'datetime',
            'canceled_at' => 'datetime',
            'awarded_tokens' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /** Configured payout for this preset. Zero when the length is not a preset. */
    public function bonus(): int
    {
        return (int) (config('locker.focus.bonus_per_preset')[$this->planned_minutes] ?? 0);
    }
}

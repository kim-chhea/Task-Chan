<?php

namespace App\Models;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Enums\Priority;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Item extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'number', 'title', 'type', 'status', 'priority', 'sector', 'deadline', 'received_at',
        'notes', 'completed_at', 'reward_tokens', 'completion_cycle', 'status_before_done', 'custom_values', 'master_record_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => ItemType::class,
            'status' => ItemStatus::class,
            'priority' => Priority::class,
            'deadline' => 'date:Y-m-d',
            'received_at' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'notes' => 'array',
            'custom_values' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function masterRecord(): BelongsTo
    {
        return $this->belongsTo(MasterRecord::class);
    }

    public function subTasks(): HasMany
    {
        return $this->hasMany(SubTask::class)->orderBy('position')->orderBy('id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    public function links(): BelongsToMany
    {
        return $this->belongsToMany(Item::class, 'item_links', 'item_id', 'linked_item_id');
    }

    /** Tokens this item pays when completed on `$on` (priority reward + on-time bonus). */
    public function rewardOn(?\Carbon\CarbonInterface $on = null): int
    {
        $on ??= now();
        $reward = $this->priority->reward();
        if ($this->deadline !== null && $on->toDateString() <= $this->deadline->toDateString()) {
            $reward += (int) config('locker.early_bonus');
        }

        return $reward;
    }

    /** Allocate the next per-user number. Must be called inside a transaction. */
    public static function nextNumber(int $userId): int
    {
        User::query()->whereKey($userId)->lockForUpdate()->first();

        return (int) static::withTrashed()->where('user_id', $userId)->max('number') + 1;
    }
}
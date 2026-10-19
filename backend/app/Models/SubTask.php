<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubTask extends Model
{
    protected $fillable = ['item_id', 'title', 'done', 'position'];

    protected function casts(): array
    {
        return ['done' => 'boolean'];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
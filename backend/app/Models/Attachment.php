<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attachment extends Model
{
    protected $fillable = ['item_id', 'disk', 'path', 'original_name', 'mime', 'size'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
<?php

namespace App\Models;

use App\Enums\LedgerReason;
use Illuminate\Database\Eloquent\Model;

class TokenLedger extends Model
{
    protected $table = 'token_ledger';

    protected $fillable = ['user_id', 'delta', 'reason', 'item_id', 'locker_item_key', 'balance_after', 'ref'];

    protected function casts(): array
    {
        return ['reason' => LedgerReason::class];
    }
}
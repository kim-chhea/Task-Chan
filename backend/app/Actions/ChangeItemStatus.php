<?php

namespace App\Actions;

use App\Enums\ItemStatus;
use App\Models\Item;
use App\Services\TokenService;
use Illuminate\Support\Facades\DB;

/** Single entry point for status changes so token rules can never be bypassed. */
class ChangeItemStatus
{
    public function __construct(private TokenService $tokens) {}

    /** @return array{awarded:int, streak_bonus:int, reversed:int} */
    public function __invoke(Item $item, ItemStatus $to): array
    {
        return DB::transaction(function () use ($item, $to) {
            $out = ['awarded' => 0, 'streak_bonus' => 0, 'reversed' => 0];

            if ($to === ItemStatus::Done) {
                $item->subTasks()->update(['done' => true]); // Done ticks every sub-task
                $out = [...$out, ...$this->tokens->complete($item)];
            } elseif ($item->status === ItemStatus::Done) {
                $out['reversed'] = $this->tokens->undo($item, $to);
            } else {
                $item->forceFill(['status' => $to])->save();
            }

            return $out;
        });
    }
}
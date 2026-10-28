<?php

namespace App\Http\Resources;

use App\Models\FocusSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FocusSession */
class FocusSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'item' => $this->item === null ? null : [
                'id' => $this->item->id,
                'number' => str_pad((string) $this->item->number, 4, '0', STR_PAD_LEFT),
                'title' => $this->item->title,
                'type' => $this->item->type->value,
            ],
            'planned_minutes' => $this->planned_minutes,
            'started_at' => $this->started_at->toIso8601String(),
            'ends_at' => $this->ends_at->toIso8601String(),
            'status' => $this->status->value,
            'awarded_tokens' => $this->awarded_tokens,
            'bonus' => $this->bonus(),
        ];
    }
}

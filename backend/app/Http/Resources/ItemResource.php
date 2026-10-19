<?php

namespace App\Http\Resources;

use App\Enums\ItemStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Item */
class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $done = $this->status === ItemStatus::Done;

        return [
            'id' => $this->id,
            'number' => str_pad((string) $this->number, 4, '0', STR_PAD_LEFT),
            'title' => $this->title,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'priority' => $this->priority->value,
            'sector' => $this->sector,
            'deadline' => $this->deadline?->toDateString(),
            'received_at' => $this->received_at?->toDateString(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'done' => $done,
            // Done items show what they actually paid; open items show what they would pay now.
            'reward' => $done ? $this->reward_tokens : $this->rewardOn(),
            'master_record' => $this->whenLoaded('masterRecord', fn () => $this->masterRecord ? [
                'id' => $this->masterRecord->id,
                'code' => $this->masterRecord->code,
                'title' => $this->masterRecord->title,
                'session_date' => $this->masterRecord->session_date?->toDateString(),
                'student_count' => $this->masterRecord->student_count,
            ] : null),
            'custom' => (object) ($this->custom_values ?? []),
            'sub_total' => $this->whenCounted('subTasks'),
        ];
    }
}
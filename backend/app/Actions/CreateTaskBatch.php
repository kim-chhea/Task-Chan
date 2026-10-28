<?php

namespace App\Actions;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Enums\Priority;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\User;
use App\Support\Someday;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/** Creates task lines in one transaction. Optionally links each new task from a parent item. */
class CreateTaskBatch
{
    /**
     * @param  list<array<string, mixed>>  $lines
     * @return Collection<int, Item>
     */
    public function __invoke(User $user, array $lines, ?int $masterRecordId, ?Item $linkFrom = null): Collection
    {
        return DB::transaction(function () use ($user, $lines, $masterRecordId, $linkFrom) {
            $created = new Collection;

            foreach ($lines as $line) {
                $attributes = [
                    'user_id' => $user->id,
                    'number' => Item::nextNumber($user->id),
                    'title' => $line['title'],
                    'type' => ItemType::Task,
                    'status' => ItemStatus::NotStarted,
                    'priority' => $line['priority'] ?? Priority::Medium->value,
                    'sector' => $line['sector'] ?? null,
                    'deadline' => $line['deadline'] ?? null,
                    'someday' => false,
                    'master_record_id' => $masterRecordId,
                    'received_at' => now()->toDateString(),
                ];
                if (array_key_exists('someday', $line)) {
                    $attributes['someday'] = $line['someday'];
                }

                $item = Item::create(Someday::normalize($attributes));
                if ($linkFrom !== null) {
                    $linkFrom->links()->attach($item->id);
                }
                $created->push($item);
            }

            return $created;
        });
    }

    /**
     * @param  Collection<int, Item>  $items
     * @return list<array<string, mixed>>
     */
    public function present(Collection $items): array
    {
        $items->load('masterRecord')->loadCount('subTasks');

        return ItemResource::collection($items)->resolve();
    }
}

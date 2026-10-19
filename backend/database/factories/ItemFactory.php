<?php

namespace Database\Factories;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Enums\Priority;
use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Item> */
class ItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'number' => fn (array $a) => random_int(1, 9999) + $a['user_id'] * 10000,
            'title' => fake()->sentence(4),
            'type' => fake()->randomElement(ItemType::cases()),
            'status' => ItemStatus::NotStarted,
            'priority' => Priority::Medium,
            'sector' => fake()->randomElement(['Banking', 'Exams', 'Admin', 'Finance', 'Records']),
            'deadline' => now()->addDays(3)->toDateString(),
            'received_at' => now()->toDateString(),
        ];
    }

    public function priority(Priority $p): static
    {
        return $this->state(['priority' => $p]);
    }

    public function due(?string $date): static
    {
        return $this->state(['deadline' => $date]);
    }
}
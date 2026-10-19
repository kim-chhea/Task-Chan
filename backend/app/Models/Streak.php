<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Streak extends Model
{
    protected $fillable = ['user_id', 'current', 'best', 'last_day'];

    protected function casts(): array
    {
        return ['last_day' => 'date:Y-m-d'];
    }

    /** The streak as the user should see it: zero once a working day has been missed. */
    public function active(): int
    {
        if ($this->last_day === null) {
            return 0;
        }
        $prev = now()->startOfDay()->subDay();
        while ($prev->isWeekend()) {
            $prev = $prev->subDay();
        }

        return $this->last_day->startOfDay()->lt($prev) ? 0 : $this->current;
    }
}

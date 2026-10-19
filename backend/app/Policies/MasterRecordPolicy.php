<?php

namespace App\Policies;

use App\Models\MasterRecord;
use App\Models\User;

class MasterRecordPolicy
{
    public function manage(User $user, MasterRecord $record): bool
    {
        return $record->user_id === $user->id;
    }
}
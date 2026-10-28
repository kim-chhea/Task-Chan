<?php

namespace App\Policies;

use App\Models\FocusSession;
use App\Models\User;

class FocusSessionPolicy
{
    public function manage(User $user, FocusSession $session): bool
    {
        return $session->user_id === $user->id;
    }
}

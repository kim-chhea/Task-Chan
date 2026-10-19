<?php

namespace App\Policies;

use App\Models\CustomField;
use App\Models\User;

class CustomFieldPolicy
{
    public function manage(User $user, CustomField $field): bool
    {
        return $field->user_id === $user->id;
    }
}

<?php

namespace App\Enums;

enum Priority: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';

    public function reward(): int
    {
        return (int) config('locker.rewards.'.$this->value);
    }
}
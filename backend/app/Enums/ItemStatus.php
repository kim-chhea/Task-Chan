<?php

namespace App\Enums;

enum ItemStatus: string
{
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Done = 'done';
}
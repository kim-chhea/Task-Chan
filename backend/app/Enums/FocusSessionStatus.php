<?php

namespace App\Enums;

enum FocusSessionStatus: string
{
    case Running = 'running';
    case Completed = 'completed';
    case Canceled = 'canceled';
}

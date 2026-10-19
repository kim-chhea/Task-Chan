<?php

namespace App\Enums;

enum LedgerReason: string
{
    case ItemDone = 'item_done';
    case ItemUndone = 'item_undone';
    case EarlyBonus = 'early_bonus';
    case StreakBonus = 'streak_bonus';
    case Purchase = 'purchase';
}
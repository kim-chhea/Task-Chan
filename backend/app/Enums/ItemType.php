<?php

namespace App\Enums;

enum ItemType: string
{
    case Ticket = 'ticket';
    case Request = 'request';
    case Meeting = 'meeting';
    case Task = 'task';
}
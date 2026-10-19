<?php

namespace App\Exceptions;

use RuntimeException;

class InsufficientTokensException extends RuntimeException
{
    public function __construct(public readonly int $needed, public readonly int $balance)
    {
        parent::__construct("Need {$needed} more tokens.");
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OwnedCosmetic extends Model
{
    protected $fillable = ['user_id', 'category', 'key'];
}
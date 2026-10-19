<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomField extends Model
{
    public const TYPES = ['text', 'number', 'date', 'select', 'checkbox'];

    protected $fillable = ['user_id', 'name', 'type', 'options', 'position'];

    protected function casts(): array
    {
        return ['options' => 'array'];
    }

    public function toDto(): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'type' => $this->type, 'options' => $this->options ?? []];
    }
}

<?php

namespace App\Http\Requests;

use App\Enums\ItemType;
use App\Enums\Priority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', $this->route('item'));
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', Rule::enum(ItemType::class)],
            'priority' => ['sometimes', Rule::enum(Priority::class)],
            'deadline' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'someday' => ['sometimes', 'boolean'],
            'sector' => ['sometimes', 'nullable', 'string', 'max:80'],
            'custom_values' => ['sometimes', 'nullable', 'array', 'max:40'],
            'notes' => ['sometimes', 'nullable', 'array', 'max:1000'],
            'master_record_id' => ['sometimes', 'nullable', Rule::exists('master_records', 'id')->where('user_id', $this->user()->id)],
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Enums\ItemType;
use App\Enums\Priority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', Rule::enum(ItemType::class)],
            'priority' => ['nullable', Rule::enum(Priority::class)],
            'deadline' => ['nullable', 'date_format:Y-m-d'],
            'someday' => ['sometimes', 'boolean'],
            'sector' => ['nullable', 'string', 'max:80'],
            'master_record_id' => ['nullable', Rule::exists('master_records', 'id')->where('user_id', $this->user()->id)],
        ];
    }
}

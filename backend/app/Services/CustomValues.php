<?php

namespace App\Services;

use App\Models\CustomField;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Validates and merges per-item custom field values against the user's field definitions. */
class CustomValues
{
    /**
     * @param  array<string, mixed>  $input  field id => value (null/'' clears)
     * @param  array<string, mixed>  $existing
     * @return array<string, mixed>
     */
    public static function merge(User $user, array $input, array $existing = []): array
    {
        $fields = CustomField::where('user_id', $user->id)->get()->keyBy('id');
        $out = $existing;
        $errors = [];

        foreach ($input as $id => $value) {
            $field = $fields->get((int) $id);
            if ($field === null) {
                $errors["custom_values.$id"] = 'Unknown field.';
                continue;
            }
            if ($value === null || $value === '') {
                unset($out[(string) $field->id]);
                continue;
            }

            $rule = match ($field->type) {
                'text' => ['string', 'max:500'],
                'number' => ['numeric', 'between:-999999999,999999999'],
                'date' => ['date_format:Y-m-d'],
                'select' => [Rule::in($field->options ?? [])],
                'checkbox' => ['boolean'],
            };
            $v = Validator::make(['v' => $value], ['v' => $rule]);
            if ($v->fails()) {
                $errors["custom_values.$id"] = "Invalid value for {$field->name}.";
                continue;
            }

            $out[(string) $field->id] = match ($field->type) {
                'number' => $value + 0,
                'checkbox' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
                default => $value,
            };
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return $out;
    }
}

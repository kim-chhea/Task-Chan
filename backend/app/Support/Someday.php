<?php

namespace App\Support;

/**
 * A non-null deadline in this payload leaves Someday.
 * Parking (someday true) clears the deadline. A deadline sent alongside someday wins.
 */
class Someday
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function normalize(array $data): array
    {
        if (array_key_exists('someday', $data)) {
            $data['someday'] = filter_var($data['someday'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('deadline', $data) && $data['deadline'] !== null) {
            $data['someday'] = false;

            return $data;
        }

        if (($data['someday'] ?? false) === true) {
            $data['deadline'] = null;
        }

        return $data;
    }
}

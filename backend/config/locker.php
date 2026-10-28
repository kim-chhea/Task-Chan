<?php

/*
| Locker catalog — server is the source of truth for prices and keys.
| Visual attributes (color, hi, trim, ...) are passed to the front-end for rendering only.
*/
return [
    'categories' => ['hair', 'outfit', 'gear', 'partner', 'stage'],

    'defaults' => [
        'hair' => 'teal',
        'outfit' => 'black',
        'gear' => 'headphones',
        'partner' => 'ember',
        'stage' => 'paper',
    ],

    'items' => [
        'hair' => [
            'teal' => ['name' => 'Teal', 'price' => 0, 'color' => '#1E5F5B', 'hi' => '#5FC8BE'],
            'midnight' => ['name' => 'Midnight', 'price' => 0, 'color' => '#22283F', 'hi' => '#5868A8'],
            'ginger' => ['name' => 'Ginger', 'price' => 60, 'color' => '#E8762C', 'hi' => '#FFB27A'],
            'lavender' => ['name' => 'Lavender', 'price' => 80, 'color' => '#A78BFA', 'hi' => '#D9CCFF'],
            'rose' => ['name' => 'Rose', 'price' => 80, 'color' => '#E86A92', 'hi' => '#FFB3C8'],
            'gold' => ['name' => 'Gold', 'price' => 120, 'color' => '#E2B53A', 'hi' => '#FFE38A'],
            'sky' => ['name' => 'Sky', 'price' => 60, 'color' => '#3E8EE8', 'hi' => '#9CC9FF'],
            'mint' => ['name' => 'Mint', 'price' => 60, 'color' => '#2FB58A', 'hi' => '#9BF0CC'],
            'crimson' => ['name' => 'Crimson', 'price' => 100, 'color' => '#C42B4A', 'hi' => '#FF8FA6'],
            'silver' => ['name' => 'Silver', 'price' => 140, 'color' => '#9AA3B5', 'hi' => '#E6EBF5'],
        ],
        'outfit' => [
            'black' => ['name' => 'Black hoodie', 'price' => 0, 'color' => '#1C1D26', 'trim' => '#FFD23F'],
            'sky' => ['name' => 'Sky hoodie', 'price' => 60, 'color' => '#7FB2FF', 'trim' => '#FFFFFF'],
            'cream' => ['name' => 'Cream cardigan', 'price' => 60, 'color' => '#F3E9D2', 'trim' => '#A78BFA'],
            'bomber' => ['name' => 'Green bomber', 'price' => 80, 'color' => '#3E8E5E', 'trim' => '#F2C14E'],
            'track' => ['name' => 'Red track top', 'price' => 100, 'color' => '#E5484D', 'trim' => '#FFFFFF'],
            'lilac' => ['name' => 'Lilac hoodie', 'price' => 70, 'color' => '#B9A4F2', 'trim' => '#FFFFFF'],
            'mintjacket' => ['name' => 'Mint jacket', 'price' => 70, 'color' => '#7EE0B5', 'trim' => '#15161D'],
            'sunny' => ['name' => 'Sunny tee', 'price' => 90, 'color' => '#FFD23F', 'trim' => '#15161D'],
            'denim' => ['name' => 'Denim jacket', 'price' => 110, 'color' => '#4B6FA8', 'trim' => '#F3E9D2'],
        ],
        'gear' => [
            'none' => ['name' => 'No gear', 'price' => 0, 'color' => '#F4F5F9', 'mark' => '—'],
            'headphones' => ['name' => 'Headphones', 'price' => 0, 'color' => '#FFD23F', 'mark' => '♫'],
            'star' => ['name' => 'Star clip', 'price' => 30, 'color' => '#FFF4C7', 'mark' => '★'],
            'glasses' => ['name' => 'Round glasses', 'price' => 50, 'color' => '#E6EBFF', 'mark' => 'oo'],
            'cap' => ['name' => 'Red cap', 'price' => 90, 'color' => '#FFD9DA', 'mark' => 'CAP'],
            'ears' => ['name' => 'Cat-ear band', 'price' => 120, 'color' => '#2A2B36', 'mark' => '^^', 'light' => true],
            'ribbon' => ['name' => 'Pink ribbon', 'price' => 40, 'color' => '#FFE0EA', 'mark' => 'bow'],
            'sunglasses' => ['name' => 'Sunglasses', 'price' => 70, 'color' => '#2A2B36', 'mark' => '##', 'light' => true],
            'halo' => ['name' => 'Halo', 'price' => 130, 'color' => '#FFF4C7', 'mark' => 'O'],
            'crown' => ['name' => 'Crown', 'price' => 180, 'color' => '#FFD23F', 'mark' => 'W'],
        ],
        'partner' => [
            'ember' => ['name' => 'Ember', 'note' => 'Dragon', 'price' => 0, 'color' => '#7EE0B5', 'mark' => 'E'],
            'mochi' => ['name' => 'Mochi', 'note' => 'Cat', 'price' => 150, 'color' => '#2A2B36', 'mark' => 'M', 'light' => true],
            'kon' => ['name' => 'Kon', 'note' => 'Fox', 'price' => 150, 'color' => '#F28C38', 'mark' => 'K'],
            'pan' => ['name' => 'Pan', 'note' => 'Red panda', 'price' => 200, 'color' => '#C8553D', 'mark' => 'P', 'light' => true],
            'bun' => ['name' => 'Bun', 'note' => 'Bunny', 'price' => 150, 'color' => '#F4F5F9', 'mark' => 'B'],
            'pip' => ['name' => 'Pip', 'note' => 'Chick', 'price' => 120, 'color' => '#FFD23F', 'mark' => 'P'],
        ],
        'stage' => [
            'paper' => ['name' => 'Paper', 'price' => 0, 'color' => '#EEF0F6', 'lines' => 'rgba(21,22,29,0.08)'],
            'sky' => ['name' => 'Sky', 'price' => 40, 'color' => '#D7E8FF', 'lines' => 'rgba(79,99,240,0.14)'],
            'sunset' => ['name' => 'Sunset', 'price' => 60, 'color' => '#FFD9BF', 'lines' => 'rgba(232,118,44,0.16)'],
            'sakura' => ['name' => 'Sakura', 'price' => 80, 'color' => '#FFE0EA', 'lines' => 'rgba(232,106,146,0.16)'],
            'night' => ['name' => 'Neon night', 'price' => 120, 'color' => '#1B1C2B', 'lines' => 'rgba(126,224,181,0.14)', 'dark' => true],
            'meadow' => ['name' => 'Meadow', 'price' => 50, 'color' => '#D9F5E8', 'lines' => 'rgba(31,122,77,0.16)'],
            'dusk' => ['name' => 'Lavender dusk', 'price' => 80, 'color' => '#E3DBFF', 'lines' => 'rgba(120,90,220,0.16)'],
            'ocean' => ['name' => 'Ocean', 'price' => 100, 'color' => '#BFE6F5', 'lines' => 'rgba(30,110,160,0.18)'],
        ],
    ],

    // Token rules (server side only)
    'rewards' => ['low' => 5, 'medium' => 10, 'high' => 15],
    'early_bonus' => 5,
    'streak_bonus' => 50,
    'streak_length' => 5,

    // Focus timer. The bonus is paid when the server accepts completion, not from the client clock.
    'focus' => [
        'presets' => [25, 50],
        'bonus_per_preset' => [25 => 10, 50 => 20],
        'daily_cap' => 4,
        'complete_grace_seconds' => 5,
    ],
];

<?php

use App\Models\CustomField;
use App\Models\Item;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

function field(User $u, string $name, string $type, ?array $options = null): CustomField
{
    return CustomField::create(['user_id' => $u->id, 'name' => $name, 'type' => $type, 'options' => $options]);
}

function item(User $u): Item
{
    return Item::factory()->for($u)->create(['number' => Item::nextNumber($u->id)]);
}

it('creates a field and adds it as a column right away', function () {
    $res = $this->postJson('/api/custom-fields', ['name' => 'Client', 'type' => 'text'])->assertCreated();

    $id = $res->json('field.id');
    expect($res->json('columns'))->toContain("cf:$id")
        ->and($this->user->fresh()->items_columns)->toContain("cf:$id");
});

it('requires options for a dropdown and rejects duplicate names and bad types', function () {
    $this->postJson('/api/custom-fields', ['name' => 'Stage', 'type' => 'select'])->assertUnprocessable();
    $this->postJson('/api/custom-fields', ['name' => 'Stage', 'type' => 'select', 'options' => ['A', 'B']])->assertCreated();
    $this->postJson('/api/custom-fields', ['name' => 'Stage', 'type' => 'text'])->assertUnprocessable();
    $this->postJson('/api/custom-fields', ['name' => 'X', 'type' => 'banana'])->assertUnprocessable();
});

it('stores values per type and rejects invalid ones', function () {
    $text = field($this->user, 'Client', 'text');
    $num = field($this->user, 'Amount', 'number');
    $date = field($this->user, 'Review on', 'date');
    $sel = field($this->user, 'Stage', 'select', ['Draft', 'Final']);
    $chk = field($this->user, 'Billed', 'checkbox');
    $it = item($this->user);

    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [
        $text->id => 'DGB', $num->id => '12.5', $date->id => '2026-10-20', $sel->id => 'Final', $chk->id => true,
    ]])->assertOk();

    expect($it->fresh()->custom_values)->toEqual([
        (string) $text->id => 'DGB', (string) $num->id => 12.5, (string) $date->id => '2026-10-20', (string) $sel->id => 'Final', (string) $chk->id => true,
    ]);

    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$num->id => 'abc']])->assertUnprocessable();
    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$sel->id => 'Nope']])->assertUnprocessable();
    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$date->id => '20/10/2026']])->assertUnprocessable();
});

it('clears a value with null and keeps the other values', function () {
    $a = field($this->user, 'A', 'text');
    $b = field($this->user, 'B', 'text');
    $it = item($this->user);
    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$a->id => 'one', $b->id => 'two']])->assertOk();
    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$a->id => null]])->assertOk();

    expect($it->fresh()->custom_values)->toEqual([(string) $b->id => 'two']);
});

it('refuses another user\'s field and cannot edit or delete it', function () {
    $theirs = field(User::factory()->create(), 'Secret', 'text');
    $it = item($this->user);

    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$theirs->id => 'x']])->assertUnprocessable();
    $this->patchJson("/api/custom-fields/{$theirs->id}", ['name' => 'Mine now'])->assertForbidden();
    $this->deleteJson("/api/custom-fields/{$theirs->id}")->assertForbidden();
});

it('keeps the type fixed on rename but lets a dropdown change options', function () {
    $f = field($this->user, 'Stage', 'select', ['A']);
    $this->patchJson("/api/custom-fields/{$f->id}", ['name' => 'Phase', 'type' => 'text', 'options' => ['A', 'B']])->assertOk();

    expect($f->fresh()->type)->toBe('select')->and($f->fresh()->name)->toBe('Phase')->and($f->fresh()->options)->toBe(['A', 'B']);
});

it('deleting a field removes its values and its column', function () {
    $f = field($this->user, 'Client', 'text');
    $it = item($this->user);
    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$f->id => 'DGB']])->assertOk();
    $this->putJson('/api/preferences/items-columns', ['columns' => ['title', "cf:{$f->id}"]])->assertOk();

    $this->deleteJson("/api/custom-fields/{$f->id}")->assertOk()->assertJsonPath('columns', ['title']);

    expect($it->fresh()->custom_values)->toBeNull()->and(CustomField::count())->toBe(0);
});

it('saves column choices, always keeps the title, and drops unknown columns', function () {
    $res = $this->putJson('/api/preferences/items-columns', ['columns' => ['status', 'sector', 'bogus', 'cf:999999']])->assertOk();
    expect($res->json('columns'))->toBe(['title', 'status', 'sector']);

    $this->getJson('/api/items')->assertOk()->assertJsonPath('columns', ['title', 'status', 'sector']);
});

it('lets the user hide sector and show it again', function () {
    $this->putJson('/api/preferences/items-columns', ['columns' => ['number', 'title', 'status']])->assertOk();
    $this->getJson('/api/items')->assertJsonPath('columns', ['number', 'title', 'status']);
});

it('serves the default columns before any choice is made', function () {
    $this->getJson('/api/items')->assertJsonPath('columns', ['number', 'title', 'type', 'status', 'priority', 'sector', 'deadline', 'reward'])->assertJsonPath('fields', []);
});

it('limits the number of custom fields', function () {
    foreach (range(1, 20) as $i) {
        field($this->user, "F$i", 'text');
    }
    $this->postJson('/api/custom-fields', ['name' => 'One too many', 'type' => 'text'])->assertUnprocessable();
});

it('exposes custom values on the item and item list payloads', function () {
    $f = field($this->user, 'Client', 'text');
    $it = item($this->user);
    $this->patchJson("/api/items/{$it->id}", ['custom_values' => [$f->id => 'DGB']])->assertOk()->assertJsonPath("item.custom.{$f->id}", 'DGB');

    $this->getJson('/api/items')->assertJsonCount(1, 'fields')->assertJsonPath("items.0.custom.{$f->id}", 'DGB');
    $this->getJson("/api/items/{$it->id}")->assertJsonCount(1, 'fields')->assertJsonPath("item.custom.{$f->id}", 'DGB');
});

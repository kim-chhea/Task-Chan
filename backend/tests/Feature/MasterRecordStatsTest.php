<?php

use App\Models\MasterRecord;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-07 10:00', 'Asia/Bangkok'));
    $this->user = User::factory()->create();
});
afterEach(fn () => Carbon::setTestNow());

function statsCase(User $user): MasterRecord
{
    return MasterRecord::create([
        'user_id' => $user->id,
        'code' => 'MR-7',
        'title' => 'Midterm',
    ]);
}

it('requires authentication to read a case', function () {
    $case = statsCase($this->user);

    $this->getJson("/api/master-records/{$case->id}")->assertUnauthorized();
});

it('returns zero stats when a case has no items', function () {
    $case = statsCase($this->user);

    $res = $this->actingAs($this->user)->getJson("/api/master-records/{$case->id}")->assertOk();

    expect(array_keys($res->json()))->toBe(['record', 'items', 'stats'])
        ->and($res->json('items'))->toBe([])
        ->and($res->json('record.id'))->toBe($case->id)
        ->and($res->json('stats'))->toBe([
            'total' => 0,
            'open' => 0,
            'done' => 0,
            'next_deadline' => null,
            'open_tokens' => 0,
        ]);
});

it('counts open and done items and sums open rewards', function () {
    $case = statsCase($this->user);
    $sooner = mine($this->user, [
        'title' => 'Sooner', 'master_record_id' => $case->id, 'priority' => 'low', 'deadline' => '2026-11-01', 'status' => 'not_started',
    ]);
    $later = mine($this->user, [
        'title' => 'Later', 'master_record_id' => $case->id, 'priority' => 'medium', 'deadline' => '2026-11-03', 'status' => 'not_started',
    ]);
    $undated = mine($this->user, [
        'title' => 'Undated', 'master_record_id' => $case->id, 'priority' => 'high', 'deadline' => null, 'status' => 'not_started',
    ]);
    $doing = mine($this->user, [
        'title' => 'Doing', 'master_record_id' => $case->id, 'priority' => 'medium', 'deadline' => null, 'status' => 'in_progress',
    ]);
    mine($this->user, [
        'title' => 'Finished early', 'master_record_id' => $case->id, 'priority' => 'high', 'deadline' => '2026-09-01', 'status' => 'done',
    ]);
    $deleted = mine($this->user, [
        'title' => 'Gone', 'master_record_id' => $case->id, 'priority' => 'high', 'deadline' => '2026-08-01', 'status' => 'not_started',
    ]);
    $deleted->delete();
    mine($this->user, ['title' => 'Other case', 'priority' => 'high', 'deadline' => '2026-10-08']);

    $openTokens = $sooner->rewardOn() + $later->rewardOn() + $undated->rewardOn() + $doing->rewardOn();

    $res = $this->actingAs($this->user)->getJson("/api/master-records/{$case->id}")->assertOk();

    expect($res->json('stats'))->toBe([
        'total' => 5,
        'open' => 4,
        'done' => 1,
        'next_deadline' => '2026-11-01',
        'open_tokens' => $openTokens,
    ])->and($openTokens)->toBe(50)
        ->and(collect($res->json('items'))->pluck('title')->all())->not->toContain('Gone')
        ->and(collect($res->json('items'))->pluck('title')->all())->not->toContain('Other case');
});

it('ignores done deadlines when choosing the next open deadline', function () {
    $case = statsCase($this->user);
    mine($this->user, [
        'title' => 'Finished', 'master_record_id' => $case->id, 'priority' => 'high', 'deadline' => '2026-09-01', 'status' => 'done',
    ]);
    mine($this->user, [
        'title' => 'Undated open', 'master_record_id' => $case->id, 'priority' => 'low', 'deadline' => null, 'status' => 'not_started',
    ]);

    $res = $this->actingAs($this->user)->getJson("/api/master-records/{$case->id}")->assertOk();

    expect($res->json('stats'))->toBe([
        'total' => 2,
        'open' => 1,
        'done' => 1,
        'next_deadline' => null,
        'open_tokens' => 5,
    ]);
});

it('hides another user\'s case', function () {
    $case = statsCase(User::factory()->create());
    mine(User::query()->find($case->user_id), [
        'title' => 'Secret', 'master_record_id' => $case->id, 'deadline' => '2026-11-01',
    ]);

    $this->actingAs($this->user)->getJson("/api/master-records/{$case->id}")->assertForbidden();
    $this->actingAs($this->user)->getJson('/api/master-records/999999')->assertNotFound();
});

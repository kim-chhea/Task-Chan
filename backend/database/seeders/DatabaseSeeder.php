<?php

namespace Database\Seeders;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Enums\Priority;
use App\Models\Item;
use App\Models\MasterRecord;
use App\Models\User;
use App\Services\TokenService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Demo user: demo@worktracker.test / password */
    public function run(TokenService $tokens): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@worktracker.test'],
            ['name' => 'Demo', 'password' => 'password', 'email_verified_at' => now()],
        );
        if ($user->items()->exists()) {
            return;
        }

        $monday = CarbonImmutable::now()->startOfWeek();
        $d = fn (int $offset) => $monday->addDays($offset);

        $case = MasterRecord::create([
            'user_id' => $user->id, 'code' => 'MR-031', 'title' => 'Autumn exam session',
            'session_date' => $d(18)->toDateString(), 'student_count' => 148,
            'notes' => 'Main hall, two sittings. Attendance sheets and room booking needed.',
        ]);

        $n = 100;
        $make = function (string $title, ItemType $type, Priority $p, ?string $sector, ?CarbonImmutable $due, ItemStatus $status = ItemStatus::NotStarted, ?CarbonImmutable $received = null, ?int $mr = null) use ($user, &$n) {
            return Item::create([
                'user_id' => $user->id, 'number' => ++$n, 'title' => $title, 'type' => $type, 'priority' => $p,
                'sector' => $sector, 'deadline' => $due?->toDateString(), 'status' => $status,
                'received_at' => ($received ?? now())->toDateString(), 'master_record_id' => $mr,
            ]);
        };

        // Earlier weeks: completed history that funds the Locker (chronological so streaks resolve correctly).
        $history = [
            [-14, 'Month-end report', ItemType::Task, Priority::High, 'Finance'],
            [-13, 'Reply to audit request', ItemType::Request, Priority::Medium, 'Banking'],
            [-12, 'Scan exam scripts', ItemType::Task, Priority::Low, 'Exams'],
            [-11, 'Ticket from KBK', ItemType::Ticket, Priority::High, 'Banking'],
            [-10, 'Staff meeting minutes', ItemType::Meeting, Priority::Low, 'Admin'],
            [-7, 'Update tuition ledger', ItemType::Task, Priority::Medium, 'Finance'],
            [-6, 'Certificate request', ItemType::Request, Priority::Medium, 'Records'],
            [-5, 'Bank reconciliation', ItemType::Ticket, Priority::High, 'Banking'],
            [-4, 'Order stationery', ItemType::Task, Priority::Low, 'Admin'],
            [-3, 'Prepare invigilator list', ItemType::Task, Priority::Medium, 'Exams'],
        ];
        foreach ($history as [$off, $title, $type, $prio, $sector]) {
            $day = $d($off);
            $item = $make($title, $type, $prio, $sector, $day, ItemStatus::NotStarted, $day->subDays(2));
            $tokens->complete($item, $day->setTime(16, 0));
        }

        // This week: matches the design boards.
        foreach ([
            [1, 'Transcript copies', ItemType::Request, Priority::Medium, 'Records', 1],
            [2, 'Invoice check', ItemType::Task, Priority::Low, 'Finance', 2],
            [3, 'Reply to bank statement query', ItemType::Ticket, Priority::High, 'Banking', 3],
        ] as [$off, $title, $type, $prio, $sector, $doneOff]) {
            $item = $make($title, $type, $prio, $sector, $d($off), ItemStatus::NotStarted, $d($off - 1));
            $tokens->complete($item, $d($doneOff)->setTime(11, 0));
        }

        $make('Weekly ops meeting', ItemType::Meeting, Priority::Low, 'Admin', $d(4));
        $make('Update student count — MR-031', ItemType::Task, Priority::Medium, 'Exams', $d(4), ItemStatus::InProgress, null, $case->id);
        $make('Room booking for exam session', ItemType::Request, Priority::Medium, 'Exams', $d(8), ItemStatus::NotStarted, null, $case->id);
        $make('Print attendance sheets', ItemType::Task, Priority::Medium, 'Exams', $d(9), ItemStatus::NotStarted, null, $case->id);
        $ticket = $make('Ticket from DGB', ItemType::Ticket, Priority::High, 'Banking', $d(11), ItemStatus::InProgress);

        $text = fn (string $t) => [['type' => 'text', 'text' => $t, 'styles' => (object) []]];
        $ticket->update(['notes' => [
            ['type' => 'heading', 'props' => ['level' => 2], 'content' => $text('What was asked')],
            ['type' => 'paragraph', 'content' => $text('DGB needs a confirmation letter for the March statement.')],
            ['type' => 'heading', 'props' => ['level' => 2], 'content' => $text('Next step')],
            ['type' => 'paragraph', 'content' => $text('Gather the documents, then reply by Friday.')],
        ]]);
        foreach (['Read the ticket and confirm scope' => true, 'Gather the documents needed' => true, 'Reply to DGB' => false, 'Close the ticket' => false] as $t => $done) {
            $ticket->subTasks()->create(['title' => $t, 'done' => $done, 'position' => $ticket->subTasks()->count() + 1]);
        }
    }
}
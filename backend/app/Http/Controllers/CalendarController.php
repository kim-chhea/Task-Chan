<?php

namespace App\Http\Controllers;

use App\Enums\ItemStatus;
use App\Models\Item;
use App\Models\MasterRecord;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $view = in_array($request->query('view'), ['month', 'week', 'day'], true) ? $request->query('view') : 'month';
        $anchor = $this->anchor($request);

        // Visible range, Monday-first.
        [$start, $end, $prev, $next, $title, $subtitle] = match ($view) {
            'day' => [
                $anchor, $anchor, $anchor->subDay(), $anchor->addDay(),
                $anchor->format('l j'), $anchor->format('F Y'),
            ],
            'week' => [
                $anchor->startOfWeek(), $anchor->endOfWeek(), $anchor->subWeek(), $anchor->addWeek(),
                $anchor->startOfWeek()->format('j M').' – '.$anchor->endOfWeek()->format('j M'), (string) $anchor->endOfWeek()->year,
            ],
            default => [
                $anchor->startOfMonth()->startOfWeek(), $anchor->endOfMonth()->endOfWeek(),
                $anchor->startOfMonth()->subMonth(), $anchor->startOfMonth()->addMonth(),
                $anchor->format('F'), (string) $anchor->year,
            ],
        };

        $items = Item::where('user_id', $userId)->whereBetween('deadline', [$start->toDateString(), $end->toDateString()])
            ->orderBy('number')->get()
            ->map(fn (Item $i) => [
                'id' => $i->id,
                'number' => str_pad((string) $i->number, 4, '0', STR_PAD_LEFT),
                'title' => $i->title,
                'date' => $i->deadline->toDateString(),
                'kind' => $i->status === ItemStatus::Done ? 'done' : 'item',
            ]);

        $exams = MasterRecord::where('user_id', $userId)->whereBetween('session_date', [$start->toDateString(), $end->toDateString()])
            ->get()->map(fn (MasterRecord $m) => [
                'id' => $m->id, 'code' => $m->code, 'title' => $m->title,
                'date' => $m->session_date->toDateString(), 'students' => $m->student_count,
            ]);

        return response()->json([
            'view' => $view,
            'date' => $anchor->toDateString(),
            'month' => $anchor->format('Y-m'),
            'title' => $title,
            'subtitle' => $subtitle,
            'gridStart' => $start->toDateString(),
            'dayCount' => (int) $start->diffInDays($end) + 1,
            'prev' => $prev->toDateString(),
            'next' => $next->toDateString(),
            'today' => now()->toDateString(),
            'items' => $items,
            'exams' => $exams,
        ]);
    }

    /** Accepts ?date=YYYY-MM-DD or the older ?month=YYYY-MM; falls back to today. */
    private function anchor(Request $request): CarbonImmutable
    {
        $date = (string) $request->query('date');
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) && checkdate((int) substr($date, 5, 2), (int) substr($date, 8, 2), (int) substr($date, 0, 4))) {
            return CarbonImmutable::createFromFormat('Y-m-d', $date)->startOfDay();
        }
        $month = (string) $request->query('month');
        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            return CarbonImmutable::createFromFormat('Y-m-d', $month.'-01')->startOfDay();
        }

        return CarbonImmutable::now()->startOfDay();
    }
}

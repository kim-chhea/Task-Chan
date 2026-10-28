import { Head, Link, usePage } from '@/runtime';
import { useMemo, type ReactNode } from 'react';
import { Mascot, Partner } from '@/Components/characters';
import { useGame } from '@/Components/GameContext';
import { useCharacter } from '@/Components/useCharacter';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import { Coin } from '@/Components/ui/TokenPill';
import { useToast } from '@/Components/ui/Toast';
import AppLayout from '@/Layouts/AppLayout';
import { lockerHints } from '@/lib/lockerHints';
import { shortDay } from '@/lib/format';
import { honesty, reviewDraft, type Honesty } from '@/lib/reviewDraft';
import { reviewHeroMood, streakBonus, streakLength } from '@/lib/streakMood';
import { streakLeft } from '@/lib/tokens';
import type { PageProps } from '@/types';

interface Entry { id: number; number: string; title: string; deadline: string | null; tokens: number; day?: string }
interface Props {
    range: string; finished: number; earned: number; openCount: number;
    streak: { current: number; length: number };
    done: Entry[]; carry: Entry[]; openTokens: number;
    /** `category:key` list. Absent only on older payloads; the live review API sends it. */
    owned?: string[];
}

const CONFETTI = ['#FFD23F', '#FF4D8D', '#7EE0B5', '#4F63F0', '#FFFFFF'];
const CATEGORY: Record<string, string> = { hair: 'Hair', outfit: 'Outfit', gear: 'Gear', partner: 'Partner', stage: 'Stage' };

export default function Review({ range, finished, earned, openCount, streak, done, carry, openTokens, owned }: Props) {
    const toast = useToast();
    const ch = useCharacter();
    const { rules } = usePage<PageProps>().props;
    const cleared = openCount === 0 && finished > 0;
    const length = streakLength(rules, streak.length);
    const bonus = streakBonus(rules);
    const left = streakLeft(streak.current, length);
    const heroMood = reviewHeroMood(streak.current, length, cleared);
    const score = useMemo(() => honesty(done.map((item) => ({ status: 'done' as const, deadline: item.deadline, day: item.day ?? null }))), [done]);
    const summary = reviewDraft({
        range,
        finished,
        earned,
        openCount,
        streakCurrent: streak.current,
        streakLength: length,
        streakBonus: bonus,
        done: done.map((item) => ({ title: item.title, tokens: item.tokens })),
        carry: carry.map((item) => ({ title: item.title, deadline: item.deadline })),
        honesty: score,
    });

    const copy = async () => {
        try { await navigator.clipboard.writeText(summary); toast('Summary copied.'); } catch { toast('Could not copy. Select the text instead.'); }
    };

    return (
        <>
            <Head title="Weekly review" />
            <section className="rise relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl border-2.5 border-ink bg-sun p-8 shadow-hard-lg">
                <div className="speed absolute inset-0 opacity-70" aria-hidden="true" />
                {cleared && CONFETTI.map((c, i) => <span key={i} className="confetti" aria-hidden="true" style={{ left: `${8 + i * 19}%`, top: 0, background: c, animationDelay: `${i * 0.4}s` }} />)}
                <div className="relative flex max-w-xl flex-col gap-3">
                    <span className="font-mono text-xs uppercase tracking-[0.1em]">Review · {range}</span>
                    <h1 className="font-display text-[44px] font-normal leading-none md:text-[64px]">{cleared ? 'Week cleared' : 'This week'}<span className="text-pink">!</span></h1>
                    <p className="text-base font-medium">
                        You finished {finished} item{finished === 1 ? '' : 's'} and earned {earned} tokens.{' '}
                        {left > 0 ? `${left} more working day${left === 1 ? '' : 's'} of finishing something unlocks your streak bonus.` : 'Streak bonus unlocked!'}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={copy}>Copy summary</Button>
                        <Link href="/locker" className="inline-flex min-h-[42px] items-center gap-2 rounded-[11px] border-2 border-ink bg-ink px-4 text-sm font-bold text-white no-underline"><Coin size={18} />Spend tokens in Locker</Link>
                    </div>
                </div>
                <div className="relative hidden items-end md:flex" data-mood={heroMood}>
                    <Mascot mascot={ch.mascot} {...ch.kai} mood={heroMood} size={170} />
                    <Partner partner={ch.partner} size={110} className={`-ml-10 ${heroMood === 'cheer' ? 'cheer' : ''}`} />
                </div>
            </section>

            <div className="rise grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5" style={{ animationDelay: '0.1s' }}>
                <Stat label="Finished" value={String(finished)} />
                <Stat label="Tokens earned" value={`+${earned}`} />
                <Stat label="Still open" value={String(openCount)} />
                <HonestyCard score={score} />
                <Card hover className="flex flex-col gap-3 !p-4">
                    <div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold">Streak</span><span className="font-mono text-xs">{streak.current} / {length} days</span></div>
                    <div className="flex gap-1.5" aria-hidden="true">{Array.from({ length }, (_, i) => <span key={i} className={`h-3.5 grow rounded-full border-2 border-ink ${i < streak.current ? 'bg-pink' : 'bg-paper-2'}`} />)}</div>
                    <span className="text-xs font-semibold text-ink-3">{left > 0 ? `${left} more day${left === 1 ? '' : 's'} → +${bonus} bonus` : 'Bonus earned!'}</span>
                </Card>
            </div>

            <Card rise className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-[15px] font-bold">Auto-draft</h2>
                    <Button variant="outline" size="sm" onClick={copy}>Copy summary</Button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm font-medium leading-relaxed">{summary}</pre>
            </Card>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                <Card rise className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between"><h2 className="text-[15px] font-bold">Marked Done</h2><span className="font-mono text-xs text-ink-3">×{finished}</span></div>
                    {done.length === 0 && <p className="text-sm text-ink-3">Nothing finished yet this week.</p>}
                    {done.map((d) => (
                        <div key={d.id} className="flex flex-col gap-1">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{shortDay(d.day)}</span>
                            <Link href={`/items/${d.id}`} className="row-hover flex items-center gap-3 rounded-xl border-2 border-paper-3 bg-white px-3 py-2.5 text-ink no-underline">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-ink bg-mint" aria-hidden="true">✓</span>
                                <span className="grow truncate font-semibold">{d.title}</span>
                                <span className="font-mono text-xs font-semibold text-mint-ink">+{d.tokens}</span>
                            </Link>
                        </div>
                    ))}
                </Card>
                <Card rise className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between"><h2 className="text-[15px] font-bold">Carry over</h2><span className="text-xs text-ink-3">{openTokens} tokens still waiting</span></div>
                    {carry.length === 0 && <p className="text-sm text-ink-3">Nothing left to carry. Nice.</p>}
                    {carry.map((c) => (
                        <Link key={c.id} href={`/items/${c.id}`} className="row-hover grid grid-cols-[48px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border-2 border-paper-3 bg-white px-3 py-2.5 text-ink no-underline">
                            <span className="font-mono text-xs text-ink-3">#{c.number}</span>
                            <span className="truncate font-semibold">{c.title}</span>
                            <span className="text-xs font-bold text-ink-3">{shortDay(c.deadline)}</span>
                            <span className="font-mono text-xs font-semibold">+{c.tokens}</span>
                        </Link>
                    ))}
                </Card>
            </div>

            <NextInLocker owned={owned} />
        </>
    );
}

function HonestyCard({ score }: { score: Honesty }) {
    if (score.kind === 'empty') {
        return (
            <Card hover className="flex flex-col gap-1 !p-4">
                <span className="text-[13px] font-semibold">Honesty</span>
                <span className="text-sm font-semibold leading-snug text-ink-3">{score.label}</span>
            </Card>
        );
    }
    return (
        <Card hover className="flex flex-col gap-1 !p-4">
            <span className="text-[13px] font-semibold">Honesty</span>
            <span className="pop font-display text-[40px] leading-none" style={{ animation: 'pop .5s cubic-bezier(.34,1.56,.64,1) both' }}>{score.percent}%</span>
            <span className="text-xs font-semibold text-ink-3">{score.onTime} of {score.dated} on time</span>
        </Card>
    );
}

function NextInLocker({ owned }: { owned?: string[] }) {
    const { catalog } = usePage<PageProps>().props;
    const { balance } = useGame();

    if (!Array.isArray(owned)) {
        return (
            <Card rise className="flex flex-col gap-3">
                <h2 className="text-[15px] font-bold">Next in Locker</h2>
                <p className="text-sm font-medium">You have {balance} tokens.</p>
                <Link href="/locker" className="inline-flex min-h-[42px] w-fit items-center gap-2 rounded-[11px] border-2 border-ink bg-ink px-4 text-sm font-bold text-white no-underline">
                    <Coin size={18} />Spend tokens in Locker
                </Link>
            </Card>
        );
    }

    const hints = lockerHints({ catalog, owned, balance });
    return (
        <Card rise className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-bold">Next in Locker</h2>
                <span className="font-mono text-xs text-ink-3">{balance} tokens</span>
            </div>
            {hints.length === 0 && <p className="text-sm text-ink-3">Nothing left to unlock. The locker is yours.</p>}
            {hints.map((hint) => (
                <div key={`${hint.category}:${hint.key}`} className="flex items-center justify-between gap-3 rounded-xl border-2 border-paper-3 bg-white px-3 py-2.5">
                    <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">{hint.name}</span>
                        <span className="text-xs font-semibold text-ink-3">{CATEGORY[hint.category] ?? hint.category}</span>
                    </span>
                    <span className={`shrink-0 rounded-lg border-2 border-ink px-2 py-0.5 font-mono text-xs font-semibold ${hint.affordable ? 'bg-sun' : 'bg-paper-2'}`}>{hint.label}</span>
                </div>
            ))}
            <Link href="/locker" className="text-sm font-bold text-ink no-underline">Open Locker →</Link>
        </Card>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <Card hover className="flex flex-col gap-1 !p-4">
            <span className="text-[13px] font-semibold">{label}</span>
            <span className="pop font-display text-[40px] leading-none" style={{ animation: 'pop .5s cubic-bezier(.34,1.56,.64,1) both' }}>{value}</span>
        </Card>
    );
}

Review.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

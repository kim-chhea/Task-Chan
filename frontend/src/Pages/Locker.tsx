import { Head, router } from '@/runtime';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Mascot, Partner } from '@/Components/characters';
import { useGame } from '@/Components/GameContext';
import { usePage } from '@/runtime';
import { useCharacter } from '@/Components/useCharacter';
import Card from '@/Components/ui/Card';
import { Coin } from '@/Components/ui/TokenPill';
import { useToast } from '@/Components/ui/Toast';
import AppLayout from '@/Layouts/AppLayout';
import { api, ApiError } from '@/lib/api';
import { lockerButton } from '@/lib/tokens';
import type { Category, GameState, PageProps } from '@/types';

interface Props {
    owned: string[];
    categories: Category[];
    rewards: Record<string, number>;
    earlyBonus: number;
    streakBonus: number;
    streakLength: number;
}
interface LockerState { balance: number; mascot: GameState['mascot']; equipped: GameState['equipped']; owned: string[] }

const TAB_NAME: Record<Category, string> = { hair: 'Hair', outfit: 'Outfit', gear: 'Gear', partner: 'Partner', stage: 'Stage' };

export default function Locker({ owned: ownedProp, categories, rewards, earlyBonus, streakBonus, streakLength }: Props) {
    const { catalog, game } = usePage<PageProps>().props;
    const { balance, reconcile } = useGame();
    const toast = useToast();
    const [tab, setTab] = useState<Category>('hair');
    const [owned, setOwned] = useState(new Set(ownedProp));
    const [equipped, setEquipped] = useState(game.equipped);
    const [cheer, setCheer] = useState(false);
    const [spent, setSpent] = useState<{ key: number; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const timer = useRef<number>(0);
    const spentTimer = useRef<number>(0);
    useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(spentTimer.current); }, []);

    const ch = useCharacter(equipped);
    const stage = ch.stage;
    const partnerName = catalog.partner[equipped.partner]?.name ?? 'Ember';

    const apply = (s: LockerState) => {
        setOwned(new Set(s.owned));
        setEquipped(s.equipped);
        reconcile(s.balance);
    };
    const celebrate = () => {
        setCheer(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCheer(false), 950);
    };

    async function act(kind: 'buy' | 'equip', key: string, price: number) {
        if (busy) return;
        setBusy(true);
        try {
            const s = await api<LockerState>('POST', `/locker/${kind}`, { category: tab, key });
            apply(s);
            celebrate();
            if (kind === 'buy') setSpent({ key: Date.now(), text: `−${price}` });
            window.clearTimeout(spentTimer.current);
            spentTimer.current = window.setTimeout(() => setSpent(null), 1200);
        } catch (e) {
            if (e instanceof ApiError && typeof e.data.balance === 'number') reconcile(e.data.balance as number);
            toast(e instanceof ApiError ? e.message : 'Something went wrong.');
        } finally { setBusy(false); }
    }

    const entries = Object.entries(catalog[tab]);
    const isSwatch = tab === 'hair' || tab === 'outfit' || tab === 'stage';
    const outfitLine = `${catalog.hair[equipped.hair]?.name} hair · ${catalog.outfit[equipped.outfit]?.name} · ${catalog.gear[equipped.gear]?.name}`;

    return (
        <>
            <Head title="Locker" />
            <div className="halftone pointer-events-none absolute -right-8 -top-8 h-[220px] w-[420px] opacity-[0.07]" aria-hidden="true" />
            <header className="rise relative flex flex-wrap items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">Locker · spend the tokens you earned</span>
                    <h1 className="font-display text-[40px] font-normal leading-none md:text-[56px]">Gear up<span className="text-accent">.</span></h1>
                </div>
                <Card hover className="relative flex items-center gap-3 !rounded-2xl !px-4 !py-3" tone="soft-yellow">
                    <Coin size={32} />
                    <div className="flex flex-col"><span className="text-xs font-bold">Your tokens</span><span className="font-display text-2xl" aria-live="polite">{balance}</span></div>
                    {spent && <span key={spent.key} className="float absolute -top-4 right-3 rounded-lg border-2 border-ink bg-pink px-2.5 py-1 font-display text-sm">{spent.text}</span>}
                </Card>
            </header>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                <Card rise className="overflow-hidden !p-0">
                    <div className="relative flex h-[430px] items-end justify-center overflow-hidden border-b-2.5 border-ink" style={{ background: stage.color }}>
                        <div className="speed absolute inset-0 opacity-60" aria-hidden="true" style={{ background: `repeating-conic-gradient(from 0deg at 50% 60%, ${stage.lines} 0deg 4deg, transparent 4deg 15deg)` }} />
                        {stage.dark && [['12%', '14%'], ['82%', '20%'], ['22%', '62%'], ['88%', '58%']].map(([l, t], i) => <span key={i} className="twinkle absolute text-lg text-mint" style={{ left: l, top: t, animationDelay: `${i * 0.4}s` }} aria-hidden="true">✦</span>)}
                        <span className={`absolute left-4 top-3.5 rounded-lg border-2 border-ink px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider ${stage.dark ? 'bg-ink text-white' : 'bg-white'}`}>{stage.name.toUpperCase()} STAGE</span>
                        <div className="relative flex items-end pb-4">
                            <Mascot mascot={ch.mascot} {...ch.kai} mood={cheer ? 'cheer' : 'idle'} size={270} />
                            <Partner partner={equipped.partner} size={150} className={`-ml-10 ${cheer ? 'cheer' : ''}`} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                        <div className="flex flex-col"><span className="font-display text-lg">Kai <span className="font-sans text-sm font-semibold text-ink-3">&amp; {partnerName}</span></span><span className="text-xs text-ink-3">{outfitLine}</span></div>
                        <MascotPicker mascot={ch.mascot} />
                    </div>
                </Card>

                <Card rise className="flex flex-col gap-5">
                    <div role="tablist" aria-label="Categories" className="inline-flex flex-wrap self-start rounded-xl border-2 border-ink bg-white p-1">
                        {categories.map((c) => (
                            <button key={c} type="button" role="tab" aria-selected={tab === c} onClick={() => setTab(c)} className={`min-h-10 rounded-[10px] px-4 text-sm font-bold ${tab === c ? 'bg-ink text-white' : 'text-ink-2'}`}>{TAB_NAME[c]}</button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-3" role="tabpanel">
                        {entries.map(([key, it]) => {
                            const has = owned.has(`${tab}:${key}`) || it.price === 0;
                            const on = equipped[tab as keyof typeof equipped] === key;
                            const btn = lockerButton({ owned: has, equipped: on, price: it.price, balance });
                            return (
                                <div key={key} className={`flex flex-col gap-3 rounded-2xl border-2.5 border-ink bg-white p-3.5 ${on ? 'shadow-hard-accent' : 'shadow-hard-md'}`}>
                                    <div className="flex h-[84px] items-center justify-center rounded-xl border-2 border-ink font-display text-2xl" style={{ background: it.color, color: it.light || it.dark ? '#fff' : '#15161D', ...(isSwatch ? { backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1.2px, transparent 1.4px)', backgroundSize: '10px 10px' } : {}) }} aria-hidden="true">
                                        {isSwatch ? '' : it.mark}
                                    </div>
                                    <div className="flex flex-col"><span className="text-sm font-bold">{it.name}</span><span className="text-xs text-ink-3">{has ? (on ? 'Wearing now' : 'Owned') : `${it.price} tokens${it.note ? ` · ${it.note}` : ''}`}</span></div>
                                    {btn.kind === 'equipped' && <button type="button" disabled className="min-h-10 cursor-default rounded-[10px] border-2 border-ink bg-mint text-[13px] font-bold">Equipped ✓</button>}
                                    {btn.kind === 'equip' && <button type="button" disabled={busy} onClick={() => act('equip', key, 0)} className="min-h-10 rounded-[10px] border-2 border-ink bg-white text-[13px] font-bold shadow-hard-sm">Equip</button>}
                                    {btn.kind === 'buy' && <button type="button" disabled={busy} onClick={() => act('buy', key, it.price)} className="min-h-10 rounded-[10px] border-2 border-ink bg-sun text-[13px] font-bold shadow-hard-sm">Buy · {it.price}</button>}
                                    {btn.kind === 'need' && <button type="button" disabled className="min-h-10 cursor-not-allowed rounded-[10px] border-2 border-dashed border-ink bg-paper-2 text-[13px] font-bold text-ink-4">Need {btn.needed} more</button>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-ink bg-paper p-4">
                        <div className="flex flex-col"><span className="font-mono text-[11px] tracking-wider">HOW TO EARN</span><span className="text-xs text-ink-3">Tokens land the moment you mark an item Done.</span></div>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                            <Earn n={rewards.low} t="Low priority done" />
                            <Earn n={rewards.medium} t="Medium priority done" />
                            <Earn n={rewards.high} t="High priority done" />
                            <Earn n={earlyBonus} t="Bonus: done before deadline" />
                            <Earn n={streakBonus} t={`${streakLength}-day streak`} />
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}

function Earn({ n, t }: { n: number; t: string }) {
    return <div className="flex items-center gap-2.5"><span className="inline-flex min-w-11 justify-center rounded-lg border-2 border-ink bg-sun px-2 py-0.5 font-mono text-xs font-semibold">+{n}</span><span>{t}</span></div>;
}

function MascotPicker({ mascot }: { mascot: string }) {
    const toast = useToast();
    const { reconcile } = useGame();
    const [value, setValue] = useState(mascot);
    useEffect(() => setValue(mascot), [mascot]);
    return (
        <label className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="sr-only md:not-sr-only">Character</span>
            <select
                value={value}
                onChange={async (e) => {
                    const v = e.target.value; setValue(v);
                    try { const s = await api<LockerState>('POST', '/locker/mascot', { mascot: v }); reconcile(s.balance); router.reload({ only: ['game'] }); }
                    catch { toast('Could not switch character.'); }
                }}
                className="min-h-9 rounded-lg border-2 border-ink bg-white py-0 pl-2 pr-8 text-[13px] font-bold"
            >
                {['kai', 'ren', 'sora', 'haru'].map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
            </select>
        </label>
    );
}

Locker.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
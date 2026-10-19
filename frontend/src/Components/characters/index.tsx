import Kai, { type KaiProps } from './Kai';
import { Haru, Ren, Sora } from './Mascots';
import { Bun, Ember, Kon, Mochi, Pan, Pip } from './Partners';
import type { MascotKey, PartnerKey } from './palette';

export { Kai };
export type { KaiProps };

const MASCOTS = { ren: Ren, sora: Sora, haru: Haru };
const PARTNERS = { ember: Ember, mochi: Mochi, kon: Kon, pan: Pan, bun: Bun, pip: Pip };

/** Kai takes cosmetics + mood; the alternates are static pictures. */
export function Mascot({ mascot, ...kai }: KaiProps & { mascot: MascotKey }) {
    if (mascot === 'kai') return <Kai {...kai} />;
    const Comp = MASCOTS[mascot];
    return <Comp size={kai.size} className={kai.className} />;
}

export function Partner({ partner, size, className }: { partner: PartnerKey; size?: number; className?: string }) {
    const Comp = PARTNERS[partner] ?? Ember;
    return <Comp size={size} className={className} />;
}

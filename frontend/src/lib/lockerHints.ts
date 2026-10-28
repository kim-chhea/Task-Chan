export interface HintItem {
    name?: string;
    price?: number;
}

/** Same shape as the locker catalog: category → key → item. Extra visual fields are ignored. */
export type HintCatalog = Record<string, Record<string, HintItem> | undefined>;

export interface LockerHint {
    category: string;
    key: string;
    name: string;
    price: number;
    /** Tokens still short. 0 when the balance can buy it. */
    needed: number;
    affordable: boolean;
    /** "30 tokens" when affordable, otherwise "need N more". */
    label: string;
}

export interface LockerHintInput {
    catalog: HintCatalog | null | undefined;
    /** `category:key` strings, the same list Locker and Review use. */
    owned: readonly string[];
    balance: number;
    /** Defaults to 3. */
    limit?: number;
}

function hintLabel(affordable: boolean, price: number, needed: number): string {
    return affordable ? `${price} tokens` : `need ${needed} more`;
}

/**
 * Up to 3 unowned paid locker items.
 * Things the balance can buy come first (cheapest first). Then the closest shortfalls.
 * Owned keys and free items (price 0) are skipped.
 */
export function lockerHints({ catalog, owned, balance, limit = 3 }: LockerHintInput): LockerHint[] {
    const ownedSet = new Set(owned);
    const purse = Number.isFinite(balance) ? balance : 0;
    const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 3;
    const found: LockerHint[] = [];

    for (const [category, items] of Object.entries(catalog ?? {})) {
        if (!items) continue;
        for (const [key, item] of Object.entries(items)) {
            const price = item?.price;
            if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;
            const id = `${category}:${key}`;
            if (ownedSet.has(id)) continue;
            const needed = Math.max(0, price - purse);
            const affordable = purse >= price;
            found.push({
                category,
                key,
                name: item.name?.trim() || key,
                price,
                needed,
                affordable,
                label: hintLabel(affordable, price, needed),
            });
        }
    }

    found.sort((a, b) => {
        if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
        if (a.affordable && a.price !== b.price) return a.price - b.price;
        if (!a.affordable && a.needed !== b.needed) return a.needed - b.needed;
        const byName = a.name.localeCompare(b.name);
        if (byName !== 0) return byName;
        return `${a.category}:${a.key}`.localeCompare(`${b.category}:${b.key}`);
    });

    return found.slice(0, cap);
}

import { describe, expect, it } from 'vitest';
import { lockerHints, type HintCatalog } from './lockerHints';

const catalog: HintCatalog = {
    hair: {
        teal: { name: 'Teal', price: 0 },
        ginger: { name: 'Ginger', price: 60 },
        gold: { name: 'Gold', price: 120 },
    },
    gear: {
        star: { name: 'Star clip', price: 30 },
        ribbon: { name: 'Pink ribbon', price: 40 },
        crown: { name: 'Crown', price: 180 },
    },
    partner: {
        ember: { name: 'Ember', price: 0 },
        mochi: { name: 'Mochi', price: 150 },
    },
};

const names = (balance: number, owned: string[] = [], limit?: number) =>
    lockerHints({ catalog, owned, balance, limit }).map((h) => h.name);

describe('lockerHints', () => {
    it('lists affordable items first, cheapest first, then the closest shortfall', () => {
        expect(names(100)).toEqual(['Star clip', 'Pink ribbon', 'Ginger']);
        const short = lockerHints({ catalog, owned: [], balance: 25 });
        expect(short.map((h) => h.name)).toEqual(['Star clip', 'Pink ribbon', 'Ginger']);
        expect(short[0].label).toBe('need 5 more');
        expect(short.every((h) => !h.affordable)).toBe(true);
    });

    it('puts a buyable item ahead of a closer-looking shortfall', () => {
        const hints = lockerHints({
            catalog: { gear: { star: { name: 'Star clip', price: 30 }, pin: { name: 'Pin', price: 35 } } },
            owned: [],
            balance: 30,
        });
        expect(hints.map((h) => [h.name, h.label])).toEqual([
            ['Star clip', '30 tokens'],
            ['Pin', 'need 5 more'],
        ]);
    });

    it('skips owned keys and free items, and stops at 3', () => {
        expect(names(500, ['gear:star', 'hair:ginger'])).toEqual(['Pink ribbon', 'Gold', 'Mochi']);
        expect(names(500, [], 10)).toEqual(['Star clip', 'Pink ribbon', 'Ginger', 'Gold', 'Mochi', 'Crown']);
        expect(lockerHints({ catalog, owned: [], balance: 500 })).toHaveLength(3);
        expect(lockerHints({ catalog, owned: [], balance: 500, limit: 1 })).toHaveLength(1);
    });

    it('returns nothing for an empty catalog', () => {
        expect(lockerHints({ catalog: {}, owned: [], balance: 100 })).toEqual([]);
        expect(lockerHints({ catalog: null, owned: [], balance: 10 })).toEqual([]);
    });
});

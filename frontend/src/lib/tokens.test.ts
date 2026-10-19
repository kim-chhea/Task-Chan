import { describe, expect, it } from 'vitest';
import { lockerButton, rewardPreview, streakLeft, weekDoneAdjusted } from './tokens';

const rules = { rewards: { low: 5, medium: 10, high: 15 }, early_bonus: 5 };

describe('rewardPreview', () => {
    it('adds the on-time bonus on or before the deadline', () => {
        expect(rewardPreview(rules, 'high', '2026-10-09', '2026-10-09')).toEqual({ base: 15, early: 5, total: 20 });
        expect(rewardPreview(rules, 'low', '2026-10-09', '2026-10-01')).toEqual({ base: 5, early: 5, total: 10 });
    });
    it('gives no bonus when late or without a deadline', () => {
        expect(rewardPreview(rules, 'medium', '2026-10-01', '2026-10-02').total).toBe(10);
        expect(rewardPreview(rules, 'medium', null, '2026-10-02').total).toBe(10);
    });
});

describe('lockerButton', () => {
    it('shows equipped, equip, buy and need-more states', () => {
        expect(lockerButton({ owned: true, equipped: true, price: 60, balance: 0 })).toEqual({ kind: 'equipped' });
        expect(lockerButton({ owned: true, equipped: false, price: 60, balance: 0 })).toEqual({ kind: 'equip' });
        expect(lockerButton({ owned: false, equipped: false, price: 0, balance: 0 })).toEqual({ kind: 'equip' });
        expect(lockerButton({ owned: false, equipped: false, price: 60, balance: 60 })).toEqual({ kind: 'buy', price: 60 });
        expect(lockerButton({ owned: false, equipped: false, price: 120, balance: 95 })).toEqual({ kind: 'need', needed: 25 });
    });
});

describe('weekDoneAdjusted', () => {
    const items = [{ id: 1, done: false }, { id: 2, done: true }];
    it('counts optimistic completions and undos once', () => {
        expect(weekDoneAdjusted(3, items, {})).toBe(3);
        expect(weekDoneAdjusted(3, items, { 1: true })).toBe(4);
        expect(weekDoneAdjusted(3, items, { 2: false })).toBe(2);
        expect(weekDoneAdjusted(3, items, { 1: true, 2: true })).toBe(4);
    });
    it('never goes below zero', () => {
        expect(weekDoneAdjusted(0, items, { 2: false })).toBe(0);
    });
});

describe('streakLeft', () => {
    it('counts days to the bonus', () => {
        expect(streakLeft(4, 5)).toBe(1);
        expect(streakLeft(5, 5)).toBe(0);
        expect(streakLeft(7, 5)).toBe(0);
    });
});

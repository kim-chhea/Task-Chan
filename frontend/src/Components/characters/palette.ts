export type Mood = 'idle' | 'happy' | 'cheer';
export type Gear = 'none' | 'headphones' | 'star' | 'glasses' | 'cap' | 'ears' | 'ribbon' | 'sunglasses' | 'halo' | 'crown';
export type PartnerKey = 'ember' | 'mochi' | 'kon' | 'pan' | 'bun' | 'pip';
export type MascotKey = 'kai' | 'ren' | 'sora' | 'haru';

export interface CharacterProps {
    size?: number;
    className?: string;
}

export interface PartnerProps {
    size?: number;
    className?: string;
}

export const HAIR_DEFAULT = { color: '#1E5F5B', hi: '#5FC8BE' };
export const OUTFIT_DEFAULT = { color: '#1C1D26', trim: '#FFD23F' };

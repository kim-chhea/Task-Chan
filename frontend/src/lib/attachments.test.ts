import { describe, expect, it } from 'vitest';
import { ATTACHMENT_MAX_BYTES, clientFileError } from './attachments';

describe('client attachment checks', () => {
    it('uses the server sentences and lets a 10 MB pdf through', () => {
        expect(clientFileError(new File(['x'], 'notes.exe'))).toBe('This file type is not allowed.');
        const exact = new File(['x'], 'edge.pdf');
        Object.defineProperty(exact, 'size', { value: ATTACHMENT_MAX_BYTES });
        expect(clientFileError(exact)).toBeNull();
        const over = new File(['x'], 'big.PDF');
        Object.defineProperty(over, 'size', { value: ATTACHMENT_MAX_BYTES + 1 });
        expect(clientFileError(over)).toBe('The file must be 10 MB or smaller.');
        expect(clientFileError(new File(['x'], 'notes'))).toBe('This file type is not allowed.');
    });
});

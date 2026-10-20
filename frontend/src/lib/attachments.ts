import { apiProblem, type ApiProblem } from '@/lib/api';

/** Same extensions the API allows on `file` (`mimes:pdf,png,...`). */
export const ATTACHMENT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'md', 'csv', 'docx', 'xlsx', 'zip'] as const;

export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Laravel's `max:10240` is kilobytes, so 10 MiB is still accepted. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const FILE_REQUIRED = 'The file field is required.';
export const FILE_TOO_BIG = 'The file must be 10 MB or smaller.';
export const FILE_TYPE = 'This file type is not allowed.';
export const FILE_FORBIDDEN = "You can't add files to this item.";

const GENERIC_403 = new Set(['This action is unauthorized.', 'Forbidden', 'Forbidden.']);
const ALLOWED = new Set<string>(ATTACHMENT_EXTENSIONS);

function extension(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * Same sentences the server returns, checked before the request.
 * A null result means "send it; the server still decides".
 */
export function clientFileError(file: File): string | null {
    if (!file.name.trim()) return FILE_REQUIRED;
    if (!ALLOWED.has(extension(file.name))) return FILE_TYPE;
    if (file.size > ATTACHMENT_MAX_BYTES) return FILE_TOO_BIG;
    return null;
}

/** Text for a failed upload. Field messages win; a 403 becomes a clear sentence. */
export function attachmentErrorText(error: unknown): string[] {
    const problem: ApiProblem = apiProblem(error);
    if (problem.details.file?.length) return problem.details.file;
    if (problem.status === 403) {
        if (problem.stated && !GENERIC_403.has(problem.stated)) return [problem.stated];
        return [FILE_FORBIDDEN];
    }
    return [problem.message];
}

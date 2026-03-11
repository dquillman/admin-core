/**
 * Shared formatting and sanitization utilities.
 */

/** Reject non-http/https URLs to prevent javascript: and data: URI attacks. */
export const sanitizeUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return undefined;
};

/**
 * Lightweight user-agent parser for telemetry capture.
 * Extracts OS and browser from navigator.userAgent.
 */

export function parseOS(ua: string): string {
    if (/Windows NT 10/.test(ua)) {
        return ua.includes('Windows NT 10.0; Win64') ? 'Windows 10/11' : 'Windows 10';
    }
    if (/Windows NT/.test(ua)) return 'Windows';
    if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
        const ver = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.');
        return `macOS ${ver}`;
    }
    if (/CrOS/.test(ua)) return 'ChromeOS';
    if (/Linux/.test(ua)) return 'Linux';
    if (/Android ([\d.]+)/.test(ua)) return `Android ${ua.match(/Android ([\d.]+)/)?.[1]}`;
    if (/iPhone OS ([\d_]+)/.test(ua)) return `iOS ${ua.match(/iPhone OS ([\d_]+)/)?.[1]?.replace(/_/g, '.')}`;
    if (/iPad/.test(ua)) return 'iPadOS';
    return 'Unknown';
}

export function parseBrowser(ua: string): string {
    // Order matters — check specific before generic
    if (/Edg\/([\d.]+)/.test(ua)) return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1]}`;
    if (/OPR\/([\d.]+)/.test(ua)) return `Opera ${ua.match(/OPR\/([\d.]+)/)?.[1]}`;
    if (/Chrome\/([\d.]+)/.test(ua) && !/Edg/.test(ua)) return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1]}`;
    if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) {
        const ver = ua.match(/Version\/([\d.]+)/)?.[1];
        return ver ? `Safari ${ver}` : 'Safari';
    }
    if (/Firefox\/([\d.]+)/.test(ua)) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1]}`;
    return 'Unknown';
}

export function getTelemetryFields() {
    const ua = navigator.userAgent;
    return {
        os: parseOS(ua),
        browser: parseBrowser(ua),
        userAgent: ua,
        environment: import.meta.env.MODE || 'production',
        submittedFrom: 'admin-core' as const,
    };
}

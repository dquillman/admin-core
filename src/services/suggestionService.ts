import type { IssueCategory, ReportedIssue } from '../types';

// Keyword mappings based on the default seeded categories
const KEYWORD_MAP: Record<string, string[]> = {
    'auth_account_access': ['login', 'signin', 'sign-in', 'password', 'logout', 'account', 'email', 'reset', 'access', 'auth', 'authentication', 'session', 'expired', 'locked', 'forbidden', 'credential'],
    'user_interface_ux': ['ui', 'button', 'color', 'screen', 'layout', 'responsive', 'dark mode', 'animation', 'font', 'text', 'size', 'blur', 'contrast', 'alignment', 'mobile', 'desktop', 'nav', 'menu', 'icon', 'visibility', 'hidden', 'display'],
    'quiz_assessment_logic': ['quiz', 'question', 'answer', 'score', 'result', 'logic', 'grade', 'grading', 'correct', 'incorrect', 'option', 'choice', 'mark', 'calc', 'calculation'],
    'tutor_ai_output': ['tutor', 'ai', 'voice', 'explanation', 'wrong', 'hallucination', 'chat', 'bot', 'response', 'feedback', 'hint', 'explain'],
    'performance_stability': ['slow', 'crash', 'lag', 'freeze', 'load', 'loading', 'error', 'bug', 'broken', 'fail', 'failure', 'timeout', 'network', 'connect', 'latency', 'spin'],
    'billing_subscription': ['billing', 'subscription', 'price', 'pay', 'payment', 'card', 'credit', 'invoice', 'charge', 'refund', 'plan', 'tier', 'upgrade', 'downgrade', 'receipt']
};

export interface SuggestionResult {
    categoryId: string;
    confidence: number;
    reasons: string[];
}

export const analyzeIssue = (issue: ReportedIssue, validCategories: IssueCategory[], adminNotes?: string): SuggestionResult | null => {
    // Only analyze if uncategorized OR if explicitly requested (we might want to re-evaluate)
    // For the button, we want to run even if already categorized, to see if it matches.
    // So we relaxed the check slightly or we assume the caller handles it.
    // The prompt says "Button is enabled for all issues". So we should allow analysis even if categorized.

    const text = `${issue.message || ''} ${issue.description || ''} ${issue.suggestedCategory || ''} ${adminNotes || ''}`.toLowerCase();
    const scores: Record<string, { score: number, matches: string[] }> = {};

    // Initialize scores
    validCategories.forEach(cat => {
        scores[cat.id] = { score: 0, matches: [] };
    });

    // 1. Check User Suggestion (High Confidence)
    if (issue.suggestedCategory) {
        const userSuggestion = issue.suggestedCategory.trim().toLowerCase();
        // Exact ID match?
        if (scores[userSuggestion]) {
            scores[userSuggestion].score += 50;
            scores[userSuggestion].matches.push(`User suggested specific ID: "${userSuggestion}"`);
        } else {
            // Text match against category labels
            const matchedLabel = validCategories.find(c => c.label.toLowerCase() === userSuggestion);
            if (matchedLabel) {
                scores[matchedLabel.id].score += 50;
                scores[matchedLabel.id].matches.push(`User suggested label: "${matchedLabel.label}"`);
            }
        }
    }

    // 2. check Keywords
    Object.entries(KEYWORD_MAP).forEach(([catId, keywords]) => {
        if (!scores[catId]) return; // Skip if category not in valid list (e.g. deprecated/removed)

        keywords.forEach(word => {
            if (text.includes(word)) {
                scores[catId].score += 10;
                if (!scores[catId].matches.includes(word)) {
                    scores[catId].matches.push(word);
                }
            }
        });
    });

    // 3. Category-First Matching (Label & ID)
    validCategories.forEach(cat => {
        // Skip 'Uncategorized' for proactive matching unless user asked for it
        if (cat.id === 'Uncategorized') return;

        const labelTokens = cat.label.toLowerCase().split(/\s+/);
        labelTokens.forEach(token => {
            if (token.length > 2 && text.includes(token)) {
                scores[cat.id].score += 5;
                if (!scores[cat.id].matches.includes(`Matched label word: "${token}"`)) {
                    scores[cat.id].matches.push(`Matched label word: "${token}"`);
                }
            }
        });

        // Boost for description words if available
        if (cat.description) {
            const descTokens = cat.description.toLowerCase().split(/\s+/);
            descTokens.forEach(token => {
                if (token.length > 3 && text.includes(token)) {
                    scores[cat.id].score += 1;
                    // Don't spam reasons
                }
            });
        }
    });

    // Find Winner
    let bestCat = '';
    let maxScore = -1; // Allow 0 to be a winner if it's the only one (though unlikely)

    Object.entries(scores).forEach(([id, data]) => {
        if (data.score > maxScore) {
            maxScore = data.score;
            bestCat = id;
        }
    });

    // Forced Best Match
    if (bestCat) {
        return {
            categoryId: bestCat,
            confidence: Math.round(Math.min(maxScore, 100)),
            reasons: scores[bestCat].matches.length > 0 ? scores[bestCat].matches : ['Best semantic match available.']
        };
    }

    // Ultimate Fallback: Default to first active category if completely ambiguous, 
    // or 'Uncategorized' if it exists in the list.
    const defaultCat = validCategories.find(c => c.id === 'Uncategorized') || validCategories[0];

    return {
        categoryId: defaultCat?.id || 'Uncategorized',
        confidence: 0,
        reasons: ['No determining factors found. Defaulting to available option.']
    };
};

export interface SeverityResult {
    severity: 'S1' | 'S2' | 'S3' | 'S4';
    classification: 'blocking' | 'misleading' | 'trust' | 'cosmetic';
    confidence: number;
    reasons: string[];
}

export const analyzeSeverity = (issue: ReportedIssue): SeverityResult => {
    const text = `${issue.message || ''} ${issue.description || ''}`.toLowerCase();
    const reasons: string[] = [];
    let score = 0; // Higher = More Severe

    // 1. Critical Keywords (Crash, Block, Security)
    if (text.match(/crash|white screen|blank|locked out|security|leak|urgent|down/)) {
        score += 40;
        reasons.push('Contains critical severity keywords (crash/security)');
    }

    // 2. High Priority Keywords (Fail, Error, Broken, Payment)
    if (text.match(/error|fail|broken|payment|charge|subscription|wrong|calc|incorrect/)) {
        score += 20;
        reasons.push('Contains functional failure keywords');
    }

    // 3. User Signal (Long description usually means more complex/important)
    if (text.length > 100) {
        score += 5;
        // reasons.push('Detailed description');
    }

    // 4. Heuristic Classification
    // S1: Score > 35
    // S2: Score > 15
    // S3: Default
    // S4: "typo", "color", "icon" -> Cosmetic

    if (text.match(/typo|color|icon|align|spacing|cosmetic|text|font/)) {
        return {
            severity: 'S4',
            classification: 'cosmetic',
            confidence: 90,
            reasons: ['explicit cosmetic keywords']
        };
    }

    if (score >= 35) {
        return {
            severity: 'S1',
            classification: 'blocking',
            confidence: 85,
            reasons
        };
    }

    if (score >= 15) {
        return {
            severity: 'S2',
            classification: 'misleading', // "Functional" but labeled misleading/trust often map here
            confidence: 70,
            reasons
        };
    }

    return {
        severity: 'S3',
        classification: 'trust', // Default bucket for improvements
        confidence: 50,
        reasons: ['Standard issue profile']
    };
};

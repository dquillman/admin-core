import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, Loader2, FileUp } from 'lucide-react';
import Papa from 'papaparse';
import { batchImportIssues, type ImportIssueRow } from '../services/firestoreService';

interface ImportIssuesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ParsedRow extends ImportIssueRow {
    _rowIndex: number;
    _errors: string[];
}

type Step = 'choose' | 'preview' | 'confirm' | 'importing' | 'done';

const VALID_SEVERITIES = ['S1', 'S2', 'S3', 'S4'];

function normalizeSeverity(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, '');
}

function validateRow(row: Record<string, any>, index: number): ParsedRow {
    const errors: string[] = [];

    const title = (row.title ?? '').toString().trim();
    if (!title) errors.push('title is required');

    const rawSeverity = (row.severity ?? '').toString();
    const severity = normalizeSeverity(rawSeverity);
    if (!severity) {
        errors.push('severity is required');
    } else if (!VALID_SEVERITIES.includes(severity)) {
        errors.push(`severity "${rawSeverity}" is invalid (must be S1-S4)`);
    }

    return {
        title,
        severity,
        status: (row.status ?? '').toString().trim() || undefined,
        category: (row.category ?? '').toString().trim() || undefined,
        source: (row.source ?? '').toString().trim() || undefined,
        summary: (row.summary ?? '').toString().trim() || undefined,
        notes: (row.notes ?? '').toString().trim() || undefined,
        app: (row.app ?? '').toString().trim() || undefined,
        createdBy: (row.createdBy ?? '').toString().trim() || undefined,
        _rowIndex: index,
        _errors: errors,
    };
}

export const ImportIssuesModal: React.FC<ImportIssuesModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<Step>('choose');
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setStep('choose');
        setRows([]);
        setParseError(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFile = (file: File) => {
        setParseError(null);
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'json') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    if (!Array.isArray(data)) {
                        setParseError('JSON file must contain an array of objects.');
                        return;
                    }
                    const parsed = data.map((item: any, i: number) => validateRow(item, i + 1));
                    processRows(parsed);
                } catch {
                    setParseError('Failed to parse JSON file. Check format.');
                }
            };
            reader.readAsText(file);
        } else if (ext === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => {
                    if (result.errors.length > 0 && result.data.length === 0) {
                        setParseError(`CSV parse error: ${result.errors[0].message}`);
                        return;
                    }
                    const parsed = result.data.map((item: any, i: number) => validateRow(item, i + 1));
                    processRows(parsed);
                },
                error: (err) => {
                    setParseError(`CSV parse error: ${err.message}`);
                },
            });
        } else {
            setParseError('Unsupported file type. Please use .csv or .json.');
        }
    };

    const processRows = (parsed: ParsedRow[]) => {
        if (parsed.length === 0) {
            setParseError('File contains no data rows.');
            return;
        }
        if (parsed.length > 500) {
            setParseError(`File contains ${parsed.length} rows. Maximum is 500 per import.`);
            return;
        }
        setRows(parsed);
        setStep('preview');
    };

    const validRows = rows.filter(r => r._errors.length === 0);
    const invalidRows = rows.filter(r => r._errors.length > 0);

    const handleConfirmImport = async () => {
        setStep('importing');
        try {
            const toImport = validRows.map(({ _rowIndex, _errors, ...row }) => row);
            const count = await batchImportIssues(toImport);
            setImportResult({ success: true, count });
            setStep('done');
        } catch (err: any) {
            setImportResult({ success: false, count: 0, error: err.message || 'Import failed.' });
            setStep('done');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <Upload className="w-5 h-5 text-brand-400" />
                        <h2 className="text-lg font-bold text-white">Import Issues</h2>
                    </div>
                    <button onClick={handleClose} className="p-1 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* Step: Choose File */}
                    {step === 'choose' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                                <FileUp className="w-8 h-8 text-slate-400" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold text-white">Choose a file to import</h3>
                                <p className="text-sm text-slate-400">Accepts .csv or .json — max 500 rows</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFile(file);
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors"
                            >
                                Select File
                            </button>
                            {parseError && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{parseError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Preview */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold text-white">Preview Import</h3>
                                    <p className="text-sm text-slate-400">
                                        {rows.length} total rows — <span className="text-green-400">{validRows.length} valid</span>
                                        {invalidRows.length > 0 && (
                                            <> — <span className="text-red-400">{invalidRows.length} invalid (will be skipped)</span></>
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={reset}
                                    className="text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    Choose different file
                                </button>
                            </div>

                            <div className="border border-slate-800 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-800/50 text-slate-400 text-left text-xs uppercase tracking-wider">
                                                <th className="px-3 py-2 w-10">#</th>
                                                <th className="px-3 py-2">Title</th>
                                                <th className="px-3 py-2 w-20">Severity</th>
                                                <th className="px-3 py-2 w-24">Status</th>
                                                <th className="px-3 py-2">Category</th>
                                                <th className="px-3 py-2 w-28">App</th>
                                                <th className="px-3 py-2 w-32">Errors</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {rows.map((row) => {
                                                const hasError = row._errors.length > 0;
                                                return (
                                                    <tr
                                                        key={row._rowIndex}
                                                        className={hasError ? 'bg-red-500/5' : 'hover:bg-slate-800/30'}
                                                    >
                                                        <td className="px-3 py-2 text-slate-500 font-mono text-xs">{row._rowIndex}</td>
                                                        <td className={`px-3 py-2 ${hasError && !row.title ? 'text-red-400' : 'text-slate-300'}`}>
                                                            {row.title || <span className="italic text-red-400">missing</span>}
                                                        </td>
                                                        <td className={`px-3 py-2 font-mono ${hasError && row._errors.some(e => e.includes('severity')) ? 'text-red-400' : 'text-slate-300'}`}>
                                                            {row.severity || <span className="italic text-red-400">missing</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-300">{row.status || 'New'}</td>
                                                        <td className="px-3 py-2 text-slate-300">{row.category || '—'}</td>
                                                        <td className="px-3 py-2 text-slate-300">{row.app || '—'}</td>
                                                        <td className="px-3 py-2">
                                                            {hasError ? (
                                                                <span className="text-red-400 text-xs">{row._errors.join('; ')}</span>
                                                            ) : (
                                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step: Confirm */}
                    {step === 'confirm' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            <div className="w-16 h-16 bg-brand-600/20 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-brand-400" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-white">Import {validRows.length} issues?</h3>
                                {invalidRows.length > 0 && (
                                    <p className="text-sm text-slate-400">{invalidRows.length} invalid rows will be skipped.</p>
                                )}
                                <p className="text-sm text-slate-500">This will create {validRows.length} new documents in Firestore.</p>
                            </div>
                        </div>
                    )}

                    {/* Step: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
                            <p className="text-slate-300 font-medium">Importing {validRows.length} issues...</p>
                        </div>
                    )}

                    {/* Step: Done */}
                    {step === 'done' && importResult && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            {importResult.success ? (
                                <>
                                    <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold text-white">Import Complete</h3>
                                        <p className="text-sm text-slate-400">Successfully imported {importResult.count} issues.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
                                        <AlertTriangle className="w-8 h-8 text-red-400" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold text-white">Import Failed</h3>
                                        <p className="text-sm text-red-400">{importResult.error}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
                    {step === 'preview' && (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setStep('confirm')}
                                disabled={validRows.length === 0}
                                className={`px-5 py-2 text-sm font-medium rounded-xl transition-colors ${
                                    validRows.length === 0
                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        : 'bg-brand-600 hover:bg-brand-500 text-white'
                                }`}
                            >
                                Continue with {validRows.length} valid rows
                            </button>
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <button
                                onClick={() => setStep('preview')}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                className="px-5 py-2 text-sm font-medium rounded-xl bg-green-600 hover:bg-green-500 text-white transition-colors"
                            >
                                Confirm Import
                            </button>
                        </>
                    )}

                    {step === 'done' && (
                        <button
                            onClick={handleClose}
                            className="px-5 py-2 text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

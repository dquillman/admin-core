import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Application Crash Detected</h1>
                        <p className="text-slate-300 mb-6">
                            The application encountered a critical error and could not render.
                        </p>

                        <div className="bg-black/50 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-6">
                            <p className="text-red-400 font-bold mb-2">{this.state.error?.toString()}</p>
                            <pre className="text-slate-500 whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.href = '/login'}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-all"
                        >
                            Reset Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;

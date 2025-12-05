import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg m-2">
                    <h2 className="text-red-500 font-bold mb-2">Something went wrong in {this.props.name || 'Component'}</h2>
                    <pre className="text-xs text-red-400 bg-red-950/50 p-2 rounded overflow-auto">
                        {this.state.error?.message}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

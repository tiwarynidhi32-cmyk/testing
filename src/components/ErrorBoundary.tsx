import React, { ErrorInfo } from 'react';

export default class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in LIS component:', error, errorInfo);
  }

  public render() {
    const self = this as any;
    if (self.state.hasError) {
      if (self.props.fallback) {
        return self.props.fallback;
      }
      return (
        <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-2xl text-center max-w-2xl mx-auto my-8">
          <p className="text-xs font-bold text-rose-800">An unexpected exception occurred inside the diagnostics module.</p>
          <p className="text-[11px] text-rose-600 mt-2 font-mono">{self.state.error?.toString()}</p>
          <button
            onClick={() => self.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
          >
            Retry Loading
          </button>
        </div>
      );
    }

    return self.props.children;
  }
}

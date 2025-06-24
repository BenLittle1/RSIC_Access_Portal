import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('🚨 Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Store error info in state
    this.setState({
      error,
      errorInfo
    });

    // You could also send error to a logging service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Something went wrong
                </h2>
                
                <p className="text-sm text-gray-600 mb-6">
                  We apologize for the inconvenience. An unexpected error occurred.
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-left mb-6">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer mb-2">
                      Error Details (Development Only)
                    </summary>
                    <div className="bg-gray-100 p-3 rounded text-xs text-gray-800 overflow-auto max-h-32">
                      <div className="font-medium mb-1">Error:</div>
                      <div className="mb-3">{this.state.error.message}</div>
                      
                      {this.state.error.stack && (
                        <>
                          <div className="font-medium mb-1">Stack Trace:</div>
                          <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                        </>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  >
                    Try Again
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  >
                    Reload Page
                  </button>
                </div>

                <div className="mt-6 text-xs text-gray-500">
                  Error ID: {Date.now().toString(36)}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary; 
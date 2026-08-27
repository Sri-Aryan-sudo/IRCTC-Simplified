/**
 * Minimal global error boundary — see spec/05-technical-spec.md §9,
 * §18: technical errors must never leak raw stack traces into the
 * UI. Deliberately simple: one class component (the only way to
 * catch render errors in React), no retry/reporting framework.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Technical detail stays in the console, never rendered to the user.
    console.error('Unhandled UI error:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center text-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-gray-500">Please refresh the page and try again.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

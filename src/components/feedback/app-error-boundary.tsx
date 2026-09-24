'use client';

// src/components/feedback/app-error-boundary.tsx
//
// The last line of defense (section 39): whatever throws — an ApiError a
// query didn't catch, a rendering bug, anything — the user sees the same
// calm ServerUnavailable panel, never a stack trace or the Next.js overlay.
// Logging still happens to the console for developers.

import { Component, type ReactNode } from 'react';
import { ServerUnavailable } from './server-unavailable';
import { ApiError } from '@/lib/api/client';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('Unhandled application error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const variant = this.state.error instanceof ApiError && this.state.error.kind === 'network' ? 'network' : 'server';
      return <ServerUnavailable variant={variant} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

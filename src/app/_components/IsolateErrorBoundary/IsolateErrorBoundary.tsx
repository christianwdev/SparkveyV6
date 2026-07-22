'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@utils/reportError';

type IsolateErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  source?: string;
};

type IsolateErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Keeps a local subtree failure from blanking the whole page route
 * (useful for chrome like Footer during HMR / partial refresh).
 */
export default class IsolateErrorBoundary extends Component<
  IsolateErrorBoundaryProps,
  IsolateErrorBoundaryState
> {
  state: IsolateErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): IsolateErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    reportError(error, {
      source: this.props.source ?? 'isolate-boundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}

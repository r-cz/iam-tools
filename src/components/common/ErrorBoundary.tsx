import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta?.env?.DEV) {
      console.error('ErrorBoundary caught error:', error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h1 className="text-xl font-semibold">Something went wrong.</h1>
          <p className="text-sm text-muted-foreground mt-2">Try reloading the page.</p>
          {this.state.error?.message && (
            <p className="text-xs text-muted-foreground mt-4">{this.state.error.message}</p>
          )}
          {this.state.error?.stack && (
            <pre className="mt-2 text-[10px] text-muted-foreground/80 whitespace-pre-wrap">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

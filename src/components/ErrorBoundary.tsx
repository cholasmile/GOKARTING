import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Deuce OS ErrorBoundary] Uncaught error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleHardReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Error during hard reset:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0A0A0A',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '650px',
            width: '100%',
            backgroundColor: '#141414',
            border: '1px solid #FF3B30',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 10px 40px rgba(255, 59, 48, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#FF4D4D' }}>
                  Deuce OS - Application Encountered an Error
                </h1>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
                  A runtime exception interrupted the rendering cycle.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#0A0A0A',
              border: '1px solid #262626',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              fontFamily: 'monospace',
              color: '#FCA5A5',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.error?.toString() || 'Unknown Error'}
            </div>

            {this.state.errorInfo && (
              <details style={{ marginBottom: '20px', fontSize: '12px', color: '#94A3B8' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px', color: '#38BDF8' }}>
                  View Component Stack Details
                </summary>
                <pre style={{
                  backgroundColor: '#0A0A0A',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #1C1C1C',
                  overflowX: 'auto',
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#00ABAB',
                  color: '#000000',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Reload App
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#262626',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Go to Home
              </button>
              <button
                onClick={this.handleHardReset}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#F87171',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Clear Cache &amp; Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

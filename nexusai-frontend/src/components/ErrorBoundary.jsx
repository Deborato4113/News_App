import { Component } from 'react';

// Catches render-time errors anywhere below it in the tree so a bug in
// one page doesn't take down the whole app with a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Swap this for a real error-tracking call (Sentry, etc.) in production.
    console.error('Unhandled UI error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1rem', padding: '2rem',
        }}>
          <h2>Something went wrong.</h2>
          <p>An unexpected error occurred. Try reloading the page.</p>
          <button onClick={this.handleReload}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

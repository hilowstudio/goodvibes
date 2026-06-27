import * as React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto mt-24 max-w-sm text-center">
          <h1 className="mb-2 font-serif text-xl">Something went wrong</h1>
          <p className="text-secondary">Reload the page to try again.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

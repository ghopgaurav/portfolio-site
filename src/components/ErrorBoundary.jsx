import { Component } from "react";

/**
 * Isolates a feature subtree. If anything inside throws during render, the
 * rest of the app keeps working and an optional quiet fallback is shown.
 * This is the backbone of "a new feature can't take the whole site down".
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep a breadcrumb in the console; swap for a real logger later.
    console.error(`[ErrorBoundary:${this.props.name || "unknown"}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

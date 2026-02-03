import React, { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">!</div>
            <h2 className="error-boundary-title">哎呀，出了点问题</h2>
            <p className="error-boundary-desc">
              大师兄遇到了一个意外错误，但别担心，你的数据都还在。
            </p>
            <div className="error-boundary-actions">
              <button className="error-boundary-btn primary" onClick={this.handleReload}>
                <RefreshCw size={14} />
                重新加载
              </button>
              <button className="error-boundary-btn secondary" onClick={this.handleDismiss}>
                尝试恢复
              </button>
            </div>
            <details className="error-boundary-details">
              <summary>错误详情</summary>
              <pre>{this.state.error?.message}\n{this.state.error?.stack}</pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

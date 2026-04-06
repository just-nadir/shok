import React, { Component, type ReactNode } from 'react';
import { ApiError } from '../services/api';

// Maps ApiError status codes to Uzbek user-friendly messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        return 'QR kod yaroqsiz yoki topilmadi';
      case 403:
        return 'Bu haydovchi hozirda baholanmaydi';
      case 429:
        return 'Siz bu haydovchini bugun allaqachon baholagansiz';
      case 500:
        return 'Xatolik yuz berdi. Keyinroq urinib ko\'ring';
      case 410:
        return 'Tasdiqlash kodi muddati o\'tdi. Qayta so\'rang';
      case 423:
        return 'Juda ko\'p urinish. 15 daqiqadan so\'ng urinib ko\'ring';
      default:
        return 'Xatolik yuz berdi. Keyinroq urinib ko\'ring';
    }
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Oflayn rejim. Baholash saqlandi va keyinroq yuboriladi';
  }

  return 'Xatolik yuz berdi. Keyinroq urinib ko\'ring';
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Xatolik yuz berdi
            </h2>
            <p className="text-gray-600 mb-6">
              Xatolik yuz berdi. Keyinroq urinib ko&apos;ring
            </p>
            <button
              onClick={this.handleRetry}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Qayta urinish
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

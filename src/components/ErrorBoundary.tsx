import React from 'react';

/** يمنع انهيار خطأ غير متوقع من إفراغ الصفحة: يعرض رسالة وزر إعادة تحميل. المشاريع محفوظة تلقائياً. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('خطأ غير متوقع في الواجهة', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="grid min-h-dvh place-items-center bg-paper p-6 text-center text-ink">
        <div className="max-w-sm space-y-4">
          <h1 className="text-lg">حدث خطأ غير متوقع</h1>
          <p className="text-sm leading-7 text-ink-soft">مشاريعك محفوظة تلقائياً ولم تضع. أعد تحميل الصفحة للمتابعة.</p>
          <button type="button" className="rounded-full bg-ink px-5 py-2 text-sm text-paper" onClick={() => window.location.reload()}>
            إعادة التحميل
          </button>
        </div>
      </div>
    );
  }
}

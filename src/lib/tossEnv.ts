/** 토스 앱(WebView) 안인지. 브라우저 둘러보기 분기에 사용. */
export function isInTossApp(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView != null
  );
}

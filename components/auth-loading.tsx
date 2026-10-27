/** Shared loading shell for auth — CSS-only spinner to avoid icon hydration issues. */
export function AuthLoading() {
  return (
    <div
      className="flex min-h-svh items-center justify-center"
      suppressHydrationWarning
    >
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

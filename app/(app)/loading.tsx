export default function WorkspaceLoading() {
  return (
    <main
      id="workspace-content"
      aria-busy="true"
      aria-label="Loading page"
      className="min-h-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
    >
      <span className="sr-only">Loading workspace page</span>
      <div className="mx-auto max-w-[1600px] space-y-6 motion-safe:animate-pulse">
        <div className="space-y-3 py-2">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="h-8 w-52 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl border bg-card" />
          ))}
        </div>
        <div className="space-y-5 rounded-2xl border bg-card p-5">
          <div className="h-10 w-1/3 rounded-xl bg-muted" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/60" />
          ))}
        </div>
      </div>
    </main>
  );
}

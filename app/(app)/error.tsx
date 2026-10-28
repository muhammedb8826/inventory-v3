"use client";
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon } from 'lucide-react';
export default function WorkspaceError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error && typeof error === 'object' && 'digest' in error ? String(error.digest) : undefined;
  return <main className="flex min-h-[70vh] items-center justify-center p-8"><div role="alert" className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"><AlertTriangleIcon className="mx-auto mb-4 size-10 text-destructive" /><h1 className="text-xl font-semibold">This page could not load</h1><p className="my-3 text-sm text-muted-foreground">Try loading the page again. If you were posting a transaction, check its status before submitting again.</p>{digest && <p className="mb-4 font-mono text-xs text-muted-foreground">Reference: {digest}</p>}<Button onClick={retry}>Try again</Button></div></main>;
}

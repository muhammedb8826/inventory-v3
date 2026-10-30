"use client";
import { useEffect, useRef, useState } from "react";
import { UploadIcon, FileIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { InquiryAttachment } from "@/lib/types";
import { errorMessage } from "@/lib/format";
import { toast } from "sonner";
export function InquiryAttachments({
  files,
  attachments,
  inquiryId,
  onFilesChange,
  onAttachmentsChange,
  idPrefix,
}: {
  files: File[];
  attachments: InquiryAttachment[];
  inquiryId?: string;
  onFilesChange: (files: File[]) => void;
  onAttachmentsChange: (files: InquiryAttachment[]) => void;
  idPrefix: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const input = inputRef.current;
    const restoreFocus = () =>
      pickerRef.current?.focus({ preventScroll: true });
    input?.addEventListener("cancel", restoreFocus);
    return () => input?.removeEventListener("cancel", restoreFocus);
  }, []);
  function add(incoming: File[]) {
    if (files.length + attachments.length + incoming.length > 5)
      return void toast.error("Choose up to 5 attachments per inquiry.");
    if (
      incoming.some(
        (f) =>
          !f.size ||
          f.size > 5 * 1024 * 1024 ||
          !/\.(pdf|png|jpe?g|gif|webp)$/i.test(f.name),
      )
    )
      return void toast.error(
        "Use PDF, PNG, JPEG, GIF or WebP files, up to 5 MB each.",
      );
    onFilesChange([...files, ...incoming]);
  }
  async function remove(file: InquiryAttachment) {
    if (!inquiryId) return;
    setBusy(file.id);
    try {
      await api(`/inquiries/${inquiryId}/attachments/${file.id}`, {
        method: "DELETE",
      });
      onAttachmentsChange(attachments.filter((a) => a.id !== file.id));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Reference attachments</p>
      <div
        className="relative rounded-xl border border-dashed bg-muted/10 p-4 focus-within:ring-2 focus-within:ring-primary"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          id={`${idPrefix}-files`}
          aria-label="Reference attachments"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
          hidden
          onChange={(e) => {
            add(Array.from(e.target.files ?? []));
            e.target.value = "";
            pickerRef.current?.focus({ preventScroll: true });
          }}
        />
        <button
          ref={pickerRef}
          type="button"
          aria-controls={`${idPrefix}-files`}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg text-center text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <UploadIcon className="size-5" />
          Choose files or drag and drop
          <span className="text-xs text-muted-foreground">
            PDF or images. Up to 5 files, 5 MB each.
          </span>
        </button>
      </div>
      <ul className="space-y-2">
        {attachments.map((file) => (
          <li
            key={file.id}
            className="flex min-w-0 items-center gap-2 rounded-lg border p-2"
          >
            <FileIcon className="size-4 shrink-0" />
            <a
              className="min-w-0 flex-1 break-all text-sm text-primary underline"
              href={`/api/backend/inquiries/${inquiryId}/attachments/${file.id}`}
              download={file.name}
            >
              {file.name}
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy === file.id}
              aria-label={`Remove attachment ${file.name}`}
              onClick={() => void remove(file)}
            >
              <XIcon className="size-4" />
            </Button>
          </li>
        ))}
        {files.map((file, i) => (
          <li
            key={`${file.name}-${i}`}
            className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/10 p-2"
          >
            <FileIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 break-all text-sm">
              {file.name}
              <span className="ml-2 text-xs text-muted-foreground">
                Ready to upload
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove pending attachment ${file.name}`}
              onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
            >
              <XIcon className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

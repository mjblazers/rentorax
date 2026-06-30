import React, { useState, useRef } from "react";
import { api, formatApiError } from "@/lib/api";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Cloudinary file uploader with drag-and-drop, preview, progress.
 * Props:
 *  - folder: cloudinary folder ("properties", "tenants/passport", etc.)
 *  - accept: comma-separated mime (default "image/*")
 *  - multiple: allow multiple uploads
 *  - value: existing URLs array (or string for single)
 *  - onChange: (urls: string[] | string) => void
 *  - maxFiles: default 5
 *  - label: button label
 */
export default function FileUpload({
  folder = "misc",
  accept = "image/*",
  multiple = false,
  value,
  onChange,
  maxFiles = 5,
  label,
  testId,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const urls = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);

  const doUpload = async (files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    if (multiple && urls.length + arr.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files`);
      return;
    }
    setBusy(true); setProgress(0);
    const uploaded = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", folder);
        const { data } = await api.post("/uploads/file", form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 50;
            setProgress(Math.round(((i + pct / 100) / arr.length) * 100));
          },
        });
        uploaded.push(data.secure_url);
      } catch (e) {
        toast.error(formatApiError(e.response?.data?.detail) || e.message);
      }
    }
    if (uploaded.length > 0) {
      if (multiple) onChange([...urls, ...uploaded].slice(0, maxFiles));
      else onChange(uploaded[0]);
    }
    setBusy(false); setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx) => {
    if (multiple) onChange(urls.filter((_, i) => i !== idx));
    else onChange("");
  };

  const isImg = (url) => /\.(png|jpe?g|webp|gif|heic|heif)(\?|$)/i.test(url);

  return (
    <div className="space-y-2" data-testid={testId}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files); }}
        className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => doUpload(e.target.files)}
        />
        {busy ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading… {progress}%
          </div>
        ) : (
          <div className="text-sm text-muted-foreground flex flex-col items-center gap-1">
            <Upload className="h-5 w-5" />
            <div className="font-medium text-foreground">{label || "Drop a file or click to browse"}</div>
            <div className="text-xs">{accept.includes("image") ? "PNG, JPG, WebP up to 8MB" : "PDF, DOC, images up to 8MB"}</div>
          </div>
        )}
      </div>

      {urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {urls.map((url, i) => (
            <div key={url + i} className="relative group rounded-md border border-border overflow-hidden bg-muted/30">
              {isImg(url) ? (
                <img src={url} alt="" className="w-full aspect-video object-cover" />
              ) : (
                <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 text-sm">
                  <FileText className="h-4 w-4" /> View document
                </a>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                data-testid={`upload-remove-${i}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

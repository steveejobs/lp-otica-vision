"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./admin.module.css";

export function FilePreviewInput({
  disabled = false,
  id,
  multiple = false,
  name = "file",
  onFilesChange,
  required = false,
}: {
  disabled?: boolean;
  id: string;
  multiple?: boolean;
  name?: string;
  onFilesChange?: (files: File[]) => void;
  required?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  return (
    <div className={styles.filePicker}>
      <input
        accept="image/avif,image/jpeg,image/png,image/webp"
        disabled={disabled}
        id={id}
        multiple={multiple}
        name={name}
        onChange={(event) => {
          const selectedFiles = Array.from(event.currentTarget.files ?? []);
          setFiles(selectedFiles);
          onFilesChange?.(selectedFiles);
        }}
        required={required}
        type="file"
      />
      {previews.length ? (
        <div aria-label="Pré-visualização dos arquivos" className={styles.previewGrid}>
          {previews.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- local object URLs are not Next assets.
            <img alt={`Prévia ${index + 1}`} key={url} src={url} />
          ))}
        </div>
      ) : (
        <p>JPEG, PNG, WebP ou AVIF · até 8 MB por arquivo.</p>
      )}
    </div>
  );
}

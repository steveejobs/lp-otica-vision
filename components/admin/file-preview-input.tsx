"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./admin.module.css";

export function FilePreviewInput({
  id,
  multiple = false,
  name = "file",
  required = false,
}: {
  id: string;
  multiple?: boolean;
  name?: string;
  required?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  return (
    <div className={styles.filePicker}>
      <input
        accept="image/avif,image/jpeg,image/png,image/webp"
        id={id}
        multiple={multiple}
        name={name}
        onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))}
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


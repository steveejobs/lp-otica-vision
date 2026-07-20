"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FilePreviewInput } from "./file-preview-input";
import styles from "./admin.module.css";
import { productImageSelectionError, uploadProductImages } from "./product-image-upload-client";

export function ProductImageUploader({
  imageId,
  productId,
}: {
  imageId?: string;
  productId: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const replacing = Boolean(imageId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    const validationError = productImageSelectionError(files, replacing);
    if (validationError) { setMessage(validationError); return; }
    setPending(true);
    const result = await uploadProductImages({ files, imageId, onProgress: setMessage, productId });
    if (result.ok) {
      setMessage("Imagens processadas com sucesso.");
      setPending(false);
      setFiles([]);
      form.reset();
      router.refresh();
    } else {
      setMessage(result.error);
      setPending(false);
    }
  }

  return (
    <form className={styles.adminForm} onSubmit={submit}>
      {!replacing ? (
        <div className={styles.formGrid}>
          <input name="object_position" type="hidden" value="50% 50%" />
          <div className={styles.fieldWide}>
            <FilePreviewInput
              disabled={pending}
              id={`product-images-${productId}`}
              multiple
              name="files"
              onFilesChange={setFiles}
              required
            />
          </div>
        </div>
      ) : (
        <FilePreviewInput
          disabled={pending}
          id={`replace-${imageId}`}
          name="file"
          onFilesChange={setFiles}
          required
        />
      )}
      {message ? (
        <p className={message.includes("Não foi possível") ? styles.formError : styles.fieldHint} role="status">
          {message}
        </p>
      ) : null}
      <button
        className={replacing ? styles.secondaryButton : styles.primaryButton}
        disabled={pending}
        type="submit"
      >
        {pending ? (replacing ? "Substituindo..." : "Adicionando imagens...") : (replacing ? "Substituir imagem" : "Adicionar imagens")}
      </button>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";

import {
  createProductImageUploadTokensAction,
  discardProductImageUploadsAction,
  finalizeProductImageReplacementAction,
  finalizeProductImageUploadsAction,
} from "@/app/admin/(protected)/produtos/actions";
import {
  isProductImageUploadMime,
  PRODUCT_IMAGE_UPLOAD_MAX_BYTES,
  PRODUCT_IMAGE_UPLOAD_MAX_FILES,
} from "@/lib/catalog/image-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { FilePreviewInput } from "./file-preview-input";
import styles from "./admin.module.css";

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
  const replacing = Boolean(imageId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    if (
      !files.length ||
      files.length > (replacing ? 1 : PRODUCT_IMAGE_UPLOAD_MAX_FILES) ||
      files.some(
        (file) =>
          !isProductImageUploadMime(file.type) ||
          file.size < 1 ||
          file.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES,
      )
    ) {
      setMessage("Selecione imagens JPEG, PNG, WebP ou AVIF de até 8 MB cada.");
      return;
    }

    const formData = new FormData(form);
    const altBase = String(formData.get("alt_base") ?? "");
    const objectPosition = String(formData.get("object_position") ?? "50% 50%");
    let uploadIds: string[] = [];
    setPending(true);
    setMessage("Preparando envio seguro...");
    try {
      const tokenResult = await createProductImageUploadTokensAction({
        files: files.map((file) => ({ mimeType: file.type, sizeBytes: file.size })),
        productId,
      });
      if (!tokenResult.ok || !tokenResult.uploads || tokenResult.uploads.length !== files.length) {
        throw new Error("token");
      }
      uploadIds = tokenResult.uploads.map((upload) => upload.id);
      const supabase = createSupabaseBrowserClient();
      for (const [index, upload] of tokenResult.uploads.entries()) {
        setMessage(`Enviando imagem ${index + 1} de ${files.length}...`);
        const { error } = await supabase.storage
          .from("catalog-products")
          .uploadToSignedUrl(upload.path, upload.token, files[index], {
            cacheControl: "3600",
            contentType: files[index].type,
            upsert: false,
          });
        if (error) throw error;
      }

      setMessage(replacing ? "Gerando novamente os derivados..." : "Gerando derivados otimizados...");
      const finalResult = replacing && imageId
        ? await finalizeProductImageReplacementAction({ imageId, productId, uploadId: uploadIds[0] })
        : await finalizeProductImageUploadsAction({ altBase, objectPosition, productId, uploadIds });
      if (!finalResult.ok) throw new Error(finalResult.error);

      setMessage("Imagens processadas com sucesso.");
      setPending(false);
      window.location.assign(`/admin/produtos/${productId}?status=uploaded`);
    } catch {
      if (uploadIds.length) {
        await discardProductImageUploadsAction({ uploadIds });
      }
      setMessage("Não foi possível validar e processar as imagens. Revise os arquivos e tente novamente.");
      setPending(false);
    }
  }

  return (
    <form className={styles.adminForm} onSubmit={submit}>
      {!replacing ? (
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Texto alternativo base</span>
            <input disabled={pending} maxLength={170} name="alt_base" required />
          </label>
          <label className={styles.field}>
            <span>Object-position</span>
            <input
              defaultValue="50% 50%"
              disabled={pending}
              maxLength={40}
              name="object_position"
              pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)"
              required
            />
          </label>
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
        {pending ? (replacing ? "Substituindo..." : "Processando imagens...") : (replacing ? "Substituir arquivo" : "Enviar imagens")}
      </button>
    </form>
  );
}

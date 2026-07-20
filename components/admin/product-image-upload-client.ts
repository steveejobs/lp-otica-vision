"use client";

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

export function productImageSelectionError(files: File[], replacing = false) {
  if (!files.length) return "Selecione pelo menos uma imagem.";
  if (files.length > (replacing ? 1 : PRODUCT_IMAGE_UPLOAD_MAX_FILES)) {
    return replacing ? "Selecione apenas uma imagem para substituir." : `Selecione no máximo ${PRODUCT_IMAGE_UPLOAD_MAX_FILES} imagens.`;
  }
  if (files.some((file) => !isProductImageUploadMime(file.type) || file.size < 1 || file.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES)) {
    return "Use imagens JPEG, PNG, WebP ou AVIF de até 8 MB cada.";
  }
  return null;
}

export async function uploadProductImages({
  files,
  imageId,
  onProgress,
  productId,
}: {
  files: File[];
  imageId?: string;
  onProgress?: (message: string) => void;
  productId: string;
}) {
  const validationError = productImageSelectionError(files, Boolean(imageId));
  if (validationError) return { error: validationError, ok: false } as const;

  let uploadIds: string[] = [];
  try {
    onProgress?.("Preparando envio seguro...");
    const tokenResult = await createProductImageUploadTokensAction({
      files: files.map((file) => ({ mimeType: file.type, sizeBytes: file.size })),
      productId,
    });
    if (!tokenResult.ok || !tokenResult.uploads || tokenResult.uploads.length !== files.length) throw new Error("token");

    uploadIds = tokenResult.uploads.map((upload) => upload.id);
    const supabase = createSupabaseBrowserClient();
    for (const [index, upload] of tokenResult.uploads.entries()) {
      onProgress?.(`Enviando imagem ${index + 1} de ${files.length}...`);
      const { error } = await supabase.storage
        .from("catalog-products")
        .uploadToSignedUrl(upload.path, upload.token, files[index], {
          cacheControl: "3600",
          contentType: files[index].type,
          upsert: false,
        });
      if (error) throw error;
    }

    onProgress?.(imageId ? "Gerando novamente os formatos da imagem..." : "Preparando as imagens para celular e computador...");
    const finalResult = imageId
      ? await finalizeProductImageReplacementAction({ imageId, productId, uploadId: uploadIds[0] })
      : await finalizeProductImageUploadsAction({ objectPosition: "50% 50%", productId, uploadIds });
    if (!finalResult.ok) throw new Error(finalResult.error);
    return { ok: true } as const;
  } catch {
    if (uploadIds.length) await discardProductImageUploadsAction({ uploadIds });
    return { error: "Não foi possível validar e processar as imagens. Revise os arquivos e tente novamente.", ok: false } as const;
  }
}

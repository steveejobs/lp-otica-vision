"use client";

async function save(body: Record<string, unknown>) {
  try {
    const result = await fetch("/api/admin/product-media", {
      body: JSON.stringify(body),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return result.ok;
  } catch {
    return false;
  }
}

export function saveProductCover(imageId: string, productId: string) {
  return save({ action: "cover", imageId, productId });
}

export function saveProductImageOrder(orderedIds: string[], productId: string) {
  return save({ action: "order", orderedIds, productId });
}

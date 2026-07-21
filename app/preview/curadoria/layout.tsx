import type { ReactNode } from "react";

import { OpticalPreviewMotionScope } from "@/components/curation/optical-bench-prototype";

export default function CurationPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OpticalPreviewMotionScope />
      {children}
    </>
  );
}

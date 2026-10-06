import { useEffect, useState, type ReactNode } from "react";
import { openPdf, renderPage } from "./engine";
import { friendlyError, LIMITS } from "./config";
export default function PdfPreview({
  blob,
  page,
  children,
  onReady,
}: {
  blob: Blob;
  page: number;
  children?: ReactNode;
  onReady?: (ready: boolean) => void;
}) {
  const [view, setView] = useState<{
      url: string;
      blob: Blob;
      page: number;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true,
      url = "";
    onReady?.(false);
    setError("");
    (async () => {
      const doc = await openPdf(
        new File([blob], "vista.pdf", { type: "application/pdf" }),
      );
      try {
        if (!live) return;
        const rendered = await renderPage(
          doc,
          page,
          LIMITS.renderSide,
          "image/png",
          true,
        );
        if (live) {
          url = URL.createObjectURL(rendered);
          setView({ url, blob, page });
          onReady?.(true);
        }
      } finally {
        await doc.loadingTask.destroy();
      }
    })().catch((e) => {
      if (live) setError(friendlyError(e));
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blob, page, onReady]);
  const current = view?.blob === blob && view.page === page;
  return (
    <div className="preview-shell" aria-busy={!current && !error}>
      {error ? (
        <p role="alert">{error}</p>
      ) : !current ? (
        <p role="status">Preparando vista previa…</p>
      ) : (
        <div className="pdf-stage">
          <img
            src={view.url}
            alt={`Vista previa del PDF final, página ${page + 1}`}
            draggable={false}
          />
          {children}
        </div>
      )}
    </div>
  );
}

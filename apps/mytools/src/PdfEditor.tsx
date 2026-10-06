import { useEffect, useRef, useState, type PointerEvent } from "react";
import { friendlyError, LIMITS, type Tool } from "./config";
import {
  compose,
  inspectEditor,
  signatureImage,
  EDIT_LIMITS,
  type Block,
  type Geometry,
} from "./documentEngine";
import PdfPreview from "./PdfPreview";
import { Icon } from "./Icon";
function SignaturePad({
  onUse,
}: {
  onUse: (image: string, ratio: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    drawing = useRef<number | null>(null),
    [ink, setInk] = useState(false);
  function mark(e: PointerEvent<HTMLCanvasElement>, start = false) {
    if (!start && drawing.current !== e.pointerId) return;
    const c = e.currentTarget,
      r = c.getBoundingClientRect(),
      ctx = c.getContext("2d")!;
    const x = ((e.clientX - r.left) * c.width) / r.width,
      y = ((e.clientY - r.top) * c.height) / r.height;
    ctx.strokeStyle = "#172d28";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (start) {
      drawing.current = e.pointerId;
      c.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.1, y + 0.1);
    } else ctx.lineTo(x, y);
    ctx.stroke();
    setInk(true);
  }
  return (
    <div className="signature-pad">
      <label>Dibuja tu firma con el dedo o el ratón</label>
      <canvas
        ref={ref}
        width={800}
        height={280}
        aria-label="Lienzo para dibujar firma"
        onPointerDown={(e) => mark(e, true)}
        onPointerMove={(e) => mark(e)}
        onPointerUp={() => {
          drawing.current = null;
        }}
        onPointerCancel={() => {
          drawing.current = null;
        }}
      />
      <div className="editor-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            ref.current!.getContext("2d")!.clearRect(0, 0, 800, 280);
            setInk(false);
          }}
        >
          Limpiar firma
        </button>
        <button
          type="button"
          className="primary"
          disabled={!ink}
          onClick={() => onUse(ref.current!.toDataURL("image/png"), 800 / 280)}
        >
          Usar firma
        </button>
      </div>
      <p className="small">
        También puedes cargar una imagen PNG o JPG. Los PNG conservan la
        transparencia.
      </p>
    </div>
  );
}
export default function PdfEditor({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null),
    [geometry, setGeometry] = useState<Geometry[]>([]),
    [blocks, setBlocks] = useState<Block[]>([]),
    [selected, setSelected] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [loadBusy, setLoadBusy] = useState(false),
    [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{
      value: Awaited<ReturnType<typeof compose>>;
      blocks: Block[];
      file: File;
    } | null>(null),
    [url, setUrl] = useState(""),
    [ready, setReady] = useState(false);
  const alive = useRef(true),
    loadId = useRef(0),
    drag = useRef<{
      pointer: number;
      x: number;
      y: number;
      left: number;
      top: number;
      scaleX: number;
      scaleY: number;
      id: string;
      height: number;
      width: number;
    } | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      loadId.current++;
    };
  }, []);
  useEffect(() => {
    if (!file || dragging) return;
    let live = true;
    const timer = setTimeout(() => {
      compose(file, geometry, blocks)
        .then((value) => {
          if (live) {
            setResult({ value, blocks, file });
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(friendlyError(e));
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [file, geometry, blocks, dragging]);
  useEffect(() => {
    if (!result) return;
    const u = URL.createObjectURL(result.value.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [result]);
  const current =
    !!result &&
    result.file === file &&
    result.blocks === blocks &&
    !loadBusy &&
    !dragging;
  const active = blocks.find((b) => b.id === selected),
    g = geometry[page];
  function update(patch: Partial<Block>) {
    setBlocks((bs) =>
      bs.map((b) => (b.id === selected ? { ...b, ...patch } : b)),
    );
    setError("");
  }
  function add(kind: Block["kind"], image = "", ratio = 1) {
    if (!g) return;
    if (blocks.length >= EDIT_LIMITS.blocks) {
      setError(`Máximo ${EDIT_LIMITS.blocks} bloques por documento.`);
      return;
    }
    if (
      kind === "image" &&
      (blocks.filter((b) => b.kind === "image").length >= LIMITS.files ||
        blocks.reduce(
          (total, b) => total + b.image.length * 0.75,
          file?.size || 0,
        ) +
          image.length * 0.75 >
          LIMITS.totalBytes)
    ) {
      setError(
        `Máximo ${LIMITS.files} firmas y ${LIMITS.totalBytes / 1024 ** 2} MB en total, incluyendo el PDF y las imágenes preparadas.`,
      );
      return;
    }
    const id = crypto.randomUUID(),
      width =
        kind === "image"
          ? Math.min(g.width * 0.38, g.height * 0.3 * ratio)
          : g.width * 0.65;
    setBlocks((bs) => [
      ...bs,
      {
        id,
        page,
        kind,
        image,
        ratio,
        text: kind === "text" ? "Escribe aquí" : "",
        x: g.width * 0.1,
        y: g.height * 0.15,
        width,
        size: Math.min(16, g.height / 5),
        color: "#203b35",
      },
    ]);
    setSelected(id);
    setError("");
  }
  async function load(f?: File) {
    if (!f) return;
    const id = ++loadId.current;
    setLoadBusy(true);
    setError("");
    setFile(null);
    setBlocks([]);
    setResult(null);
    setSelected("");
    try {
      const gs = await inspectEditor(f);
      if (alive.current && id === loadId.current) {
        setGeometry(gs);
        setPage(0);
        setFile(f);
      }
    } catch (e) {
      if (alive.current && id === loadId.current) setError(friendlyError(e));
    } finally {
      if (alive.current && id === loadId.current) setLoadBusy(false);
    }
  }
  function start(e: PointerEvent<HTMLButtonElement>, b: Block) {
    const r = e.currentTarget.parentElement!.getBoundingClientRect(),
      bounds = result?.value.bounds.find((v) => v.id === b.id);
    if (!bounds) return;
    setSelected(b.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: bounds.x,
      top: bounds.y,
      scaleX: g.width / r.width,
      scaleY: g.height / r.height,
      id: b.id,
      height: bounds.height,
      width: bounds.width,
    };
    setDragging(true);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === d.id
          ? {
              ...b,
              x: Math.max(
                0,
                Math.min(
                  g.width - d.width,
                  d.left + (e.clientX - d.x) * d.scaleX,
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  g.height - d.height,
                  d.top + (e.clientY - d.y) * d.scaleY,
                ),
              ),
            }
          : b,
      ),
    );
  }
  function end() {
    drag.current = null;
    setDragging(false);
  }
  return (
    <div className="shell workspace document-workspace">
      <a className="back-link" href="#/">
        <Icon name="back" size={18} />
        Todas las herramientas
      </a>
      <div className="workspace-title tone-Editar">
        <span className="tool-icon">
          <Icon name={tool.icon} />
        </span>
        <div>
          <span className="eyebrow">PDF · EN TU DISPOSITIVO</span>
          <h1>{tool.name}</h1>
          <p>{tool.hint}</p>
        </div>
      </div>
      <p className="editor-intro">
        Selecciona un PDF, coloca{" "}
        {tool.id === "sign" ? "tu firma" : "los bloques"} y revisa el resultado.
        Datos solo en memoria; se descartan al salir de la herramienta o
        reiniciar.
      </p>
      <label className="file-picker">
        Seleccionar PDF
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={loadBusy}
          onChange={(e) => {
            void load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p className="small">
        Un PDF · máximo {LIMITS.fileBytes / 1024 ** 2} MB y {LIMITS.pages}{" "}
        páginas. PDFs con formularios o firmas digitales no compatibles.
      </p>
      {error && (
        <p className="error-panel" role="alert">
          {error}
        </p>
      )}
      {loadBusy && <p role="status">Comprobando el documento…</p>}
      {file && g && (
        <div className="document-grid">
          <section
            className="editor-controls"
            aria-label="Controles del editor"
          >
            <h2>{tool.id === "sign" ? "Tu firma" : "Tus textos"}</h2>
            <button
              className="secondary mobile-jump"
              onClick={() =>
                document
                  .querySelector(".editor-preview")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Ver página
            </button>
            {tool.id === "sign" ? (
              <>
                <SignaturePad
                  onUse={(image, ratio) => add("image", image, ratio)}
                />
                <label className="file-picker">
                  Cargar imagen de firma
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      const id = loadId.current;
                      try {
                        const s = await signatureImage(f);
                        if (alive.current && id === loadId.current)
                          add("image", s.image, s.ratio);
                      } catch (err) {
                        if (alive.current) setError(friendlyError(err));
                      }
                    }}
                  />
                </label>
              </>
            ) : (
              <button className="primary" onClick={() => add("text")}>
                Añadir bloque de texto
              </button>
            )}
            <label>
              Página que estás viendo
              <select
                value={page}
                onChange={(e) => {
                  setPage(Number(e.target.value));
                  setSelected("");
                }}
              >
                {geometry.map((_, i) => (
                  <option key={i} value={i}>
                    Página {i + 1}
                  </option>
                ))}
              </select>
            </label>
            {blocks.length > 0 && (
              <label>
                Seleccionar bloque
                <select
                  value={selected}
                  onChange={(e) => {
                    const b = blocks.find((v) => v.id === e.target.value);
                    setSelected(e.target.value);
                    if (b) setPage(b.page);
                  }}
                >
                  <option value="">Elige un bloque</option>
                  {blocks.map((b, i) => (
                    <option key={b.id} value={b.id}>
                      {b.kind === "image" ? "Firma" : "Texto"} {i + 1} · página{" "}
                      {b.page + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {active && (
              <fieldset className="block-controls">
                <legend>
                  Editar {active.kind === "image" ? "firma" : "texto"}
                </legend>
                {active.kind === "text" && (
                  <>
                    <label>
                      Texto del bloque
                      <textarea
                        maxLength={EDIT_LIMITS.blockChars}
                        rows={4}
                        value={active.text}
                        onChange={(e) => update({ text: e.target.value })}
                      />
                    </label>
                    <div className="control-pair">
                      <label>
                        Tamaño (pt)
                        <input
                          type="number"
                          min={6}
                          max={72}
                          value={active.size}
                          onChange={(e) =>
                            update({ size: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Color
                        <input
                          type="color"
                          value={active.color}
                          onChange={(e) => update({ color: e.target.value })}
                        />
                      </label>
                    </div>
                  </>
                )}
                <label>
                  Ancho (%)
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={(active.width / g.width) * 100}
                    onChange={(e) =>
                      update({
                        width: (Number(e.target.value) * g.width) / 100,
                      })
                    }
                  />
                </label>
                <div className="control-pair">
                  <label>
                    Horizontal (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((active.x / g.width) * 100)}
                      onChange={(e) =>
                        update({ x: (Number(e.target.value) * g.width) / 100 })
                      }
                    />
                  </label>
                  <label>
                    Vertical (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((active.y / g.height) * 100)}
                      onChange={(e) =>
                        update({ y: (Number(e.target.value) * g.height) / 100 })
                      }
                    />
                  </label>
                </div>
                <p className="small">
                  Arrastra el recuadro o usa estos controles. Con el recuadro
                  enfocado, las flechas lo mueven (Mayús: pasos mayores). La
                  posición se ajusta al borde para mantenerlo dentro de la
                  página.
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setBlocks((bs) => bs.filter((b) => b.id !== selected));
                    setSelected("");
                  }}
                >
                  Eliminar bloque
                </button>
              </fieldset>
            )}
            <div className="editor-actions">
              {current && ready && blocks.length > 0 && !error ? (
                <a className="primary" href={url} download={result!.value.name}>
                  {tool.action}
                </a>
              ) : (
                <button className="primary" disabled>
                  {blocks.length ? "Preparando PDF…" : tool.action}
                </button>
              )}
              <button
                className="secondary"
                onClick={() => {
                  loadId.current++;
                  setFile(null);
                  setBlocks([]);
                  setResult(null);
                  setGeometry([]);
                  setError("");
                }}
              >
                Reiniciar
              </button>
            </div>
            <p className="small">
              En iPhone: si se abre una vista, usa Compartir → Guardar en
              Archivos.
            </p>
          </section>
          <section className="editor-preview" aria-label="Vista previa">
            <h2>Así quedará tu PDF</h2>
            <button
              className="secondary mobile-jump"
              onClick={() =>
                document
                  .querySelector(".editor-controls")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Volver a los controles
            </button>
            <p className="small">
              Página {page + 1} de {geometry.length} ·{" "}
              {current
                ? "Vista del archivo descargable"
                : "Actualizando los cambios…"}
            </p>
            {result && (
              <PdfPreview
                blob={result.value.blob}
                page={page}
                onReady={setReady}
              >
                {blocks
                  .filter((b) => b.page === page)
                  .map((b, i) => {
                    const rect = result.value.bounds.find((v) => v.id === b.id);
                    if (!rect) return null;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className={`placement ${selected === b.id ? "selected" : ""}`}
                        aria-label={`${b.kind === "image" ? "Firma" : "Texto"} ${i + 1}: mover con flechas o arrastrar`}
                        style={{
                          left: `${((dragging ? b.x : rect.x) / g.width) * 100}%`,
                          top: `${((dragging ? b.y : rect.y) / g.height) * 100}%`,
                          width: `${(rect.width / g.width) * 100}%`,
                          height: `${(rect.height / g.height) * 100}%`,
                        }}
                        onClick={() => setSelected(b.id)}
                        onPointerDown={(e) => start(e, b)}
                        onPointerMove={move}
                        onPointerUp={end}
                        onPointerCancel={end}
                        onKeyDown={(e) => {
                          const delta = e.shiftKey ? 10 : 1;
                          const dx =
                              e.key === "ArrowLeft"
                                ? -delta
                                : e.key === "ArrowRight"
                                  ? delta
                                  : 0,
                            dy =
                              e.key === "ArrowUp"
                                ? -delta
                                : e.key === "ArrowDown"
                                  ? delta
                                  : 0;
                          if (dx || dy) {
                            e.preventDefault();
                            setSelected(b.id);
                            setBlocks((bs) =>
                              bs.map((v) =>
                                v.id === b.id
                                  ? {
                                      ...v,
                                      x: Math.max(
                                        0,
                                        Math.min(
                                          g.width - rect.width,
                                          rect.x + dx,
                                        ),
                                      ),
                                      y: Math.max(
                                        0,
                                        Math.min(
                                          g.height - rect.height,
                                          rect.y + dy,
                                        ),
                                      ),
                                    }
                                  : v,
                              ),
                            );
                          }
                        }}
                      />
                    );
                  })}
              </PdfPreview>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

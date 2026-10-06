import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  LIMITS,
  UserError,
  friendlyError,
  parseRange,
  validateFiles,
  type Tool,
} from "./config";
import { Icon } from "./Icon";
import type { FileItem, PageItem, Options, Output } from "./engine";
const initial: Options = {
  format: "jpg",
  layout: "a4",
  text: "CONFIDENCIAL",
  opacity: 0.25,
  crop: 8,
  start: 1,
  groups: "",
};
function move<T extends { id: string }>(items: T[], from: string, to: string) {
  const a = items.findIndex((i) => i.id === from),
    b = items.findIndex((i) => i.id === to);
  if (a < 0 || b < 0 || a === b) return items;
  const copy = [...items];
  copy.splice(b, 0, copy.splice(a, 1)[0]);
  return copy;
}
function SortHandle({
  id,
  onMove,
  disabled,
}: {
  id: string;
  onMove: (from: string, to: string) => void;
  disabled: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  function end(e: PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-sort-id]");
    if (target?.dataset.sortId) onMove(id, target.dataset.sortId);
    setDragging(false);
  }
  return (
    <button
      type="button"
      className={`icon-button sort-handle ${dragging ? "dragging" : ""}`}
      disabled={disabled}
      aria-label="Arrastrar para ordenar"
      title="Arrastra para ordenar; también puedes usar las flechas"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }}
      onPointerUp={end}
      onPointerCancel={() => setDragging(false)}
    >
      <Icon name="grip" size={19} />
    </button>
  );
}
export default function Workspace({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<FileItem[]>([]),
    [pages, setPages] = useState<PageItem[]>([]),
    [options, setOptions] = useState<Options>(initial),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState<Output | null>(null),
    [resultUrl, setResultUrl] = useState(""),
    [range, setRange] = useState(""),
    [dragOver, setDragOver] = useState(false),
    [notice, setNotice] = useState("");
  const busyRef = useRef(false),
    alive = useRef(true),
    inputRef = useRef<HTMLInputElement>(null),
    resultRef = useRef<HTMLHeadingElement>(null),
    fileRef = useRef<HTMLDivElement>(null);
  const images = tool.id === "images-pdf",
    multiple = images || tool.id === "merge",
    sortable = multiple || tool.id === "reorder",
    selectable = !multiple && !["split", "reorder"].includes(tool.id),
    selected = pages.filter((p) => p.selected).length;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!result) {
      setResultUrl("");
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setResultUrl(url);
    resultRef.current?.focus();
    return () => URL.revokeObjectURL(url);
  }, [result]);
  function change<K extends keyof Options>(key: K, value: Options[K]) {
    setOptions((o) => ({ ...o, [key]: value }));
    setError("");
  }
  async function addFiles(incoming: File[]) {
    if (busyRef.current || !incoming.length) return;
    setError("");
    setResult(null);
    setNotice("");
    try {
      validateFiles(
        [...files.map((i) => i.file), ...incoming],
        images,
        multiple,
      );
    } catch (e) {
      setError(friendlyError(e));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setStatus("Abriendo archivos en tu dispositivo…");
    try {
      const engine = await import("./engine"),
        newItems: FileItem[] = [];
      let newPages: PageItem[] = [],
        total = files.reduce((n, f) => n + f.pages, 0);
      for (const file of incoming) {
        const data = await engine.inspect(
          file,
          images,
          !multiple,
          (value) => {
            if (!alive.current) throw new UserError("Operación cancelada.");
            setStatus(value);
          },
          LIMITS.pages - total,
        );
        if (!alive.current) return;
        total += data.item.pages;
        newItems.push(data.item);
        newPages = data.pages;
      }
      setFiles((f) => [...f, ...newItems]);
      if (!multiple)
        setPages(
          newPages.map((p) => ({ ...p, selected: tool.id !== "delete" })),
        );
      setNotice(
        `${incoming.length} ${incoming.length === 1 ? "archivo preparado" : "archivos preparados"}.`,
      );
    } catch (e) {
      if (alive.current) setError(friendlyError(e));
    } finally {
      busyRef.current = false;
      if (alive.current) {
        setBusy(false);
        setStatus("");
      }
    }
  }
  function reset() {
    if (busyRef.current) return;
    setFiles([]);
    setPages([]);
    setResult(null);
    setError("");
    setRange("");
    setNotice("");
    setOptions(initial);
    inputRef.current?.focus();
  }
  async function run() {
    if (busyRef.current || !files.length) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setStatus("Preparando el resultado…");
    try {
      const { processFiles } = await import("./engine");
      const output = await processFiles(
        tool.id,
        files,
        pages,
        options,
        (value) => {
          if (!alive.current) throw new UserError("Operación cancelada.");
          setStatus(value);
        },
      );
      if (alive.current) setResult(output);
    } catch (e) {
      if (alive.current) setError(friendlyError(e));
    } finally {
      busyRef.current = false;
      if (alive.current) {
        setBusy(false);
        setStatus("");
      }
    }
  }
  function reorderFiles(from: string, to: string) {
    setFiles((f) => move(f, from, to));
    setNotice("Orden de archivos actualizado.");
  }
  function reorderPages(from: string, to: string) {
    setPages((p) => move(p, from, to));
    setNotice("Orden de páginas actualizado.");
  }
  function rotate(id?: string) {
    setPages((p) =>
      p.map((item) =>
        (id ? item.id === id : item.selected)
          ? { ...item, rotation: (item.rotation + 90) % 360, selected: true }
          : item,
      ),
    );
  }
  function applyRange() {
    try {
      const chosen = parseRange(range, pages.length);
      setPages((p) =>
        p.map((page) => ({ ...page, selected: chosen.includes(page.index) })),
      );
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  const accept = images ? ".jpg,.jpeg,.png" : ".pdf";
  return (
    <div className="shell workspace">
      <a className="back-link" href="#/">
        <Icon name="back" size={18} />
        Todas las herramientas
      </a>
      <div className={`workspace-title tone-${tool.group}`}>
        <span className="tool-icon">
          <Icon name={tool.icon} size={29} />
        </span>
        <div>
          <span className="eyebrow">
            {tool.category} / {tool.group}
          </span>
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
        </div>
      </div>
      <div className="steps" aria-label="Pasos">
        <span className={!files.length ? "current" : ""}>
          <b>1</b> Elige
        </span>
        <i />
        <span className={files.length && !result ? "current" : ""}>
          <b>2</b> Ajusta
        </span>
        <i />
        <span className={result ? "current" : ""}>
          <b>3</b> Descarga
        </span>
      </div>
      {error && (
        <div className="error-message" role="alert">
          <Icon name="file" size={21} />
          <div>
            <strong>No se ha podido continuar</strong>
            <p>{error}</p>
          </div>
          <button
            aria-label="Cerrar aviso"
            className="icon-button"
            onClick={() => setError("")}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
      {result ? (
        <section className="result-panel">
          <div className="success-icon">
            <Icon name="check" size={36} />
          </div>
          <span className="eyebrow">TODO LISTO</span>
          <h2 ref={resultRef} tabIndex={-1}>
            Un archivo menos en tu lista.
          </h2>
          <p>Tu resultado está preparado. Guárdalo y sigue con tu día.</p>
          <div className="result-file">
            <Icon name="file" />
            <div>
              <strong>{result.name}</strong>
              <span>
                {(result.blob.size / 1024 / 1024).toFixed(2)} MB
                {result.count > 1 ? ` · ${result.count} archivos en ZIP` : ""}
              </span>
            </div>
          </div>
          <a
            className="primary"
            href={resultUrl || undefined}
            download={result.name}
          >
            <Icon name="download" size={20} />
            Descargar {result.count > 1 ? "ZIP" : "archivo"}
          </a>
          <button className="text-button" onClick={reset}>
            Procesar otro archivo
            <Icon name="arrow" size={17} />
          </button>
          <p className="small">
            En iPhone, el resultado puede abrirse en una vista previa. Usa
            Compartir → Guardar en Archivos.
          </p>
        </section>
      ) : (
        <>
          {(!files.length || multiple) && (
            <div
              className={`dropzone ${dragOver ? "drag-over" : ""} ${files.length ? "compact" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!busy) void addFiles(Array.from(e.dataTransfer.files));
              }}
            >
              <span className="upload-icon">
                <Icon name="upload" size={30} />
              </span>
              <h2>
                {files.length
                  ? "¿Algún archivo más?"
                  : images
                    ? "Tus imágenes, por aquí."
                    : "Tu documento, por aquí."}
              </h2>
              <p>
                {multiple
                  ? "Selecciona tus archivos o arrástralos aquí."
                  : "Selecciona un PDF o arrástralo aquí."}
              </p>
              <label
                className={`primary file-picker ${busy ? "disabled" : ""}`}
              >
                <Icon name="plus" size={18} />
                {files.length
                  ? "Añadir archivos"
                  : images
                    ? "Elegir imágenes"
                    : multiple
                      ? "Elegir archivos PDF"
                      : "Elegir archivo PDF"}
                <input
                  ref={inputRef}
                  aria-label={
                    images ? "Seleccionar imágenes" : "Seleccionar PDF"
                  }
                  type="file"
                  accept={accept}
                  multiple={multiple}
                  disabled={busy}
                  onChange={(e) => {
                    void addFiles(Array.from(e.target.files || []));
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <span className="drop-limits">
                {images ? "JPG y PNG" : "PDF"} ·{" "}
                {multiple ? `Hasta ${LIMITS.files} archivos · ` : ""}
                {LIMITS.fileBytes / 1024 ** 2} MB por archivo
                {multiple
                  ? ` · ${LIMITS.totalBytes / 1024 ** 2} MB en total`
                  : ""}
              </span>
            </div>
          )}
          {busy && (
            <div className="progress-panel" role="status" aria-live="polite">
              <span className="spinner" />
              <div>
                <strong>{status}</strong>
                <p>Todo ocurre aquí, en tu dispositivo.</p>
              </div>
            </div>
          )}
          {files.length > 0 && (
            <div ref={fileRef} className="editor-layout">
              <section className="preview-panel" aria-label="Previsualización">
                <div className="panel-heading">
                  <div>
                    <h2>{multiple ? "Tus archivos" : "Tus páginas"}</h2>
                    <p>
                      {multiple
                        ? `${files.length} archivo${files.length === 1 ? "" : "s"} · ${files.reduce((n, f) => n + f.pages, 0)} ${images ? "imágenes" : "páginas"}`
                        : `${files[0].file.name} · ${pages.length} páginas`}
                    </p>
                  </div>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={reset}
                  >
                    Cambiar
                  </button>
                </div>
                <p className="tool-hint">{tool.hint}</p>
                {multiple ? (
                  <div className="file-list">
                    {files.map((item, index) => (
                      <div
                        key={item.id}
                        data-sort-id={item.id}
                        className="file-tile"
                      >
                        <SortHandle
                          id={item.id}
                          onMove={reorderFiles}
                          disabled={busy}
                        />
                        <img
                          src={item.thumb}
                          alt={`Vista previa de ${item.file.name}`}
                        />
                        <div className="file-info">
                          <strong>{item.file.name}</strong>
                          <span>
                            {index + 1}. ·{" "}
                            {(item.file.size / 1024 / 1024).toFixed(1)} MB
                            {!images ? ` · ${item.pages} pág.` : ""}
                          </span>
                        </div>
                        <div className="file-actions">
                          <button
                            className="icon-button"
                            aria-label={`Subir archivo ${index + 1}`}
                            disabled={busy || index === 0}
                            onClick={() =>
                              reorderFiles(item.id, files[index - 1].id)
                            }
                          >
                            <Icon name="up" size={18} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Bajar archivo ${index + 1}`}
                            disabled={busy || index === files.length - 1}
                            onClick={() =>
                              reorderFiles(item.id, files[index + 1].id)
                            }
                          >
                            <Icon name="down" size={18} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Quitar ${item.file.name}`}
                            disabled={busy}
                            onClick={() =>
                              setFiles((f) => f.filter((i) => i.id !== item.id))
                            }
                          >
                            <Icon name="close" size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {selectable && (
                      <div className="selection-toolbar">
                        <span>
                          {selected}{" "}
                          {tool.id === "delete"
                            ? "para eliminar"
                            : "seleccionadas"}
                        </span>
                        <button
                          disabled={busy}
                          onClick={() =>
                            setPages((p) =>
                              p.map((i) => ({ ...i, selected: true })),
                            )
                          }
                        >
                          Todas
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            setPages((p) =>
                              p.map((i) => ({ ...i, selected: false })),
                            )
                          }
                        >
                          Ninguna
                        </button>
                        {tool.id === "rotate" && (
                          <button
                            disabled={busy || !selected}
                            onClick={() => rotate()}
                          >
                            <Icon name="rotate" size={17} />
                            Girar selección
                          </button>
                        )}
                      </div>
                    )}
                    <div className="page-grid">
                      {pages.map((page, index) => (
                        <div
                          key={page.id}
                          data-sort-id={page.id}
                          data-page={page.index + 1}
                          className={`page-card ${selectable && page.selected ? "is-selected" : ""} ${tool.id === "delete" && page.selected ? "marked-delete" : ""}`}
                        >
                          {sortable && (
                            <div className="page-sort">
                              <SortHandle
                                id={page.id}
                                onMove={reorderPages}
                                disabled={busy}
                              />
                              <span>Posición {index + 1}</span>
                            </div>
                          )}
                          <div
                            className="page-image-wrap"
                            style={{ aspectRatio: page.ratio }}
                          >
                            <img
                              draggable={false}
                              className="page-image"
                              src={page.thumb}
                              alt={`Página ${page.index + 1}`}
                              style={{
                                transform: `rotate(${page.rotation}deg)`,
                                scale: page.rotation % 180 ? "0.72" : "1",
                              }}
                            />
                            {tool.id === "crop" && page.selected && (
                              <div
                                className="crop-guide"
                                style={{ inset: `${options.crop}%` }}
                              />
                            )}
                            {tool.id === "delete" && page.selected && (
                              <span className="delete-overlay">
                                <Icon name="trash" />
                              </span>
                            )}
                          </div>
                          <div className="page-bottom">
                            {selectable ? (
                              <label>
                                <input
                                  type="checkbox"
                                  aria-label={`${tool.id === "delete" ? "Eliminar" : "Seleccionar"} página ${page.index + 1}`}
                                  checked={page.selected}
                                  disabled={busy}
                                  onChange={() =>
                                    setPages((p) =>
                                      p.map((i) =>
                                        i.id === page.id
                                          ? { ...i, selected: !i.selected }
                                          : i,
                                      ),
                                    )
                                  }
                                />
                                Pág. {page.index + 1}
                              </label>
                            ) : (
                              <span>Pág. {page.index + 1}</span>
                            )}
                            {tool.id === "rotate" && (
                              <button
                                className="icon-button"
                                aria-label={`Girar página ${page.index + 1}`}
                                disabled={busy}
                                onClick={() => rotate(page.id)}
                              >
                                <Icon name="rotate" size={17} />
                              </button>
                            )}
                          </div>
                          {tool.id === "reorder" && (
                            <div className="page-movers">
                              <button
                                className="icon-button"
                                aria-label={`Adelantar página ${page.index + 1}`}
                                disabled={busy || index === 0}
                                onClick={() =>
                                  reorderPages(page.id, pages[index - 1].id)
                                }
                              >
                                <Icon name="back" size={18} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`Atrasar página ${page.index + 1}`}
                                disabled={busy || index === pages.length - 1}
                                onClick={() =>
                                  reorderPages(page.id, pages[index + 1].id)
                                }
                              >
                                <Icon name="arrow" size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
              <aside className="settings-panel">
                <span className="eyebrow">A TU GUSTO</span>
                <h2>Últimos ajustes</h2>
                <fieldset disabled={busy}>
                  {images && (
                    <label className="field">
                      Tamaño de página
                      <select
                        value={options.layout}
                        onChange={(e) =>
                          change("layout", e.target.value as Options["layout"])
                        }
                      >
                        <option value="a4">A4 con margen</option>
                        <option value="fit">Ajustado a cada imagen</option>
                      </select>
                      <small>
                        Una imagen por página. Se respeta la orientación de la
                        foto.
                      </small>
                    </label>
                  )}
                  {tool.id === "pdf-images" && (
                    <>
                      <label className="field">
                        Formato de salida
                        <select
                          value={options.format}
                          onChange={(e) =>
                            change(
                              "format",
                              e.target.value as Options["format"],
                            )
                          }
                        >
                          <option value="jpg">JPG · menor tamaño</option>
                          <option value="png">
                            PNG · sin pérdida adicional
                          </option>
                        </select>
                      </label>
                      <p className="settings-note">
                        Hasta {LIMITS.exportPages} páginas. Lado máximo de{" "}
                        {LIMITS.renderSide.toLocaleString("es")} px. Varias
                        imágenes se descargan juntas en ZIP.
                      </p>
                    </>
                  )}
                  {selectable && (
                    <div className="field">
                      <label htmlFor="range">
                        {tool.id === "delete"
                          ? "Páginas a eliminar"
                          : "Seleccionar páginas"}
                      </label>
                      <div className="inline-input">
                        <input
                          id="range"
                          placeholder="Ej. 1, 3-5"
                          value={range}
                          onChange={(e) => setRange(e.target.value)}
                        />
                        <button className="secondary" onClick={applyRange}>
                          Aplicar
                        </button>
                      </div>
                      <small>
                        También puedes marcarlas en la vista previa. Vacío
                        selecciona todas.
                      </small>
                    </div>
                  )}
                  {tool.id === "split" && (
                    <label className="field">
                      Grupos de páginas (opcional)
                      <input
                        placeholder="Ej. 1-2; 3-4; 5"
                        value={options.groups}
                        onChange={(e) => change("groups", e.target.value)}
                      />
                      <small>
                        Separa los documentos con punto y coma. Déjalo vacío
                        para crear un PDF por página. Se descargarán en ZIP.
                      </small>
                    </label>
                  )}
                  {tool.id === "watermark" && (
                    <>
                      <label className="field">
                        Texto de la marca
                        <input
                          maxLength={60}
                          value={options.text}
                          onChange={(e) => change("text", e.target.value)}
                        />
                        <small>
                          Letras latinas y signos habituales. Sin emojis.
                        </small>
                      </label>
                      <label className="field">
                        Opacidad · {Math.round(options.opacity * 100)} %
                        <input
                          type="range"
                          min="0.1"
                          max="0.6"
                          step="0.05"
                          value={options.opacity}
                          onChange={(e) =>
                            change("opacity", Number(e.target.value))
                          }
                        />
                      </label>
                    </>
                  )}
                  {tool.id === "number" && (
                    <label className="field">
                      Empezar por
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="9999"
                        value={options.start}
                        onChange={(e) =>
                          change("start", Number(e.target.value))
                        }
                      />
                      <small>
                        Numeración consecutiva centrada al pie de las páginas
                        seleccionadas.
                      </small>
                    </label>
                  )}
                  {tool.id === "crop" && (
                    <>
                      <label className="field">
                        Recortar cada margen · {options.crop} %
                        <input
                          type="range"
                          min="0"
                          max="25"
                          step="1"
                          value={options.crop}
                          onChange={(e) =>
                            change("crop", Number(e.target.value))
                          }
                        />
                      </label>
                      <p className="settings-note warning-note">
                        El recorte es visual: oculta los bordes, pero no elimina
                        su contenido. No sirve para censurar datos.
                      </p>
                    </>
                  )}
                  {tool.id === "merge" && (
                    <p className="settings-note">
                      Se unirán de arriba abajo, manteniendo el tamaño original
                      de cada página.
                    </p>
                  )}
                  {tool.id === "reorder" && (
                    <p className="settings-note">
                      El nuevo documento seguirá el orden de la vista previa.
                      Usa las flechas o arrastra las asas, también en móvil.
                    </p>
                  )}
                  {tool.id === "rotate" && (
                    <p className="settings-note">
                      Cada toque gira 90° a la derecha. La vista previa muestra
                      la nueva orientación.
                    </p>
                  )}
                  {tool.id === "delete" && (
                    <p className="settings-note">
                      Se eliminarán {selected} de {pages.length} páginas. Debes
                      conservar al menos una.
                    </p>
                  )}
                </fieldset>
                <button
                  className="primary process-button"
                  disabled={
                    busy ||
                    !files.length ||
                    (tool.id === "merge" && files.length < 2)
                  }
                  onClick={() => void run()}
                >
                  {busy ? (
                    <span className="spinner" />
                  ) : (
                    <Icon name={tool.icon} size={19} />
                  )}{" "}
                  {busy ? "Procesando…" : tool.action}
                </button>
                <p className="local-note">
                  <Icon name="lock" size={15} />
                  Procesado localmente en tu dispositivo.
                </p>
              </aside>
            </div>
          )}
        </>
      )}
      <div className="workspace-footnote">
        <Icon name="lock" size={16} />
        <p>Sin subir archivos. Sin guardar documentos. Sin registros.</p>
      </div>
    </div>
  );
}

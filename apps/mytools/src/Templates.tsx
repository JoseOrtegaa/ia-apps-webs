import { useEffect, useState } from "react";
import { TEMPLATES, validateTemplate, type Template } from "./templates";
import { templatePdf, EDIT_LIMITS } from "./documentEngine";
import { friendlyError, type Tool } from "./config";
import PdfPreview from "./PdfPreview";
import { Icon } from "./Icon";
export default function Templates({ tool }: { tool: Tool }) {
  const [template, setTemplate] = useState<Template | null>(null),
    [values, setValues] = useState<Record<string, string>>({}),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [text, setText] = useState<string | null>(null),
    [error, setError] = useState("");
  const [result, setResult] = useState<{
      value: Awaited<ReturnType<typeof templatePdf>>;
      text: string;
    } | null>(null),
    [page, setPage] = useState(0),
    [url, setUrl] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (text === null || !template) return;
    let live = true;
    const timer = setTimeout(() => {
      templatePdf(text, template.id)
        .then((value) => {
          if (live) {
            setResult({ value, text });
            setPage((p) => Math.min(p, value.pages - 1));
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(friendlyError(e));
        });
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text, template]);
  useEffect(() => {
    if (!result) return;
    const u = URL.createObjectURL(result.value.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [result]);
  function reset() {
    setTemplate(null);
    setValues({});
    setErrors({});
    setText(null);
    setResult(null);
    setError("");
    setPage(0);
  }
  return (
    <div className="shell workspace document-workspace">
      <a className="back-link" href="#/">
        <Icon name="back" size={18} />
        Todas las herramientas
      </a>
      <div className="workspace-title tone-Plantillas">
        <span className="tool-icon">
          <Icon name="file" />
        </span>
        <div>
          <span className="eyebrow">DOCUMENTOS · EN TU DISPOSITIVO</span>
          <h1>{tool.name}</h1>
          <p>Elige una plantilla, completa los datos y hazla tuya.</p>
        </div>
      </div>
      <p className="editor-intro">
        Sin cuentas ni envíos. Tus datos solo permanecen en memoria hasta salir
        de la herramienta o reiniciar. No incluyas datos sensibles innecesarios.
      </p>
      {!template ? (
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              className="template-card"
              key={t.id}
              onClick={() => setTemplate(t)}
            >
              <Icon name="file" />
              <h2>{t.name}</h2>
              <p>{t.description}</p>
              <span>Usar plantilla →</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="editor-actions">
            <h2>{template.name}</h2>
            <button className="secondary" onClick={reset}>
              Reiniciar y elegir plantilla
            </button>
          </div>
          {template.id === "baja-voluntaria" && (
            <p className="legal-note">
              Antes de enviarla, revisa el preaviso aplicable en tu contrato y
              convenio. Esta plantilla no calcula plazos, indemnizaciones ni
              obligaciones.{" "}
              <a
                href="https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a49"
                target="_blank"
                rel="noreferrer"
              >
                Referencia: Estatuto de los Trabajadores, art. 49.1.d (BOE).
              </a>
            </p>
          )}
          {text === null ? (
            <form
              className="template-form editor-controls"
              noValidate
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                const errs = validateTemplate(template, values);
                setErrors(errs);
                if (Object.keys(errs).length) {
                  document
                    .getElementById(`field-${Object.keys(errs)[0]}`)
                    ?.focus();
                  return;
                }
                setText(
                  template.build(
                    Object.fromEntries(
                      Object.entries(values).map(([k, v]) => [k, v.trim()]),
                    ),
                  ),
                );
              }}
            >
              <p className="small">
                Los campos marcados con * son obligatorios.
              </p>
              {template.fields.map((f) => (
                <label key={f.id} htmlFor={`field-${f.id}`}>
                  {f.label}
                  {f.required ? " *" : ""}
                  {f.type === "long" ? (
                    <textarea
                      id={`field-${f.id}`}
                      aria-label={f.label}
                      rows={5}
                      required={f.required}
                      maxLength={f.max || 200}
                      value={values[f.id] || ""}
                      placeholder={f.example}
                      aria-invalid={!!errors[f.id]}
                      aria-describedby={`help-${f.id}`}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.id]: e.target.value }))
                      }
                    />
                  ) : (
                    <input
                      id={`field-${f.id}`}
                      aria-label={f.label}
                      type={f.type === "date" ? "date" : "text"}
                      required={f.required}
                      maxLength={f.max || 200}
                      value={values[f.id] || ""}
                      placeholder={f.example}
                      aria-invalid={!!errors[f.id]}
                      aria-describedby={`help-${f.id}`}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.id]: e.target.value }))
                      }
                    />
                  )}
                  <span
                    id={`help-${f.id}`}
                    className={errors[f.id] ? "field-error" : "small"}
                  >
                    {errors[f.id] || f.example}
                  </span>
                </label>
              ))}
              {Object.keys(errors).length > 0 && (
                <p role="alert">Revisa los campos indicados para continuar.</p>
              )}
              <button className="primary" type="submit">
                Revisar y editar texto
              </button>
            </form>
          ) : (
            <div className="document-grid">
              <section className="editor-controls">
                <h2>Revisa tus palabras</h2>
                <label>
                  Texto final
                  <textarea
                    className="final-text"
                    rows={20}
                    maxLength={EDIT_LIMITS.documentChars}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setError("");
                    }}
                  />
                </label>
                <p className="small">
                  Puedes editar todo el texto. A4, márgenes de 56 pt, letra de
                  11 pt y páginas automáticas. Hasta 60.000 caracteres / 80
                  páginas. Tildes, ñ y signos latinos; sin emojis.
                </p>
                {error && (
                  <p className="error-panel" role="alert">
                    {error}
                  </p>
                )}
                <div className="editor-actions">
                  {result?.text === text && ready && !error ? (
                    <a
                      className="primary"
                      href={url}
                      download={result!.value.name}
                    >
                      Descargar PDF
                    </a>
                  ) : (
                    <button className="primary" disabled>
                      Preparando PDF…
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => {
                      setText(null);
                      setResult(null);
                      setError("");
                      setPage(0);
                    }}
                  >
                    Volver al formulario
                  </button>
                </div>
                <p className="small">
                  Volver al formulario descarta los cambios del texto final. En
                  iPhone, puedes guardar desde Compartir → Guardar en Archivos.
                </p>
              </section>
              <section className="editor-preview">
                <h2>Tu documento, listo</h2>
                {result && (
                  <>
                    <label>
                      Página de vista previa
                      <select
                        value={page}
                        onChange={(e) => setPage(Number(e.target.value))}
                      >
                        {Array.from({ length: result.value.pages }, (_, i) => (
                          <option key={i} value={i}>
                            Página {i + 1} de {result.value.pages}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="small">
                      {result.text === text
                        ? "Vista del mismo PDF que descargarás."
                        : "Actualizando vista previa…"}
                    </p>
                    <PdfPreview
                      blob={result.value.blob}
                      page={page}
                      onReady={setReady}
                    />
                  </>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

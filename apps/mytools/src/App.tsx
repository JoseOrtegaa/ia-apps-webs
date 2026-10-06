import { lazy, Suspense, useEffect, useState } from "react";
import { GROUPS, TOOLS, LIMITS } from "./config";
import { Icon } from "./Icon";
const PdfEditor = lazy(() => import("./PdfEditor"));
const Templates = lazy(() => import("./Templates"));
const Workspace = lazy(() => import("./Workspace"));
function getPath() {
  return window.location.hash.slice(1) || "/";
}
export default function App() {
  const [path, setPath] = useState(getPath),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState<string>("Todas"),
    [routeVersion, setRouteVersion] = useState(0);
  useEffect(() => {
    const update = () => {
      setPath(getPath());
      setRouteVersion((v) => v + 1);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) update();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  const tool = TOOLS.find((t) => t.path === path);
  useEffect(() => {
    document.title = tool ? `${tool.name} · MyTools` : "MyTools — Hazlo fácil.";
  }, [tool]);
  const filtered = TOOLS.filter(
    (t) =>
      (group === "Todas" || t.group === group) &&
      `${t.name} ${t.description} ${t.id === "images-pdf" ? "jpg png" : ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(
          query
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
        ),
  );
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header className="header">
        <div className="shell header-inner">
          <a className="brand" href="#/" aria-label="MyTools, inicio">
            <span className="brand-mark">
              <i />
              <i />
              <i />
              <i />
            </span>
            MyTools<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Principal">
            <a className={path === "/" ? "active" : ""} href="#/">
              Herramientas
            </a>
            <a href="#/about">Cómo funciona</a>
          </nav>
          <span className="header-badge">
            <span />
            Gratis. Así de simple.
          </span>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {tool ? (
          <Suspense
            fallback={
              <div className="shell loading-page" role="status">
                Preparando tu herramienta…
              </div>
            }
          >
            {tool.id === "templates" ? (
              <Templates key={routeVersion} tool={tool} />
            ) : tool.id === "sign" || tool.id === "text" ? (
              <PdfEditor key={`${tool.id}-${routeVersion}`} tool={tool} />
            ) : (
              <Workspace key={`${tool.id}-${routeVersion}`} tool={tool} />
            )}
          </Suspense>
        ) : path === "/about" ? (
          <div className="shell about">
            <a className="back-link" href="#/">
              <Icon name="back" size={18} />
              Todas las herramientas
            </a>
            <span className="eyebrow">A TU MANERA</span>
            <h1>
              Tus archivos.
              <br />
              En tus manos.
            </h1>
            <p className="lead">
              Una caja de herramientas sencilla, sin cuentas, sin subidas y sin
              rodeos.
            </p>
            <div className="about-grid">
              {[
                [
                  "01",
                  "Elige una herramienta",
                  "Convierte imágenes, organiza tus PDF o añade esos pequeños detalles.",
                ],
                [
                  "02",
                  "Trabaja en tu dispositivo",
                  "Los archivos se procesan en la memoria del navegador. No se envían a un servidor.",
                ],
                [
                  "03",
                  "Descarga y sigue",
                  "Guarda el resultado donde prefieras. Al cerrar la página, los documentos se liberan de la memoria.",
                ],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span className="step-number">{n}</span>
                  <h2>{t}</h2>
                  <p>{d}</p>
                </article>
              ))}
            </div>
            <section className="info-panel">
              <h2>Pequeños límites para trabajar mejor</h2>
              <p>
                Hasta {LIMITS.files} archivos, {LIMITS.fileBytes / 1024 ** 2} MB
                por archivo, {LIMITS.totalBytes / 1024 ** 2} MB en total y{" "}
                {LIMITS.pages} páginas por operación. Al convertir PDF a
                imágenes: hasta {LIMITS.exportPages} páginas y{" "}
                {LIMITS.renderSide.toLocaleString("es")} píxeles por lado. Las
                imágenes de entrada admiten hasta{" "}
                {LIMITS.imagePixels / 1_000_000} megapíxeles y se ajustan a{" "}
                {LIMITS.imageSide.toLocaleString("es")} píxeles al crear el PDF.
              </p>
              <p>
                Los documentos protegidos no son compatibles. La edición de
                formularios y firmas interactivas llegará más adelante. Conserva
                siempre tu original: modificar un PDF puede afectar a firmas,
                enlaces internos o marcadores. El recorte solo oculta márgenes;
                no sirve para borrar información confidencial.
              </p>
              <p>
                Usa un navegador actualizado. En documentos complejos, prueba
                con menos páginas. Puedes ampliar la pantalla para leer
                cómodamente.
              </p>
            </section>
            <section className="roadmap">
              <span className="eyebrow">ESTO ES SOLO EL COMIENZO</span>
              <h2>Más herramientas, el mismo lugar.</h2>
              <p>
                Documentos, imágenes, hojas de cálculo y datos. MyTools está
                preparado para crecer.
              </p>
              <div className="future-tags">
                <span>Office ↔ PDF · Próximamente</span>
                <span>HTML → PDF · Próximamente</span>
                <span>PDF/A · Próximamente</span>
                <span>Edición avanzada · Próximamente</span>
              </div>
              <p className="small">
                Estas funciones necesitan validar fidelidad de formato,
                seguridad y rendimiento antes de estar disponibles. No hay
                conversiones simuladas.
              </p>
            </section>
          </div>
        ) : path !== "/" ? (
          <div className="shell about">
            <h1>Esta herramienta no existe.</h1>
            <a className="primary" href="#/">
              Volver a las herramientas
            </a>
          </div>
        ) : (
          <>
            <section className="shell hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-spark">✳</span> MENOS VUELTAS. MÁS
                  HECHO.
                </span>
                <h1>
                  Archivos en orden.
                  <br />
                  <em>Tu día, más fácil.</em>
                </h1>
                <p>
                  Convierte, organiza y dale el último toque a tus archivos.
                  Herramientas sencillas, justo cuando las necesitas.
                </p>
                <a
                  href="#tools"
                  className="primary"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("tools")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Encuentra tu herramienta
                  <Icon name="arrow" size={19} />
                </a>
                <div className="hero-note">
                  <Icon name="lock" size={15} />
                  Tus archivos se quedan contigo.
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="art-orbit" />
                <span className="art-dot dot-a" />
                <span className="art-dot dot-b" />
                <div className="paper paper-back">
                  <div className="paper-label">JPG</div>
                  <div className="mini-landscape">
                    <span />
                  </div>
                  <i />
                  <i />
                </div>
                <div className="paper paper-front">
                  <span className="paper-fold" />
                  <span className="paper-label">PDF</span>
                  <div className="paper-title">
                    Todo en
                    <br />
                    su sitio.
                  </div>
                  <div className="paper-lines">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="paper-check">
                    <Icon name="check" size={28} />
                  </div>
                </div>
                <div className="art-chip chip-top">
                  <Icon name="spark" size={19} />
                  Un poco más fácil
                </div>
                <div className="art-chip chip-bottom">
                  <span className="green-check">
                    <Icon name="check" size={14} />
                  </span>
                  Listo para descargar
                </div>
                <span className="art-asterisk">✳</span>
              </div>
            </section>
            <div className="shell trust-strip">
              <span>
                <Icon name="lock" size={18} />
                Procesamiento local
              </span>
              <span>
                <Icon name="check" size={18} />
                Sin registro
              </span>
              <span>
                <Icon name="spark" size={18} />
                100 % gratuito
              </span>
            </div>
            <section className="shell catalog" id="tools">
              <div className="catalog-heading">
                <div>
                  <span className="eyebrow">TU CAJA DE HERRAMIENTAS</span>
                  <h2>¿Qué necesitas hacer?</h2>
                </div>
                <label className="search">
                  <Icon name="search" size={19} />
                  <input
                    aria-label="Buscar herramienta"
                    placeholder="Busca una herramienta…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Borrar búsqueda"
                    >
                      <Icon name="close" size={17} />
                    </button>
                  )}
                </label>
              </div>
              <div className="filter-row">
                <div
                  className="filters"
                  role="group"
                  aria-label="Filtrar herramientas"
                >
                  {GROUPS.map((g) => (
                    <button
                      aria-pressed={group === g}
                      className={group === g ? "selected" : ""}
                      onClick={() => setGroup(g)}
                      key={g}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <span className="tool-count">
                  {filtered.length} herramientas ·{" "}
                  {Array.from(new Set(filtered.map((t) => t.category))).join(
                    " / ",
                  )}
                </span>
              </div>
              {filtered.length ? (
                <div className="tool-grid">
                  {filtered.map((t) => (
                    <a
                      className={`tool-card tone-${t.group}`}
                      key={t.id}
                      href={`#${t.path}`}
                    >
                      <div className="card-top">
                        <span className="tool-icon">
                          <Icon name={t.icon} size={27} />
                        </span>
                        <span className="card-arrow">
                          <Icon name="arrow" size={18} />
                        </span>
                      </div>
                      <h3>{t.name}</h3>
                      <p>{t.description}</p>
                      <span className="card-category">
                        {t.category} · {t.group}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="empty-search">
                  <Icon name="search" size={32} />
                  <h3>No encontramos esa herramienta</h3>
                  <p>Prueba con «unir», «imagen» o «rotar».</p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setQuery("");
                      setGroup("Todas");
                    }}
                  >
                    Ver todas
                  </button>
                </div>
              )}
              <div className="privacy-banner">
                <span className="privacy-symbol">
                  <Icon name="lock" size={27} />
                </span>
                <div>
                  <h3>Privado por naturaleza.</h3>
                  <p>
                    Tus documentos no salen de tu dispositivo. Tú eliges los
                    archivos; tu navegador hace el trabajo.
                  </p>
                </div>
                <a href="#/about">
                  Así funciona
                  <Icon name="arrow" size={18} />
                </a>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="shell footer">
        <a className="brand small-brand" href="#/">
          MyTools<span className="brand-dot">.</span>
        </a>
        <p>Pequeñas herramientas. Grandes ratos ahorrados.</p>
        <a href="#/about">
          Privacidad y límites
          <Icon name="arrow" size={15} />
        </a>
      </footer>
    </>
  );
}

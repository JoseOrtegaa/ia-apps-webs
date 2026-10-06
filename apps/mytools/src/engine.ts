import {
  PDFDocument,
  PDFName,
  PDFDict,
  StandardFonts,
  degrees,
  rgb,
  type PDFPage,
} from "pdf-lib";
import { LIMITS, UserError, parseRange, type ToolId } from "./config";
export type PageItem = {
  id: string;
  index: number;
  thumb: string;
  rotation: number;
  selected: boolean;
  ratio: number;
};
export type FileItem = { id: string; file: File; thumb: string; pages: number };
export type Options = {
  format: "jpg" | "png";
  layout: "a4" | "fit";
  text: string;
  opacity: number;
  crop: number;
  start: number;
  groups: string;
};
export type Output = { blob: Blob; name: string; count: number };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const bytesBlob = (bytes: Uint8Array, type: string) =>
  new Blob([bytes as BlobPart], { type });
const baseName = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\p{L}\p{N}_.-]/gu, "-")
    .slice(0, 70) || "documento";
let pdfjsPromise:
  Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | undefined;
async function pdfjs() {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs");
  const lib = await pdfjsPromise;
  lib.GlobalWorkerOptions.workerSrc = new URL(
    "../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
  return lib;
}
async function openPdf(file: File) {
  const lib = await pdfjs();
  const task = lib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: false,
    cMapUrl: `${import.meta.env.BASE_URL}pdf-assets/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdf-assets/standard_fonts/`,
    wasmUrl: `${import.meta.env.BASE_URL}pdf-assets/wasm/`,
    stopAtErrors: true,
  });
  task.onPassword = () => {
    void task.destroy();
  };
  try {
    return await task.promise;
  } catch (error) {
    await task.destroy();
    throw error;
  }
}
async function readPdf(file: File) {
  const header = new TextDecoder().decode(
    await file.slice(0, 1024).arrayBuffer(),
  );
  if (!header.includes("%PDF-"))
    throw new UserError(
      "Este archivo no es un PDF válido. Comprueba su formato.",
    );
  const doc = await PDFDocument.load(await file.arrayBuffer(), {
    updateMetadata: false,
  });
  if (!doc.getPageCount()) throw new UserError("Este PDF no contiene páginas.");
  if (doc.getPageCount() > LIMITS.pages)
    throw new UserError(
      `Puedes procesar un máximo de ${LIMITS.pages} páginas por operación.`,
    );
  return doc;
}
function checkEditable(doc: PDFDocument) {
  if (
    doc.catalog
      .lookupMaybe(PDFName.of("AcroForm"), PDFDict)
      ?.has(PDFName.of("XFA")) ||
    doc.getForm().getFields().length
  )
    throw new UserError(
      "Este PDF contiene formularios o firmas interactivas. Exporta una copia aplanada antes de modificarlo.",
    );
}
async function imageElement(file: File) {
  // Read dimensions before decoding to keep oversized images away from mobile canvas.
  const bytes = new Uint8Array(await file.arrayBuffer());
  let width = 0,
    height = 0;
  const view = new DataView(bytes.buffer);
  if (
    bytes.length >= 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a
  ) {
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i] !== 0xff) break;
      const marker = bytes[i + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xff) {
        i++;
        continue;
      }
      const length = view.getUint16(i + 2);
      if (length < 2) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        height = view.getUint16(i + 5);
        width = view.getUint16(i + 7);
        break;
      }
      i += length + 2;
    }
  }
  if (!width || !height)
    throw new UserError(
      "Esta imagen no es un JPG o PNG válido, o está dañada.",
    );
  if (
    width * height > LIMITS.imagePixels ||
    width > LIMITS.imageInputSide ||
    height > LIMITS.imageInputSide
  )
    throw new UserError(
      `Esta imagen supera ${LIMITS.imagePixels / 1_000_000} megapíxeles o sus dimensiones son demasiado grandes. Reduce su resolución.`,
    );
  const url = URL.createObjectURL(file),
    img = new Image();
  try {
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function imageCanvas(file: File, maxSide: number) {
  const img = await imageElement(file),
    canvas = document.createElement("canvas");
  const scale = Math.min(
    1,
    maxSide / Math.max(img.naturalWidth, img.naturalHeight),
  );
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new UserError(
      "No queda memoria para procesar esta imagen. Prueba con menos archivos.",
    );
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.src = "";
  return canvas;
}
async function renderPage(
  doc: Awaited<ReturnType<typeof openPdf>>,
  index: number,
  side: number,
  format = "image/png",
) {
  const page = await doc.getPage(index + 1),
    canvas = document.createElement("canvas");
  try {
    const initial = page.getViewport({ scale: 1 });
    if (
      !Number.isFinite(initial.width * initial.height) ||
      initial.width <= 0 ||
      initial.height <= 0
    )
      throw new UserError(
        "Este PDF contiene una página con dimensiones no válidas.",
      );
    const scale = Math.min(
      side / Math.max(initial.width, initial.height),
      Math.sqrt(LIMITS.renderPixels / (initial.width * initial.height)),
    );
    const viewport = page.getViewport({ scale });
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new UserError(
        "No queda memoria suficiente. Prueba con menos páginas.",
      );
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      background: "#ffffff",
      annotationMode: 0,
    }).promise;
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new UserError(
                  "No se ha podido crear la imagen. Reduce el número de páginas.",
                ),
              ),
        format,
        0.9,
      ),
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
  }
}
export async function inspect(
  file: File,
  images: boolean,
  allPages: boolean,
  progress: (value: string) => void,
  remainingPages: number = LIMITS.pages,
): Promise<{ item: FileItem; pages: PageItem[] }> {
  const id = crypto.randomUUID();
  if (images) {
    const canvas = await imageCanvas(file, LIMITS.thumbSide);
    try {
      return {
        item: {
          id,
          file,
          thumb: canvas.toDataURL("image/jpeg", 0.75),
          pages: 1,
        },
        pages: [],
      };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  const check = await readPdf(file),
    count = check.getPageCount();
  if (count > remainingPages)
    throw new UserError(
      `El conjunto supera el máximo de ${LIMITS.pages} páginas por operación.`,
    );
  // Do not retain original buffers or live PDF workers after inspection.
  const doc = await openPdf(file),
    pages: PageItem[] = [];
  try {
    for (let index = 0; index < (allPages ? count : 1); index++) {
      progress(`Preparando página ${index + 1} de ${allPages ? count : 1}…`);
      const blob = await renderPage(doc, index, LIMITS.thumbSide);
      const thumb = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const b = check.getPage(index).getCropBox(),
        rotated =
          Math.abs(check.getPage(index).getRotation().angle % 180) === 90;
      pages.push({
        ratio: rotated ? b.height / b.width : b.width / b.height,
        id: `${id}-${index}`,
        index,
        thumb,
        rotation: 0,
        selected: true,
      });
      await tick();
    }
    return { item: { id, file, thumb: pages[0].thumb, pages: count }, pages };
  } finally {
    await doc.loadingTask.destroy();
  }
}
function drawPosition(page: PDFPage, x: number, y: number) {
  const b = page.getCropBox(),
    angle = ((page.getRotation().angle % 360) + 360) % 360;
  if (angle === 90) return { x: b.x + b.width - y, y: b.y + x, angle };
  if (angle === 180)
    return { x: b.x + b.width - x, y: b.y + b.height - y, angle };
  if (angle === 270) return { x: b.x + y, y: b.y + b.height - x, angle };
  return { x: b.x + x, y: b.y + y, angle };
}
async function pack(
  outputs: { name: string; bytes: Uint8Array }[],
  name: string,
): Promise<Output> {
  const total = outputs.reduce((n, o) => n + o.bytes.byteLength, 0);
  if (total > LIMITS.outputBytes)
    throw new UserError(
      `El resultado supera ${LIMITS.outputBytes / 1024 ** 2} MB. Procesa menos archivos o páginas.`,
    );
  if (outputs.length === 1)
    return {
      blob: bytesBlob(
        outputs[0].bytes,
        outputs[0].name.endsWith(".pdf")
          ? "application/pdf"
          : outputs[0].name.endsWith(".png")
            ? "image/png"
            : "image/jpeg",
      ),
      name: outputs[0].name,
      count: 1,
    };
  const { zipSync } = await import("fflate");
  const zip = zipSync(
    Object.fromEntries(outputs.map((o) => [o.name, o.bytes])),
    { level: 0 },
  );
  return {
    blob: bytesBlob(zip, "application/zip"),
    name: `${name}.zip`,
    count: outputs.length,
  };
}
export async function processFiles(
  tool: ToolId,
  items: FileItem[],
  pages: PageItem[],
  options: Options,
  progress: (value: string) => void,
): Promise<Output> {
  const doc = await PDFDocument.create(),
    first = items[0],
    name = baseName(first.file.name);
  if (tool === "images-pdf") {
    for (let i = 0; i < items.length; i++) {
      progress(`Añadiendo imagen ${i + 1} de ${items.length}…`);
      await tick();
      const canvas = await imageCanvas(items[i].file, LIMITS.imageSide);
      try {
        const png = /\.png$/i.test(items[i].file.name);
        const image = png
          ? await doc.embedPng(canvas.toDataURL("image/png"))
          : await doc.embedJpg(canvas.toDataURL("image/jpeg", 0.94));
        const [w, h] =
          options.layout === "a4"
            ? [595.28, 841.89]
            : [image.width * 0.75, image.height * 0.75];
        const margin = options.layout === "a4" ? 24 : 0,
          scale = Math.min(
            (w - margin * 2) / image.width,
            (h - margin * 2) / image.height,
          );
        const page = doc.addPage([w, h]);
        page.drawImage(image, {
          x: (w - image.width * scale) / 2,
          y: (h - image.height * scale) / 2,
          width: image.width * scale,
          height: image.height * scale,
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    return pack(
      [{ name: "imagenes.pdf", bytes: await doc.save() }],
      "imagenes",
    );
  }
  if (tool === "merge") {
    if (items.length < 2)
      throw new UserError("Añade al menos dos PDF para unirlos.");
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      progress(`Uniendo documento ${i + 1} de ${items.length}…`);
      await tick();
      const source = await readPdf(items[i].file);
      checkEditable(source);
      total += source.getPageCount();
      if (total > LIMITS.pages)
        throw new UserError(
          `El conjunto supera el máximo de ${LIMITS.pages} páginas.`,
        );
      for (const page of await doc.copyPages(source, source.getPageIndices()))
        doc.addPage(page);
    }
    return pack(
      [{ name: "documentos-unidos.pdf", bytes: await doc.save() }],
      "documentos-unidos",
    );
  }
  const selected = pages.filter((p) => p.selected);
  if (tool === "pdf-images") {
    if (!selected.length)
      throw new UserError("Selecciona al menos una página.");
    if (selected.length > LIMITS.exportPages)
      throw new UserError(
        `Convierte un máximo de ${LIMITS.exportPages} páginas a imágenes por operación.`,
      );
    const source = await openPdf(first.file),
      outputs: { name: string; bytes: Uint8Array }[] = [];
    let total = 0;
    try {
      for (let i = 0; i < selected.length; i++) {
        progress(`Convirtiendo página ${i + 1} de ${selected.length}…`);
        await tick();
        const blob = await renderPage(
          source,
          selected[i].index,
          LIMITS.renderSide,
          options.format === "jpg" ? "image/jpeg" : "image/png",
        );
        total += blob.size;
        if (total > LIMITS.outputBytes)
          throw new UserError(
            `El resultado supera ${LIMITS.outputBytes / 1024 ** 2} MB. Selecciona menos páginas.`,
          );
        outputs.push({
          name: `${name}-pagina-${selected[i].index + 1}.${options.format}`,
          bytes: new Uint8Array(await blob.arrayBuffer()),
        });
      }
    } finally {
      await source.loadingTask.destroy();
    }
    return pack(outputs, `${name}-imagenes`);
  }
  const source = await readPdf(first.file);
  checkEditable(source);
  if (tool === "split") {
    const groups = options.groups.trim()
      ? options.groups.split(";").map((g) => {
          if (!g.trim())
            throw new UserError(
              "Separa grupos válidos con punto y coma, por ejemplo 1-2; 3-4.",
            );
          return parseRange(g, source.getPageCount());
        })
      : source.getPageIndices().map((i) => [i]);
    if (
      groups.length > LIMITS.pages ||
      groups.reduce((n, g) => n + g.length, 0) > LIMITS.pages
    )
      throw new UserError(
        `La división no puede generar más de ${LIMITS.pages} páginas en total.`,
      );
    const outputs: { name: string; bytes: Uint8Array }[] = [];
    let total = 0;
    for (let i = 0; i < groups.length; i++) {
      progress(`Creando documento ${i + 1} de ${groups.length}…`);
      await tick();
      const part = await PDFDocument.create();
      for (const page of await part.copyPages(source, groups[i]))
        part.addPage(page);
      const bytes = await part.save();
      total += bytes.byteLength;
      if (total > LIMITS.outputBytes)
        throw new UserError(
          `El resultado supera ${LIMITS.outputBytes / 1024 ** 2} MB. Divide el documento en menos grupos.`,
        );
      outputs.push({ name: `${name}-parte-${i + 1}.pdf`, bytes });
    }
    return pack(outputs, `${name}-dividido`);
  }
  if (tool === "extract" || tool === "delete" || tool === "reorder") {
    const keep =
      tool === "delete"
        ? pages.filter((p) => !p.selected)
        : tool === "extract"
          ? selected
          : pages;
    if (!keep.length)
      throw new UserError("El PDF debe conservar al menos una página.");
    for (const page of await doc.copyPages(
      source,
      keep.map((p) => p.index),
    ))
      doc.addPage(page);
    return pack(
      [
        {
          name: `${name}-${tool === "delete" ? "sin-paginas" : tool === "extract" ? "extraido" : "ordenado"}.pdf`,
          bytes: await doc.save(),
        },
      ],
      name,
    );
  }
  if (!selected.length) throw new UserError("Selecciona al menos una página.");
  if (
    tool === "watermark" &&
    (!options.text.trim() || options.text.length > 60)
  )
    throw new UserError(
      "Escribe una marca de agua de entre 1 y 60 caracteres.",
    );
  if (
    tool === "crop" &&
    (!Number.isFinite(options.crop) || options.crop < 0 || options.crop > 25)
  )
    throw new UserError("El recorte debe estar entre 0 % y 25 %.");
  if (
    tool === "number" &&
    (!Number.isInteger(options.start) ||
      options.start < 1 ||
      options.start > 9999)
  )
    throw new UserError("El número inicial debe ser un entero entre 1 y 9999.");
  const font =
    tool === "number" || tool === "watermark"
      ? await source.embedFont(StandardFonts.Helvetica)
      : undefined;
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i],
      page = source.getPage(item.index),
      box = page.getCropBox();
    progress(`Editando página ${i + 1} de ${selected.length}…`);
    await tick();
    if (tool === "rotate") {
      page.setRotation(degrees(page.getRotation().angle + item.rotation));
      continue;
    }
    if (tool === "crop") {
      const c = options.crop / 100;
      page.setCropBox(
        box.x + box.width * c,
        box.y + box.height * c,
        box.width * (1 - 2 * c),
        box.height * (1 - 2 * c),
      );
      continue;
    }
    const rotated = Math.abs(page.getRotation().angle % 180) === 90,
      w = rotated ? box.height : box.width,
      h = rotated ? box.width : box.height;
    if (tool === "number") {
      const text = String(options.start + i),
        size = Math.min(11, w / 12, h / 10),
        width = font!.widthOfTextAtSize(text, size),
        pos = drawPosition(page, (w - width) / 2, Math.min(22, h * 0.08));
      page.drawText(text, {
        x: pos.x,
        y: pos.y,
        size,
        font,
        rotate: degrees(pos.angle),
        color: rgb(0.22, 0.25, 0.28),
      });
    } else if (tool === "watermark") {
      const text = options.text.trim(),
        size = Math.min(
          52,
          (w * 0.75) / font!.widthOfTextAtSize(text, 1),
          h * 0.15,
        ),
        width = font!.widthOfTextAtSize(text, size),
        a = (35 * Math.PI) / 180;
      const pos = drawPosition(
        page,
        w / 2 - (width * Math.cos(a)) / 2,
        h / 2 - (width * Math.sin(a)) / 2,
      );
      page.drawText(text, {
        x: pos.x,
        y: pos.y,
        size,
        font,
        rotate: degrees(pos.angle + 35),
        opacity: Math.max(0.1, Math.min(0.6, options.opacity)),
        color: rgb(0.28, 0.31, 0.33),
      });
    }
  }
  const suffix = {
    rotate: "rotado",
    number: "numerado",
    watermark: "marca-de-agua",
    crop: "recortado",
  }[tool];
  return pack(
    [{ name: `${name}-${suffix}.pdf`, bytes: await source.save() }],
    name,
  );
}

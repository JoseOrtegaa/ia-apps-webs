import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
} from "pdf-lib";
import { checkEditable, openPdf, readPdf, pack, imageElement } from "./engine";
import { LIMITS, UserError, validateFiles } from "./config";
export type Geometry = {
  width: number;
  height: number;
  transform: number[];
  rotation: number;
  unit: number;
};
export type Block = {
  id: string;
  page: number;
  kind: "text" | "image";
  x: number;
  y: number;
  width: number;
  size: number;
  color: string;
  text: string;
  image: string;
  ratio: number;
};
export type Bounds = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
export const EDIT_LIMITS = {
  blocks: 80,
  blockChars: 2000,
  documentChars: 60000,
};
export async function inspectEditor(file: File): Promise<Geometry[]> {
  validateFiles([file], false, false);
  const check = await readPdf(file);
  checkEditable(check);
  const doc = await openPdf(file);
  try {
    const out: Geometry[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i),
        v = page.getViewport({ scale: 1 });
      if (!Number.isFinite(v.width * v.height) || v.width <= 0 || v.height <= 0)
        throw new UserError("La página tiene dimensiones no válidas.");
      out.push({
        width: v.width,
        height: v.height,
        transform: v.transform,
        rotation: v.rotation,
        unit: page.userUnit,
      });
      page.cleanup();
    }
    return out;
  } finally {
    await doc.loadingTask.destroy();
  }
}
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const normalized = text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ");
  try {
    font.encodeText(normalized.replace(/\n/g, ""));
  } catch {
    throw new UserError(
      "El texto admite tildes, ñ, ü, € y signos latinos. Quita emojis u otros caracteres no compatibles.",
    );
  }
  const lines: string[] = [];
  for (const paragraph of normalized.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/(\s+)/)) {
      if (!word) continue;
      if (font.widthOfTextAtSize(line + word, size) <= width) {
        line += word;
        continue;
      }
      if (line) {
        lines.push(line.trimEnd());
        line = "";
      }
      if (!word.trim()) continue;
      for (const char of word) {
        if (font.widthOfTextAtSize(char, size) > width)
          throw new UserError(
            "El bloque es demasiado estrecho para este tamaño de letra.",
          );
        if (font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
function point(g: Geometry, x: number, y: number) {
  const [a, b, c, d, e, f] = g.transform,
    det = a * d - b * c;
  return {
    x: (d * (x - e) - c * (y - f)) / det,
    y: (-b * (x - e) + a * (y - f)) / det,
  };
}
export async function compose(
  file: File,
  geometries: Geometry[],
  blocks: Block[],
) {
  if (blocks.length > EDIT_LIMITS.blocks)
    throw new UserError(`Máximo ${EDIT_LIMITS.blocks} bloques por documento.`);
  if (
    blocks.filter((b) => b.kind === "image").length > LIMITS.files ||
    blocks.reduce((total, b) => total + b.image.length * 0.75, file.size) >
      LIMITS.totalBytes
  )
    throw new UserError(
      `Máximo ${LIMITS.files} firmas y ${LIMITS.totalBytes / 1024 ** 2} MB de PDF e imágenes preparadas.`,
    );
  const doc = await readPdf(file);
  checkEditable(doc);
  const font = await doc.embedFont(StandardFonts.Helvetica),
    bounds: Bounds[] = [];
  for (const b of blocks) {
    const g = geometries[b.page];
    if (!g || ![b.x, b.y, b.width, b.size, b.ratio].every(Number.isFinite))
      throw new UserError("Revisa la posición y el tamaño del bloque.");
    const width = Math.max(1, Math.min(g.width, b.width));
    const lines =
      b.kind === "text" ? wrapText(b.text, font, b.size, width) : [];
    if (b.text.length > EDIT_LIMITS.blockChars || b.size < 6 || b.size > 72)
      throw new UserError(
        "Usa hasta 2.000 caracteres por bloque y un tamaño de 6 a 72 puntos.",
      );
    const height =
      b.kind === "text"
        ? Math.max(1, lines.length) * b.size * 1.25
        : width / b.ratio;
    if (height > g.height)
      throw new UserError(
        "Este bloque no cabe en la página. Reduce el tamaño o reparte el texto en varios bloques.",
      );
    const x = Math.max(0, Math.min(g.width - width, b.x)),
      y = Math.max(0, Math.min(g.height - height, b.y));
    bounds.push({ id: b.id, page: b.page, x, y, width, height });
    const page = doc.getPage(b.page);
    if (b.kind === "image") {
      const img = await doc.embedPng(b.image);
      page.drawImage(img, {
        ...point(g, x, y + height),
        width: width / g.unit,
        height: height / g.unit,
        rotate: degrees(g.rotation),
      });
    } else {
      if (!/^#[0-9a-f]{6}$/i.test(b.color))
        throw new UserError("Selecciona un color válido.");
      const color = rgb(
        parseInt(b.color.slice(1, 3), 16) / 255,
        parseInt(b.color.slice(3, 5), 16) / 255,
        parseInt(b.color.slice(5, 7), 16) / 255,
      );
      lines.forEach((line, i) =>
        page.drawText(line, {
          ...point(g, x, y + b.size + i * b.size * 1.25),
          size: b.size / g.unit,
          font,
          rotate: degrees(g.rotation),
          color,
        }),
      );
    }
  }
  const stem = file.name
    .replace(/\.pdf$/i, "")
    .replace(/[^\p{L}\p{N}_.-]/gu, "-")
    .slice(0, 70);
  const result = await pack(
    [
      {
        name: `${stem}-${blocks.some((b) => b.kind === "image") ? "firmado" : "con-texto"}.pdf`,
        bytes: await doc.save(),
      },
    ],
    "documento",
  );
  return { ...result, bounds };
}
export async function signatureImage(file: File) {
  validateFiles([file], true, false);
  const img = await imageElement(file),
    c = document.createElement("canvas");
  try {
    const scale = Math.min(
      1,
      LIMITS.imageSide / Math.max(img.naturalWidth, img.naturalHeight),
    );
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return { image: c.toDataURL("image/png"), ratio: c.width / c.height };
  } finally {
    c.width = 0;
    c.height = 0;
    img.src = "";
  }
}
export async function templatePdf(text: string, slug: string) {
  if (!text.trim())
    throw new UserError(
      "Escribe el texto del documento antes de generar el PDF.",
    );
  if (text.length > EDIT_LIMITS.documentChars)
    throw new UserError("El documento admite hasta 60.000 caracteres.");
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = wrapText(text, font, 11, 595.28 - 112),
    perPage = 42;
  if (Math.ceil(lines.length / perPage) > LIMITS.pages)
    throw new UserError(
      `El documento supera ${LIMITS.pages} páginas. Acorta el texto.`,
    );
  for (let start = 0; start < lines.length;) {
    // Keep the last six lines together (the closing and signature in our templates).
    const remaining = lines.length - start;
    const take =
      remaining > perPage && remaining - perPage < 6
        ? remaining - 6
        : Math.min(perPage, remaining);
    const page = doc.addPage([595.28, 841.89]);
    lines.slice(start, start + take).forEach((line, i) =>
      page.drawText(line, {
        x: 56,
        y: 779 - i * 17,
        size: 11,
        font,
        color: rgb(0.12, 0.17, 0.15),
      }),
    );
    page.drawText(`${doc.getPageCount()}`, {
      x: 292,
      y: 30,
      size: 9,
      font,
      color: rgb(0.4, 0.45, 0.42),
    });
    start += take;
  }
  const out = await pack(
    [{ name: `${slug}.pdf`, bytes: await doc.save() }],
    slug,
  );
  return { ...out, pages: doc.getPageCount() };
}

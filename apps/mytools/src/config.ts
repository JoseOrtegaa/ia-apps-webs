export const LIMITS = {
  files: 20,
  fileBytes: 15 * 1024 ** 2,
  totalBytes: 40 * 1024 ** 2,
  pages: 80,
  exportPages: 30,
  imagePixels: 24_000_000,
  imageInputSide: 16000,
  imageSide: 2400,
  renderSide: 1800,
  renderPixels: 3_000_000,
  outputBytes: 60 * 1024 ** 2,
  thumbSide: 180,
} as const;
export type ToolId =
  | "images-pdf"
  | "pdf-images"
  | "merge"
  | "split"
  | "extract"
  | "delete"
  | "reorder"
  | "rotate"
  | "number"
  | "watermark"
  | "crop";
export type Tool = {
  id: ToolId;
  name: string;
  description: string;
  group: "Convertir" | "Organizar" | "Editar";
  category: string;
  icon: string;
  path: string;
  status: "available";
  action: string;
  hint: string;
};
const define = (
  id: ToolId,
  name: string,
  description: string,
  group: Tool["group"],
  icon: string,
  action: string,
  hint: string,
): Tool => ({
  id,
  name,
  description,
  group,
  category: "PDF",
  icon,
  action,
  hint,
  path: `/pdf/${id}`,
  status: "available",
});
export const TOOLS: Tool[] = [
  define(
    "images-pdf",
    "Imagen a PDF",
    "Tus JPG y PNG, juntos en un documento.",
    "Convertir",
    "image",
    "Crear PDF",
    "Añade imágenes y colócalas en el orden que quieras.",
  ),
  define(
    "pdf-images",
    "PDF a imagen",
    "Cada página, una imagen JPG o PNG.",
    "Convertir",
    "scan",
    "Convertir a imágenes",
    `Selecciona las páginas que quieres convertir. Hasta ${LIMITS.exportPages} por operación.`,
  ),
  define(
    "merge",
    "Unir PDF",
    "Varios documentos. Un solo archivo.",
    "Organizar",
    "merge",
    "Unir documentos",
    "Añade al menos dos PDF y decide su orden.",
  ),
  define(
    "split",
    "Dividir PDF",
    "Separa tu documento en varios archivos.",
    "Organizar",
    "split",
    "Dividir PDF",
    "Cada página será un PDF. También puedes definir grupos.",
  ),
  define(
    "extract",
    "Extraer páginas",
    "Quédate justo con las páginas que necesitas.",
    "Organizar",
    "extract",
    "Extraer páginas",
    "Selecciona las páginas que tendrá tu nuevo documento.",
  ),
  define(
    "delete",
    "Eliminar páginas",
    "Quita lo que sobra de tu documento.",
    "Organizar",
    "trash",
    "Eliminar páginas",
    "Marca las páginas que quieres eliminar. Las demás se conservarán.",
  ),
  define(
    "reorder",
    "Reordenar páginas",
    "Dale el orden que tiene sentido.",
    "Organizar",
    "sort",
    "Guardar orden",
    "Arrastra el asa de cada página o usa las flechas para moverla.",
  ),
  define(
    "rotate",
    "Rotar páginas",
    "Pon cada página en la dirección correcta.",
    "Organizar",
    "rotate",
    "Guardar rotación",
    "Selecciona páginas y gíralas 90°. Puedes girar cada una por separado.",
  ),
  define(
    "number",
    "Numerar páginas",
    "Un pequeño detalle para no perder el hilo.",
    "Editar",
    "number",
    "Añadir numeración",
    "Añade números al pie de las páginas seleccionadas.",
  ),
  define(
    "watermark",
    "Marca de agua",
    "Añade una señal personal a tus documentos.",
    "Editar",
    "water",
    "Añadir marca de agua",
    "Añade un texto diagonal a las páginas seleccionadas.",
  ),
  define(
    "crop",
    "Recortar páginas",
    "Ajusta los márgenes y centra lo importante.",
    "Editar",
    "crop",
    "Recortar PDF",
    "Recorta visualmente los cuatro márgenes por igual. El contenido oculto no se elimina.",
  ),
];
export const GROUPS = ["Todas", "Convertir", "Organizar", "Editar"] as const;
export class UserError extends Error {}
export function friendlyError(error: unknown): string {
  if (error instanceof UserError) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (/encrypt|password/i.test(message))
    return "Este PDF está protegido y no puede procesarse. Abre una copia sin contraseña.";
  if (/WinAnsi|encode/i.test(message))
    return "Usa letras latinas, números y signos habituales para la marca de agua; los emojis no son compatibles.";
  return "No hemos podido abrir o procesar este archivo. Puede estar dañado o ser demasiado complejo. Prueba con un documento más pequeño.";
}
export function validateFiles(
  files: File[],
  images: boolean,
  multiple: boolean,
) {
  if (files.length > (multiple ? LIMITS.files : 1))
    throw new UserError(
      multiple
        ? `Puedes procesar un máximo de ${LIMITS.files} archivos a la vez.`
        : "Esta herramienta admite un PDF por operación.",
    );
  if (files.reduce((n, f) => n + f.size, 0) > LIMITS.totalBytes)
    throw new UserError(
      `Los archivos superan el límite total de ${LIMITS.totalBytes / 1024 ** 2} MB.`,
    );
  for (const f of files) {
    if (!(images ? /\.(jpe?g|png)$/i : /\.pdf$/i).test(f.name))
      throw new UserError(
        images
          ? "Selecciona únicamente imágenes JPG o PNG."
          : "Selecciona únicamente archivos PDF.",
      );
    if (f.size > LIMITS.fileBytes)
      throw new UserError(
        `«${f.name}» supera el máximo de ${LIMITS.fileBytes / 1024 ** 2} MB por archivo.`,
      );
    if (!f.size) throw new UserError(`«${f.name}» está vacío.`);
  }
}
export function parseRange(value: string, count: number): number[] {
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i);
  const out: number[] = [];
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match)
      throw new UserError(
        "Escribe páginas como 1, 3-5. Usa números dentro del documento.",
      );
    const a = Number(match[1]),
      b = Number(match[2] || match[1]);
    if (a < 1 || b < a || b > count)
      throw new UserError(
        `Las páginas deben estar entre 1 y ${count}, en rangos ascendentes.`,
      );
    for (let i = a - 1; i < b; i++) if (!out.includes(i)) out.push(i);
  }
  return out;
}

import { expect, type Page } from "@playwright/test";
import { test } from "./browser";
import {
  PDFDocument,
  StandardFonts,
  degrees,
  PDFName,
  PDFNumber,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { readFile } from "node:fs/promises";
type Upload = { name: string; mimeType: string; buffer: Buffer };
let source: Upload;
test.beforeAll(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [i, angle] of [0, 90, 180, 270].entries()) {
    const p = doc.addPage([440 + i * 20, 600 + i * 30]);
    p.setCropBox(20, 30, 400 + i * 20, 540 + i * 30);
    p.setRotation(degrees(angle));
    if (i === 3) p.node.set(PDFName.of("UserUnit"), PDFNumber.of(2));
    p.drawText(`ORIGINAL ${i + 1}`, { x: 50, y: 500, size: 12, font });
  }
  source = {
    name: "rotaciones.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  };
});
test.beforeEach(async ({ page, baseURL }) => {
  const errors: string[] = [],
    requests: string[] = [];
  (page as any).errors = errors;
  (page as any).requests = requests;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (
      !["GET", "HEAD"].includes(r.method()) ||
      (!r.url().startsWith(new URL(baseURL!).origin) &&
        /^https?:/.test(r.url()))
    )
      requests.push(r.method() + " " + r.url());
  });
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL);
    (window as any).qaBlobs = new Map();
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      const url = original(blob);
      (window as any).qaBlobs.set(url, blob);
      return url;
    };
  });
  await page.goto("./");
});
test.afterEach(async ({ page }) => {
  expect((page as any).errors).toEqual([]);
  expect((page as any).requests).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
async function editor(page: Page, id = "text", file = source) {
  await page.goto(`./#/pdf/${id}`);
  await page.getByLabel("Seleccionar PDF", { exact: true }).setInputFiles(file);
  await expect(page.locator(".pdf-stage img")).toBeVisible();
}
async function settled(page: Page) {
  await expect(page.getByRole("link", { name: /Descargar PDF/ })).toBeVisible();
  await expect(page.locator(".preview-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
async function download(page: Page) {
  await settled(page);
  const link = page.getByRole("link", { name: /Descargar PDF/ });
  const shown = await link.evaluate(async (a) =>
    Array.from(
      new Uint8Array(
        await (window as any).qaBlobs
          .get((a as HTMLAnchorElement).href)
          .arrayBuffer(),
      ),
    ),
  );
  const event = page.waitForEvent("download");
  await link.click();
  const d = await event,
    bytes = await readFile((await d.path())!);
  expect([...bytes]).toEqual(shown);
  return { bytes, name: d.suggestedFilename() };
}
function content(doc: PDFDocument, i: number) {
  const v = doc.getPage(i).node.Contents();
  return (
    v instanceof PDFArray ? v.asArray().map((r) => doc.context.lookup(r)) : [v]
  )
    .map((s) =>
      s instanceof PDFRawStream
        ? Buffer.from(decodePDFRawStream(s).decode()).toString()
        : "",
    )
    .join("\n");
}
async function pixels(page: Page) {
  return page.locator(".pdf-stage img").evaluate(async (el) => {
    const img = el as HTMLImageElement;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let left = c.width,
      top = c.height,
      right = 0,
      bottom = 0,
      count = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        const k = (y * c.width + x) * 4;
        if (data[k] > 180 && data[k + 1] < 100 && data[k + 2] < 100) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          count++;
        }
      }
    return {
      left: left / c.width,
      top: top / c.height,
      right: right / c.width,
      bottom: bottom / c.height,
      count,
    };
  });
}
async function stamp(page: Page, type = "image/png") {
  const base64 = await page.evaluate((type) => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 80;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 200, 80);
    return c.toDataURL(type).split(",")[1];
  }, type);
  return {
    name: type === "image/png" ? "firma.png" : "firma.jpg",
    mimeType: type,
    buffer: Buffer.from(base64, "base64"),
  };
}

test("text: rotated/cropped/mixed pages, Spanish, blocks, color, keyboard, exact download", async ({
  page,
}, info) => {
  await editor(page);
  for (let i = 0; i < 4; i++) {
    await page.getByLabel("Página que estás viendo").selectOption(String(i));
    await page.getByRole("button", { name: "Añadir bloque de texto" }).click();
    await page
      .getByLabel("Texto del bloque")
      .fill(`José, mañana: áéíóú ñ ü ¿Sí? ${i + 1}`);
    await page.getByLabel("Color", { exact: true }).fill("#ff0000");
    await page.getByLabel("Horizontal (%)").fill("20");
    await page.getByLabel("Vertical (%)").fill("30");
    await settled(page);
    const p = await pixels(page);
    expect(p.count).toBeGreaterThan(100);
    expect(p.left).toBeCloseTo(0.2, 1);
    expect(p.top).toBeGreaterThan(0.3);
    expect(p.top).toBeLessThan(0.35);
  }
  await page.getByLabel("Página que estás viendo").selectOption("0");
  await page.getByRole("button", { name: "Añadir bloque de texto" }).click();
  await page.getByLabel("Texto del bloque").fill("Segundo bloque");
  await settled(page);
  const overlay = page.locator(".placement").last();
  await overlay.focus();
  await overlay.press("ArrowRight");
  await settled(page);
  await expect(page.getByLabel("Horizontal (%)")).toHaveValue("10");
  await page.getByRole("button", { name: "Eliminar bloque" }).click();
  await settled(page);
  await expect(page.locator(".placement")).toHaveCount(1);
  const out = await download(page),
    doc = await PDFDocument.load(out.bytes);
  expect(doc.getPageCount()).toBe(4);
  for (let i = 0; i < 4; i++) {
    expect(doc.getPage(i).getRotation().angle).toBe(i * 90);
    expect(content(doc, i)).toContain("4A6F73E9");
  }
  await page.screenshot({
    path: info.outputPath("text-editor.png"),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
  // Rendering the downloaded bytes independently through a fresh tool gives the same raster.
  const before = await page
    .locator(".pdf-stage img")
    .evaluate(async (el) =>
      Array.from(
        new Uint8Array(
          await (window as any).qaBlobs
            .get((el as HTMLImageElement).src)
            .arrayBuffer(),
        ),
      ),
    );
  await editor(page, "text", {
    name: "salida.pdf",
    mimeType: "application/pdf",
    buffer: out.bytes,
  });
  const after = await page
    .locator(".pdf-stage img")
    .evaluate(async (el) =>
      Array.from(
        new Uint8Array(
          await (window as any).qaBlobs
            .get((el as HTMLImageElement).src)
            .arrayBuffer(),
        ),
      ),
    );
  expect(after).toEqual(before);
});

test("signature: PNG/JPG, all rotations and UserUnit, sizing, downloaded raster", async ({
  page,
}) => {
  await editor(page, "sign");
  for (let i = 0; i < 4; i++) {
    await page.getByLabel("Página que estás viendo").selectOption(String(i));
    await page
      .getByLabel("Cargar imagen de firma")
      .setInputFiles(await stamp(page, i % 2 ? "image/jpeg" : "image/png"));
    await page.getByLabel("Ancho (%)").fill("30");
    await page.getByLabel("Horizontal (%)").fill("20");
    await page.getByLabel("Vertical (%)").fill("30");
    await settled(page);
    const p = await pixels(page);
    expect(p.left).toBeCloseTo(0.2, 2);
    expect(p.right).toBeCloseTo(0.5, 2);
    expect(p.top).toBeCloseTo(0.3, 2);
    expect(p.bottom).toBeGreaterThan(0.32);
  }
  const out = await download(page);
  expect(out.name).toBe("rotaciones-firmado.pdf");
  const doc = await PDFDocument.load(out.bytes);
  for (let i = 0; i < 4; i++) expect(content(doc, i)).toContain(" Do");
  const before = await pixels(page);
  await editor(page, "sign", {
    name: out.name,
    mimeType: "application/pdf",
    buffer: out.bytes,
  });
  await page.getByLabel("Página que estás viendo").selectOption("3");
  await expect(page.locator(".pdf-stage img")).toBeVisible();
  expect(await pixels(page)).toEqual(before);
});

test("signature drawing and dragging with mouse or real emulated touch events, clear and restart", async ({
  page,
  isMobile,
  browserName,
}, info) => {
  await editor(page, "sign");
  const canvas = page.getByLabel("Lienzo para dibujar firma");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  if (isMobile && browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 20, y: box.y + 20 }],
    });
    for (let i = 1; i <= 8; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: box.x + 20 + i * 12, y: box.y + 20 + (i % 2) * 30 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 130, box.y + 60, { steps: 10 });
    await page.mouse.up();
  }
  await expect(page.getByRole("button", { name: "Usar firma" })).toBeEnabled();
  await page.getByRole("button", { name: "Usar firma" }).click();
  await settled(page);
  await page.getByRole("button", { name: "Limpiar firma" }).click();
  await expect(page.getByRole("button", { name: "Usar firma" })).toBeDisabled();
  const target = page.locator(".placement");
  await target.scrollIntoViewIfNeeded();
  const r = (await target.boundingBox())!;
  if (isMobile && browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: r.x + r.width / 2 + 20, y: r.y + r.height / 2 + 30 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2 + 25, r.y + r.height / 2 + 35, {
      steps: 5,
    });
    await page.mouse.up();
  }
  await settled(page);
  expect(
    Number(await page.getByLabel("Horizontal (%)").inputValue()),
  ).toBeGreaterThan(10);
  await page.getByLabel("Ancho (%)").fill("45");
  await download(page);
  await page.screenshot({
    path: info.outputPath("signature-editor.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(page.locator(".signature-pad")).toHaveCount(0);
});

test("reject signed dictionaries without AcroForm, signature fields, forms, damaged files; recover", async ({
  page,
}) => {
  for (const kind of ["detached", "field", "form", "damaged"]) {
    const d = await PDFDocument.create();
    const p = d.addPage();
    if (kind === "detached")
      d.catalog.set(
        PDFName.of("HiddenSignature"),
        d.context.register(
          d.context.obj({ Type: "Sig", ByteRange: [0, 1, 2, 3] }),
        ),
      );
    if (kind === "field")
      d.catalog.set(
        PDFName.of("AcroForm"),
        d.context.obj({
          Fields: [
            d.context.register(d.context.obj({ FT: "Sig", T: "Signature" })),
          ],
        }),
      );
    if (kind === "form") d.getForm().createTextField("name").addToPage(p);
    await page.goto("./#/pdf/sign");
    await page.getByLabel("Seleccionar PDF", { exact: true }).setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer:
        kind === "damaged"
          ? Buffer.from("not a pdf")
          : Buffer.from(await d.save()),
    });
    await expect(page.getByRole("alert")).toContainText(
      kind === "form"
        ? "formularios"
        : kind === "damaged"
          ? "PDF válido"
          : "firma digital",
    );
    await expect(page.locator(".pdf-stage")).toHaveCount(0);
  }
  await editor(page);
  await page.getByRole("button", { name: "Añadir bloque de texto" }).click();
  await page.getByLabel("Texto del bloque").fill("😀");
  await expect(page.getByRole("alert")).toContainText("Quita emojis");
  await expect(page.getByRole("link", { name: /Descargar PDF/ })).toHaveCount(
    0,
  );
  await page.getByLabel("Texto del bloque").fill("Español válido");
  await download(page);
});

async function choose(page: Page, name: string) {
  await page.goto("./#/documentos/plantillas");
  await page.getByRole("button", { name: new RegExp(name) }).click();
}
async function common(page: Page) {
  await page.getByLabel(/Nombre del/).fill("José Muñoz");
  await page.getByLabel("Lugar").fill("Madrid");
  await page.getByLabel("Fecha de comunicación").fill("2026-10-06");
}

test("templates: required/empty fields, edited Spanish text, clean A4, reset and navigation privacy", async ({
  page,
}, info) => {
  await choose(page, "Carta genérica");
  await page.getByRole("button", { name: "Revisar y editar texto" }).click();
  await expect(page.getByRole("alert")).toContainText("Revisa los campos");
  await common(page);
  await page
    .getByLabel("Mensaje", { exact: true })
    .fill("Hola, mañana hablaremos de la solicitud. ¡Gracias!");
  await page.getByRole("button", { name: "Revisar y editar texto" }).click();
  await page
    .getByLabel("Texto final")
    .fill("José Muñoz\n\nSolicitud: áéíóú, ñ, ü y 25 €.\n\nTexto revisado.");
  const out = await download(page),
    doc = await PDFDocument.load(out.bytes);
  expect(out.name).toBe("carta-generica.pdf");
  expect(doc.getPageCount()).toBe(1);
  expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28);
  expect(doc.getPage(0).getHeight()).toBeCloseTo(841.89);
  expect(content(doc, 0)).toContain("4A6F73E9");
  await page.screenshot({
    path: info.outputPath("template-review.png"),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
  await page.getByLabel("Texto final").fill("   ");
  await expect(page.getByRole("alert")).toContainText("Escribe el texto");
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "Todas las herramientas" }).click();
  await choose(page, "Carta genérica");
  await expect(page.getByLabel("Nombre del remitente")).toHaveValue("");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Carta genérica/ }),
  ).toBeVisible();
});

test("templates: formal request and resignation deterministic fields, no invented pre-notice", async ({
  page,
}) => {
  await choose(page, "Solicitud formal genérica");
  await common(page);
  await page.getByLabel("Entidad o empresa").fill("Academia Ejemplo");
  await page.getByLabel("Asunto", { exact: true }).fill("Certificado");
  await page
    .getByLabel("Exposición", { exact: true })
    .fill("He completado el curso.");
  await page
    .getByLabel("Solicitud", { exact: true })
    .fill("Solicito mi certificado.");
  await page.getByRole("button", { name: "Revisar y editar texto" }).click();
  await expect(page.getByLabel("Texto final")).toHaveValue(
    /EXPONGO:[\s\S]*SOLICITO:/,
  );
  await download(page);
  await page
    .getByRole("button", { name: "Reiniciar y elegir plantilla" })
    .click();
  await page.getByRole("button", { name: /Baja voluntaria laboral/ }).click();
  await common(page);
  await page.getByLabel("Empresa", { exact: true }).fill("Empresa Ejemplo");
  await page.getByLabel("Fecha efectiva de baja").fill("2026-11-01");
  await page.getByRole("button", { name: "Revisar y editar texto" }).click();
  const value = await page.getByLabel("Texto final").inputValue();
  expect(value).toContain("1 de noviembre de 2026");
  expect(value).toContain("José Muñoz");
  expect(value).not.toMatch(/15 días|indemnización/);
  await expect(page.locator(".legal-note")).toContainText(
    "contrato y convenio",
  );
  expect((await download(page)).name).toBe("baja-voluntaria.pdf");
});

test("templates: long multipage paragraphs and unbroken words, no cropped output", async ({
  page,
}) => {
  await choose(page, "Carta genérica");
  await common(page);
  await page
    .getByLabel("Mensaje", { exact: true })
    .fill(
      ("Párrafo español con ñ y tildes. ".repeat(20) + "\n\n").repeat(15) +
        "Z".repeat(800),
    );
  await page.getByRole("button", { name: "Revisar y editar texto" }).click();
  const out = await download(page),
    doc = await PDFDocument.load(out.bytes);
  expect(doc.getPageCount()).toBeGreaterThan(3);
  expect(doc.getPageCount()).toBeLessThan(20);
  for (let i = 0; i < doc.getPageCount(); i++) {
    expect(doc.getPage(i).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(content(doc, i)).toContain(" Tj");
  }
  await page
    .getByLabel("Página de vista previa")
    .selectOption(String(doc.getPageCount() - 1));
  await expect(page.locator(".pdf-stage img")).toBeVisible();
});

test("preview preserves existing annotation appearances and clamps a moved block inside the page", async ({
  page,
}) => {
  const doc = await PDFDocument.create(),
    p = doc.addPage([400, 600]);
  const appearance = doc.context.register(
    doc.context.flateStream("q 1 0 0 rg 0 0 80 40 re f Q", {
      Type: "XObject",
      Subtype: "Form",
      BBox: [0, 0, 80, 40],
      Resources: {},
    }),
  );
  p.node.set(
    PDFName.of("Annots"),
    doc.context.obj([
      doc.context.register(
        doc.context.obj({
          Type: "Annot",
          Subtype: "Square",
          Rect: [100, 200, 180, 240],
          F: 4,
          AP: { N: appearance },
        }),
      ),
    ]),
  );
  await editor(page, "text", {
    name: "anotacion.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });
  const original = await pixels(page);
  expect(original.count).toBeGreaterThan(1000);
  await page.getByRole("button", { name: "Añadir bloque de texto" }).click();
  await page.getByLabel("Texto del bloque").fill("Texto al borde: ñ");
  await page.getByLabel("Horizontal (%)").fill("100");
  await page.getByLabel("Vertical (%)").fill("100");
  await settled(page);
  const bounds = await page.locator(".placement").boundingBox(),
    sheet = await page.locator(".pdf-stage img").boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    sheet!.x + sheet!.width + 1,
  );
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    sheet!.y + sheet!.height + 1,
  );
  expect(await pixels(page)).toEqual(original);
  const out = await download(page);
  expect(
    (await PDFDocument.load(out.bytes)).getPage(0).node.Annots()!.size(),
  ).toBe(1);
});

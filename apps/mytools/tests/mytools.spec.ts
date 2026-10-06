import { test as base, expect, type Page } from "@playwright/test";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { unzipSync } from "fflate";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
// Optional per-test browser for restricted containers whose single-process browser
// cannot survive context disposal. Normal developer runs use Playwright defaults.
const test = process.env.QA_ISOLATED_BROWSER
  ? base.extend({
      page: async (
        {
          playwright,
          browserName,
          launchOptions,
          viewport,
          isMobile,
          deviceScaleFactor,
          hasTouch,
          userAgent,
          baseURL,
        },
        use,
      ) => {
        const browser = await playwright[browserName].launch(launchOptions);
        try {
          const context = await browser.newContext({
            viewport,
            isMobile,
            deviceScaleFactor,
            hasTouch,
            userAgent,
            baseURL,
          });
          await use(await context.newPage());
        } finally {
          await browser.close();
        }
      },
    })
  : base;
type Upload = { name: string; mimeType: string; buffer: Buffer };
let sample: Upload, one: Upload, many: Upload, form: Upload;
async function pdf(count: number, name: string): Promise<Upload> {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < count; i++) {
    const p = doc.addPage([320 + i * 10, 450 + i * 10]);
    p.drawRectangle({
      x: 25,
      y: 320,
      width: 270,
      height: 90,
      color: rgb(i === 0 ? 0.8 : 0.1, i === 1 ? 0.7 : 0.2, i === 2 ? 0.8 : 0.2),
    });
    p.drawText(`PAGE ${i + 1}`, {
      x: 35,
      y: 360,
      size: 28,
      font,
      color: rgb(1, 1, 1),
    });
    p.drawText("MyTools QA document", { x: 35, y: 290, size: 15, font });
  }
  return {
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  };
}
test.beforeAll(async () => {
  sample = await pdf(3, "documento.pdf");
  one = await pdf(1, "uno.pdf");
  many = await pdf(81, "grande.pdf");
  const d = await PDFDocument.create();
  const p = d.addPage();
  d.getForm().createTextField("name").addToPage(p);
  form = {
    name: "formulario.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await d.save()),
  };
});
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  (page as any).qaErrors = errors;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("./");
});
test.afterEach(async ({ page }) => {
  expect((page as any).qaErrors, "No browser errors").toEqual([]);
});
async function open(page: Page, id: string, files?: Upload[]) {
  await page.goto(`./#/pdf/${id}`);
  if (files) {
    await page.locator("input[type=file]").setInputFiles(files);
    await expect(
      page.getByRole("heading", {
        name:
          files.length > 1 || id === "images-pdf" || id === "merge"
            ? "Tus archivos"
            : "Tus páginas",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".progress-panel")).toHaveCount(0);
  }
}
async function download(page: Page) {
  await page.locator(".process-button").click();
  await expect(
    page.getByRole("heading", { name: "Un archivo menos en tu lista." }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: /Descargar (archivo|ZIP)/ }).click();
  const d = await pending;
  return {
    name: d.suggestedFilename(),
    bytes: await readFile((await d.path())!),
  };
}
async function images(page: Page): Promise<Upload[]> {
  return page
    .evaluate(() =>
      ["red", "blue"].map((color, i) => {
        const c = document.createElement("canvas");
        c.width = i ? 70 : 120;
        c.height = i ? 100 : 80;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, c.width, c.height);
        const type = i ? "image/png" : "image/jpeg",
          data = c.toDataURL(type).split(",")[1];
        return { name: i ? "azul.png" : "roja.jpg", mimeType: type, data };
      }),
    )
    .then((a) =>
      a.map(({ name, mimeType, data }) => ({
        name,
        mimeType,
        buffer: Buffer.from(data, "base64"),
      })),
    );
}
function content(doc: PDFDocument, index: number) {
  const value = doc.getPage(index).node.Contents();
  if (!value) return "";
  const streams =
    value instanceof PDFArray
      ? value.asArray().map((ref) => doc.context.lookup(ref))
      : [value];
  return streams
    .map((s) =>
      s instanceof PDFRawStream
        ? Buffer.from(decodePDFRawStream(s).decode()).toString()
        : "",
    )
    .join("\n");
}

test("home, search, filters, mobile layout, deep-link reload", async ({
  page,
}, info) => {
  await expect(page.locator(".tool-card")).toHaveCount(11);
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => innerWidth),
  );
  await page.getByRole("textbox", { name: "Buscar herramienta" }).fill("rotar");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.locator(".tool-card").click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Rotar páginas", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Todas las herramientas" }).click();
  await page.getByRole("textbox", { name: "Buscar herramienta" }).fill("");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(3);
});

test("JPG to PDF: single image and restart", async ({ page }) => {
  const imgs = await images(page);
  await open(page, "images-pdf", [imgs[0]]);
  const out = await download(page),
    doc = await PDFDocument.load(out.bytes);
  expect(out.name).toBe("imagenes.pdf");
  expect(doc.getPageCount()).toBe(1);
  expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28);
  await page.getByRole("button", { name: "Procesar otro archivo" }).click();
  await expect(page.locator("input[type=file]")).toBeVisible();
  await expect(page.locator(".file-tile")).toHaveCount(0);
});
test("multiple JPG/PNG to PDF: reorder and fit page dimensions", async ({
  page,
}) => {
  const imgs = await images(page);
  await open(page, "images-pdf", imgs);
  await page.getByRole("button", { name: "Bajar archivo 1" }).click();
  await page.getByLabel("Tamaño de página").selectOption("fit");
  const out = await download(page),
    doc = await PDFDocument.load(out.bytes);
  expect(doc.getPageCount()).toBe(2);
  expect(doc.getPage(0).getSize()).toEqual({ width: 52.5, height: 75 });
  expect(doc.getPage(1).getSize()).toEqual({ width: 90, height: 60 });
});
for (const format of ["jpg", "png"])
  test(`PDF to ${format}: multiple pages with valid ZIP images`, async ({
    page,
  }) => {
    await open(page, "pdf-images", [sample]);
    await page.getByLabel("Formato de salida").selectOption(format);
    const out = await download(page),
      entries = unzipSync(out.bytes);
    expect(out.name).toBe("documento-imagenes.zip");
    expect(Object.keys(entries)).toHaveLength(3);
    for (const [name, bytes] of Object.entries(entries)) {
      expect(name).toMatch(new RegExp(`pagina-[123]\\.${format}$`));
      expect(Array.from(bytes.slice(0, format === "jpg" ? 2 : 4))).toEqual(
        format === "jpg" ? [255, 216] : [137, 80, 78, 71],
      );
    }
  });
test("PDF to image: single page, raster dimensions and color", async ({
  page,
}) => {
  await open(page, "pdf-images", [one]);
  const out = await download(page);
  expect(out.name).toBe("uno-pagina-1.jpg");
  const data = await page.evaluate(async (bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
      url = URL.createObjectURL(blob),
      img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const pixel = Array.from(
      ctx.getImageData(
        Math.round(img.width * 0.3),
        Math.round(img.height * 0.15),
        1,
        1,
      ).data,
    );
    URL.revokeObjectURL(url);
    return { width: img.width, height: img.height, pixel };
  }, Array.from(out.bytes));
  expect(data.height).toBe(1800);
  expect(data.width).toBe(1280);
  expect(data.pixel[0]).toBeGreaterThan(data.pixel[1] * 2);
});
for (const n of [2, 5])
  test(`merge ${n} PDF documents, preserve order`, async ({ page }) => {
    await open(
      page,
      "merge",
      Array.from({ length: n }, (_, i) => ({
        ...(i % 2 ? one : sample),
        name: `doc-${i}.pdf`,
      })),
    );
    await page.getByRole("button", { name: "Bajar archivo 1" }).click();
    const out = await download(page),
      doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(
      Array.from({ length: n }, (_, i) => (i % 2 ? 1 : 3)).reduce(
        (a, b) => a + b,
      ),
    );
    expect(doc.getPage(1).getWidth()).toBe(320);
    expect(doc.getPage(2).getWidth()).toBe(330);
  });
test("split: one PDF per page", async ({ page }) => {
  await open(page, "split", [sample]);
  const out = await download(page),
    entries = unzipSync(out.bytes);
  expect(Object.keys(entries)).toHaveLength(3);
  for (let i = 0; i < 3; i++) {
    const doc = await PDFDocument.load(entries[`documento-parte-${i + 1}.pdf`]);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBe(320 + i * 10);
  }
});
test("split: custom groups", async ({ page }) => {
  await open(page, "split", [sample]);
  await page.getByLabel("Grupos de páginas (opcional)").fill("1-2; 3");
  const out = await download(page),
    entries = unzipSync(out.bytes);
  expect(Object.keys(entries)).toHaveLength(2);
  expect(
    (await PDFDocument.load(entries["documento-parte-1.pdf"])).getPageCount(),
  ).toBe(2);
});
test("extract: select last and first through range", async ({ page }) => {
  await open(page, "extract", [sample]);
  await page.getByLabel("Seleccionar páginas", { exact: true }).fill("1,3");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  const doc = await PDFDocument.load((await download(page)).bytes);
  expect(doc.getPages().map((p) => p.getWidth())).toEqual([320, 340]);
});
for (const indexes of [[2], [1, 3]])
  test(`delete pages ${indexes.join(",")}`, async ({ page }) => {
    await open(page, "delete", [sample]);
    for (const i of indexes)
      await page
        .getByRole("checkbox", { name: `Eliminar página ${i}`, exact: true })
        .check();
    const doc = await PDFDocument.load((await download(page)).bytes);
    expect(doc.getPages().map((p) => p.getWidth())).toEqual(
      [320, 330, 340].filter((_, i) => !indexes.includes(i + 1)),
    );
  });
test("delete cannot produce empty PDF", async ({ page }) => {
  await open(page, "delete", [sample]);
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await page.locator(".process-button").click();
  await expect(page.getByRole("alert")).toContainText(
    "conservar al menos una página",
  );
  await expect(page.locator(".process-button")).toBeEnabled();
});
test("reorder using accessible touch buttons", async ({ page }, info) => {
  await open(page, "reorder", [sample]);
  await page
    .getByRole("button", { name: "Atrasar página 1", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("reorder.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const doc = await PDFDocument.load((await download(page)).bytes);
  expect(doc.getPages().map((p) => p.getWidth())).toEqual([330, 320, 340]);
});
test("reorder with pointer drag handle", async ({ page }) => {
  await open(page, "reorder", [sample]);
  const handle = page.locator('[data-page="1"] .sort-handle'),
    target = page.locator('[data-page="3"]');
  const a = await handle.boundingBox(),
    b = await target.boundingBox();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  expect(
    await page
      .locator(".page-card")
      .evaluateAll((cards) => cards.map((c) => c.getAttribute("data-page"))),
  ).toEqual(["2", "3", "1"]);
  const doc = await PDFDocument.load((await download(page)).bytes);
  expect(doc.getPages().map((p) => p.getWidth())).toEqual([330, 340, 320]);
});
for (const all of [false, true])
  test(`rotate ${all ? "multiple" : "single"} pages`, async ({ page }) => {
    await open(page, "rotate", [sample]);
    if (all)
      await page.getByRole("button", { name: "Girar selección" }).click();
    else
      await page
        .getByRole("button", { name: "Girar página 2", exact: true })
        .click();
    const doc = await PDFDocument.load((await download(page)).bytes);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual(
      all ? [90, 90, 90] : [0, 90, 0],
    );
  });
test("watermark in every page content", async ({ page }) => {
  await open(page, "watermark", [sample]);
  await page.getByLabel("Texto de la marca").fill("REVISADO");
  const doc = await PDFDocument.load((await download(page)).bytes);
  for (let i = 0; i < 3; i++)
    expect(content(doc, i)).toContain(
      Buffer.from("REVISADO").toString("hex").toUpperCase(),
    );
});
test("number pages sequentially from custom starting number", async ({
  page,
}) => {
  await open(page, "number", [sample]);
  await page.getByLabel("Empezar por").fill("7");
  const doc = await PDFDocument.load((await download(page)).bytes);
  for (let i = 0; i < 3; i++)
    expect(content(doc, i)).toContain(
      `<${Buffer.from(String(7 + i)).toString("hex")}>`,
    );
});
test("crop preserves original content but reduces CropBox", async ({
  page,
}) => {
  await open(page, "crop", [sample]);
  const doc = await PDFDocument.load((await download(page)).bytes);
  for (let i = 0; i < 3; i++) {
    expect(doc.getPage(i).getCropBox().width).toBeCloseTo(
      (320 + i * 10) * 0.84,
    );
    expect(doc.getPage(i).getMediaBox().width).toBe(320 + i * 10);
  }
});
test("invalid extension, corrupted and renamed files have friendly errors", async ({
  page,
}) => {
  await open(page, "merge");
  for (const name of ["wrong.txt", "broken.pdf"]) {
    await page.locator("input[type=file]").setInputFiles({
      name,
      mimeType: "application/octet-stream",
      buffer: Buffer.from("not a pdf"),
    });
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).not.toContainText("TypeError");
  }
  await page.locator("input[type=file]").setInputFiles({
    name: "truncated.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\ntruncated"),
  });
  await expect(page.getByRole("alert")).toContainText("dañado");
  await expect(page.locator(".progress-panel")).toHaveCount(0);
});
test("file count, individual size and page limits", async ({ page }) => {
  await open(page, "merge");
  await page
    .locator("input[type=file]")
    .setInputFiles(
      Array.from({ length: 21 }, (_, i) => ({ ...one, name: `f${i}.pdf` })),
    );
  await expect(page.getByRole("alert")).toContainText("máximo de 20");
  await page.locator("input[type=file]").setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(16 * 1024 * 1024),
  });
  await expect(page.getByRole("alert")).toContainText("15 MB");
  await page.locator("input[type=file]").setInputFiles(many);
  await expect(page.getByRole("alert")).toContainText("80 páginas");
});
test("no user-file upload or third-party requests during processing", async ({
  page,
}) => {
  const unexpected: string[] = [];
  page.on("request", (r) => {
    if (
      r.method() !== "GET" ||
      (r.url().startsWith("http") &&
        new URL(r.url()).origin !== new URL(page.url()).origin)
    )
      unexpected.push(r.method() + " " + r.url());
  });
  await open(page, "number", [sample]);
  await download(page);
  expect(unexpected).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
});
test("reject interactive forms instead of silently damaging them", async ({
  page,
}) => {
  await open(page, "number", [form]);
  await page.locator(".process-button").click();
  await expect(page.getByRole("alert")).toContainText(
    "formularios o firmas interactivas",
  );
});

test("protected PDF gives a clear error and allows retry", async ({ page }) => {
  await open(page, "number");
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/protected.pdf");
  await expect(page.getByRole("alert")).toContainText("protegido");
  await expect(page.locator(".progress-panel")).toHaveCount(0);
  await page.locator("input[type=file]").setInputFiles(one);
  await expect(
    page.getByRole("heading", { name: "Tus páginas" }),
  ).toBeVisible();
  await download(page);
});
test("combined file size limit is enforced before opening files", async ({
  page,
}) => {
  await open(page, "merge");
  await page.locator("input[type=file]").setInputFiles(
    Array.from({ length: 3 }, (_, i) => ({
      name: `file-${i}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.alloc(14 * 1024 * 1024),
    })),
  );
  await expect(page.getByRole("alert")).toContainText("límite total de 40 MB");
  await expect(page.locator(".progress-panel")).toHaveCount(0);
});
test("invalid ranges and unsupported watermark characters are recoverable", async ({
  page,
}) => {
  await open(page, "watermark", [sample]);
  await page.getByLabel("Seleccionar páginas", { exact: true }).fill("1-99");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("entre 1 y 3");
  await page.getByLabel("Texto de la marca").fill("🚀");
  await page.locator(".process-button").click();
  await expect(page.getByRole("alert")).toContainText(
    "emojis no son compatibles",
  );
  await page.getByLabel("Texto de la marca").fill("LISTO");
  await download(page);
});
test("PDF image export cap and oversize image dimensions fail safely", async ({
  page,
}) => {
  await open(page, "pdf-images", [await pdf(31, "treinta-y-uno.pdf")]);
  await page.locator(".process-button").click();
  await expect(page.getByRole("alert")).toContainText("máximo de 30 páginas");
  await open(page, "images-pdf");
  const bytes = Buffer.alloc(24);
  bytes.writeUInt32BE(0x89504e47, 0);
  bytes.writeUInt32BE(0x0d0a1a0a, 4);
  bytes.writeUInt32BE(8000, 16);
  bytes.writeUInt32BE(8000, 20);
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: bytes });
  await expect(page.getByRole("alert")).toContainText("24 megapíxeles");
});
test("desktop dropzone accepts a real file drop", async ({ page }) => {
  await open(page, "merge");
  const dt = await page.evaluateHandle((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(
      new File([new Uint8Array(bytes)], "drop.pdf", {
        type: "application/pdf",
      }),
    );
    return dt;
  }, Array.from(one.buffer));
  await page.locator(".dropzone").dispatchEvent("drop", { dataTransfer: dt });
  await expect(page.locator(".file-tile")).toHaveCount(1);
  await expect(page.locator(".progress-panel")).toHaveCount(0);
  await dt.dispose();
});

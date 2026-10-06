export type Field = {
  id: string;
  label: string;
  example: string;
  required?: boolean;
  type?: "date" | "long";
  max?: number;
};
export type Template = {
  id: string;
  name: string;
  description: string;
  fields: Field[];
  build: (values: Record<string, string>) => string;
};
const person: Field = {
  id: "name",
  label: "Nombre del remitente",
  example: "María Pérez",
  required: true,
  max: 160,
};
const place: Field = {
  id: "place",
  label: "Lugar",
  example: "Madrid",
  required: true,
  max: 120,
};
const date: Field = {
  id: "date",
  label: "Fecha de comunicación",
  example: "Selecciona la fecha",
  type: "date",
  required: true,
};
const recipient: Field = {
  id: "recipient",
  label: "Destinatario (opcional)",
  example: "Departamento de Recursos Humanos",
  max: 200,
};
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
const header = (v: Record<string, string>) =>
  `${v.place}, ${formatDate(v.date)}`;
const signature = (v: Record<string, string>) =>
  `Atentamente,\n\n\n____________________________\n${v.name}`;
export const TEMPLATES: Template[] = [
  {
    id: "carta-generica",
    name: "Carta genérica",
    description: "Una carta sencilla, con tus propias palabras.",
    fields: [
      person,
      recipient,
      place,
      date,
      {
        id: "subject",
        label: "Asunto (opcional)",
        example: "Comunicación personal",
        max: 200,
      },
      {
        id: "body",
        label: "Mensaje",
        example: "Me pongo en contacto con ustedes para…",
        type: "long",
        required: true,
        max: 50000,
      },
    ],
    build: (v) =>
      [
        header(v),
        v.recipient && `A la atención de: ${v.recipient}`,
        v.subject && `Asunto: ${v.subject}`,
        v.body,
        signature(v),
      ]
        .filter(Boolean)
        .join("\n\n"),
  },
  {
    id: "solicitud-formal",
    name: "Solicitud formal genérica",
    description: "Expón tu situación y lo que necesitas solicitar.",
    fields: [
      person,
      {
        id: "entity",
        label: "Entidad o empresa",
        example: "Centro de formación",
        required: true,
        max: 200,
      },
      recipient,
      place,
      date,
      {
        id: "subject",
        label: "Asunto",
        example: "Solicitud de certificado",
        required: true,
        max: 200,
      },
      {
        id: "background",
        label: "Exposición",
        example: "He completado la formación…",
        type: "long",
        required: true,
        max: 24000,
      },
      {
        id: "request",
        label: "Solicitud",
        example: "Solicito que se emita el certificado correspondiente…",
        type: "long",
        required: true,
        max: 24000,
      },
    ],
    build: (v) =>
      [
        header(v),
        v.entity,
        v.recipient && `A la atención de: ${v.recipient}`,
        `Asunto: ${v.subject}`,
        `EXPONGO:\n${v.background}`,
        `SOLICITO:\n${v.request}`,
        signature(v),
      ]
        .filter(Boolean)
        .join("\n\n"),
  },
  {
    id: "baja-voluntaria",
    name: "Baja voluntaria laboral",
    description:
      "Comunica tu decisión y la fecha efectiva de baja. Orientada a España.",
    fields: [
      { ...person, label: "Nombre del trabajador" },
      {
        id: "company",
        label: "Empresa",
        example: "Empresa Ejemplo, S. L.",
        required: true,
        max: 200,
      },
      recipient,
      place,
      date,
      {
        id: "effective",
        label: "Fecha efectiva de baja",
        example: "Indica la fecha en la que se hará efectiva",
        type: "date",
        required: true,
      },
      {
        id: "extra",
        label: "Texto adicional (opcional)",
        example: "Gracias por la oportunidad de formar parte del equipo.",
        type: "long",
        max: 50000,
      },
    ],
    build: (v) =>
      [
        header(v),
        `A ${v.company}${v.recipient ? `\nA la atención de: ${v.recipient}` : ""}`,
        "Asunto: comunicación de baja voluntaria",
        `Por medio de la presente, yo, ${v.name}, comunico mi decisión de causar baja voluntaria en ${v.company}, con fecha efectiva de baja el ${formatDate(v.effective)}.`,
        v.extra,
        signature(v),
      ]
        .filter(Boolean)
        .join("\n\n"),
  },
];
export function validateTemplate(
  template: Template,
  values: Record<string, string>,
) {
  const errors: Record<string, string> = {};
  for (const f of template.fields) {
    const v = (values[f.id] || "").trim();
    if (f.required && !v) errors[f.id] = `Completa «${f.label}».`;
    else if (
      f.type === "date" &&
      v &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
        Number.isNaN(new Date(`${v}T12:00:00`).getTime()) ||
        new Date(`${v}T12:00:00`).toISOString().slice(0, 10) !== v)
    )
      errors[f.id] = "Selecciona una fecha válida.";
    else if (v.length > (f.max || 200))
      errors[f.id] = `Usa hasta ${f.max || 200} caracteres.`;
  }
  return errors;
}

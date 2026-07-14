import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const txtPath = path.join(repoRoot, "Kid Health Log - UAT Test Cases - v2.4.txt");
const outPath = path.join(
  path.dirname(repoRoot),
  "Kid Health Log - UAT Test Cases - v2.4.docx",
);

const utf8 = fs.readFileSync(txtPath, "utf8");
const lines = utf8.split(/\r?\n/);

const docTitle = lines[0]?.trim() ?? "UAT Test Cases";
const changelog = [];
const sections = [];
let currentSection = null;
let headers = ["ID", "Module", "Scenario", "Steps", "Expected Result", "Status"];

for (const line of lines) {
  const trim = line.trim();
  if (!trim) continue;
  if (/^UAT ç”¨æˆ·|^æ›´æ–°è¯´æ˜Ž|^éªŒæ”¶è®°å½•|^æ±‡æ€»/.test(trim)) continue;

  if (
    /\(Guest Flow|\(Episode CRUD|\(Log CRUD|\(Data Lifecycle|\(Pro Purchase|\(Legal & Medical Disclaimer|\(Dashboard Analytics|\(Temperature Unit/.test(
      trim,
    )
  ) {
    if (currentSection) sections.push(currentSection);
    currentSection = { title: trim, rows: [] };
    continue;
  }

  if (/^-\s+/.test(trim)) {
    changelog.push(trim);
    continue;
  }

  if (/Steps\).*Status|Expected Result\).*Status/.test(trim)) {
    headers = trim.split(/\s*\|\s*/).map((p) => p.trim());
    continue;
  }

  if (/^UAT-\d{2}\s*\|/.test(trim)) {
    if (!currentSection) continue;
    const parts = trim.split(/\s*\|\s*/, 6);
    if (parts.length >= 6) {
      const steps = parts[3]
        .trim()
        .replace(/\.\s+(?=\d+\.)/g, ".\n");
      const expected = parts[4]
        .trim()
        .replace(/\.\s+(?=\d+\.)/g, ".\n");
      currentSection.rows.push([
        parts[0].trim(),
        parts[1].trim(),
        parts[2].trim(),
        steps,
        expected,
        parts[5].trim(),
      ]);
    }
  }
}
if (currentSection) sections.push(currentSection);

function cell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(text),
            bold: opts.bold,
            size: opts.bold ? 18 : 16,
          }),
        ],
      }),
    ],
  });
}

const sectionBlocks = [];

sectionBlocks.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: docTitle, bold: true, size: 32 })],
  }),
);

sectionBlocks.push(
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: "v2.4 Changelog", bold: true, size: 22 })],
  }),
);

for (const item of changelog) {
  sectionBlocks.push(
    new Paragraph({
      indent: { left: 360 },
      children: [new TextRun({ text: item, size: 20 })],
    }),
  );
}

const widths = [780, 1080, 1500, 2025, 3150, 900];

for (const section of sections) {
  sectionBlocks.push(
    new Paragraph({
      spacing: { before: 240 },
      children: [new TextRun({ text: section.title, bold: true, size: 24 })],
    }),
  );

  const tableRows = [
    new TableRow({
      children: headers.map((h, i) => cell(h, { bold: true, center: true, width: widths[i] })),
    }),
    ...section.rows.map(
      (row) =>
        new TableRow({
          children: row.map((value, i) =>
            cell(value, { center: i === 0 || i === 5, width: widths[i] }),
          ),
        }),
    ),
  ];

  sectionBlocks.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    }),
  );
}

const doc = new Document({ sections: [{ children: sectionBlocks }] });
const buffer = await Packer.toBuffer(doc);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buffer);

const totalCases = sections.reduce((n, s) => n + s.rows.length, 0);
console.log(`Created: ${outPath}`);
console.log(`Sections: ${sections.length}; Cases: ${totalCases}`);


import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = process.argv[2];
const outputPath = process.argv[3];

if (!sourcePath || !outputPath) {
  throw new Error("Usage: node build-regatas-groups.mjs <source.xlsx> <output.xlsx>");
}

const categories = ["Primera", "Segunda", "Tercera", "Cuarta"];

const roster = [
  ["1A-1", "Primera", "A", "Hernán Fontana", "Luis Darío"],
  ["1A-2", "Primera", "A", "Alan Finelli", "Fernando Laguillo"],
  ["1A-3", "Primera", "A", "Bruno Romero", "Andrés Frúgoli"],
  ["1A-4", "Primera", "A", "Carlos Erreguerena", "Valentino Palumbo"],
  ["1A-5", "Primera", "A", "Tomás Molteno", "Matías Poblete"],
  ["2A-1", "Segunda", "A", "Ariel Vives", "Lucas Vives"],
  ["2A-2", "Segunda", "A", "Bautista Latuf", "Fernando Losilla"],
  ["2A-3", "Segunda", "A", "Mariano López", "Ariel Astesiano"],
  ["2A-4", "Segunda", "A", "Rubén Poblete", "Osvaldo Calderón"],
  ["2A-5", "Segunda", "A", "Fabián Tello", "Gonzalo Zulueta"],
  ["2B-1", "Segunda", "B", "Sebastián Fleury", "Danilo Morea"],
  ["2B-2", "Segunda", "B", "Goyo Tomasiello", "Armando Masetto"],
  ["2B-3", "Segunda", "B", "Marcos Bustamante", "Nicolás Quesada"],
  ["2B-4", "Segunda", "B", "Gonzalo Martínez", "Matías Lombardi"],
  ["2B-5", "Segunda", "B", "Mauricio Olmedo", "Andrés Cruzzocrea"],
  ["3A-1", "Tercera", "A", "Fabián Tello", "Diego Berna"],
  ["3A-2", "Tercera", "A", "Álvaro Zulueta", "Sebastián Masetto"],
  ["3A-3", "Tercera", "A", "Erik Castro", "Osvaldo Calderón"],
  ["3A-4", "Tercera", "A", "Mario Margutti", "Mario Cuevas"],
  ["3B-1", "Tercera", "B", "Bautista Latuf", "Ignacio Corso"],
  ["3B-2", "Tercera", "B", "Juan Portugal", "Martín Guerra"],
  ["3B-3", "Tercera", "B", "Isaías Fernández", "Benicio Zulueta"],
  ["3B-4", "Tercera", "B", "Walter Palma", "Santiago Rial"],
  ["4A-1", "Cuarta", "A", "Juan Chondro", "Carlos Castrillejo"],
  ["4A-2", "Cuarta", "A", "Daniel Pereyra", "Luis Lopez"],
  ["4A-3", "Cuarta", "A", "Agustín Flores", "Amparo Castrillejo"],
  ["4A-4", "Cuarta", "A", "Nicolás Quiroga", "Mariano Briffi"],
  ["4B-1", "Cuarta", "B", "Javier Arraya", "Gabriel Fernández"],
  ["4B-2", "Cuarta", "B", "Franco Spertino", "Alma Astesiano"],
  ["4B-3", "Cuarta", "B", "Benjamín Zamorano", "Valentín Olguín"],
  ["4B-4", "Cuarta", "B", "Manuel Luciarte", "Gonzalo Marzal"],
];

const normalize = value =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*[-/]\s*/g, "/")
    .replace(/[^a-z0-9/ ]/g, "")
    .trim();

const pairKey = (player1, player2) => normalize(`${player1}/${player2}`);
const pairByName = new Map(roster.map(pair => [pairKey(pair[3], pair[4]), pair]));
const addAlias = (alias, player1, player2) =>
  pairByName.set(normalize(alias), pairByName.get(pairKey(player1, player2)));

addAlias("Tello / Zulueta", "Fabián Tello", "Gonzalo Zulueta");
addAlias("GoyoTomasiello / Armando Masetto", "Goyo Tomasiello", "Armando Masetto");
addAlias("Alan Finell / Fernando Laguillo", "Alan Finelli", "Fernando Laguillo");
addAlias("Mario Marguti / Mario Cuevas", "Mario Margutti", "Mario Cuevas");

const normalizeCategory = value => {
  const category = value.trim().toLowerCase();
  const match = categories.find(item => item.toLowerCase() === category);
  if (!match) throw new Error(`Unknown category: ${value}`);
  return match;
};

const excelDateToIso = value => {
  const date = new Date(Date.UTC(1899, 11, 30) + Number(value) * 86_400_000);
  return date.toISOString().slice(0, 10);
};

const formatTime = value => {
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  }
  return String(value).replace(".", ":").padStart(5, "0");
};

const score = values => {
  const pairs = [[8, 9], [11, 12], [14, 15]];
  const sets = pairs.flatMap(([a, b]) => {
    if (values[a] == null && values[b] == null) return [];
    if (!Number.isFinite(values[a]) || !Number.isFinite(values[b])) return [null];
    return [`${values[a]}-${values[b]}`];
  });
  return sets.includes(null) ? null : sets.join(" ");
};

const source = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sourceRows = source.worksheets.getItem("partidos por día").getRange("A2:Q62").values;

const matches = [];
for (const values of sourceRows) {
  if (!["A", "B", "C"].includes(values[5])) continue;

  const a = pairByName.get(normalize(values[6]));
  const b = pairByName.get(normalize(values[7]));
  if (!a || !b) throw new Error(`Unmapped pair in source match ${values[0]}: ${values[6]} vs ${values[7]}`);
  if (a[1] !== b[1]) throw new Error(`Cross-category match in source match ${values[0]}`);
  if (a[2] !== b[2]) throw new Error(`Cross-zone match in source match ${values[0]}`);

  const sourceZone = values[5];
  const correctedZone = a[2];
  const convertedScore = score(values);
  const notes = [];
  if (sourceZone !== correctedZone) notes.push("Zona corregida al cruzar con la pestaña zonas.");
  if (convertedScore === null) notes.push("Marcador histórico incompleto; revisar fuente original.");
  if (values[16]) notes.push(String(values[16]));

  matches.push([
    String(matches.length + 1),
    String(values[1]),
    excelDateToIso(values[2]),
    formatTime(values[3]),
    normalizeCategory(values[4]),
    "grupo",
    correctedZone,
    a[0],
    null,
    b[0],
    null,
    convertedScore ?? "",
    notes.join(" ") || null,
  ]);
}

const workbook = Workbook.create();
const pairsSheet = workbook.worksheets.add("parejas");
const matchesSheet = workbook.worksheets.add("partidos");
const referenceSheet = workbook.worksheets.add("_referencia");

for (const sheet of [pairsSheet, matchesSheet, referenceSheet]) {
  sheet.showGridLines = false;
  sheet.tabColor = "#1F4E78";
}

pairsSheet.getRange(`A1:E${roster.length + 1}`).values = [
  ["id", "categoria", "zona", "jugador_1", "jugador_2"],
  ...roster,
];

const headers = ["id", "dia", "fecha", "hora", "categoria", "fase", "zona", "pareja_a", "equipo_a", "pareja_b", "equipo_b", "sets", "nota"];
matchesSheet.getRange(`A1:M${matches.length + 1}`).values = [headers, ...matches];

const finalPairRow = roster.length + 1;
for (let row = 2; row <= matches.length + 1; row += 1) {
  matchesSheet.getRange(`I${row}`).formulas = [[`=IFERROR(VLOOKUP(H${row},parejas!$A$2:$E$${finalPairRow},4,FALSE)&" / "&VLOOKUP(H${row},parejas!$A$2:$E$${finalPairRow},5,FALSE),H${row})`]];
  matchesSheet.getRange(`K${row}`).formulas = [[`=IFERROR(VLOOKUP(J${row},parejas!$A$2:$E$${finalPairRow},4,FALSE)&" / "&VLOOKUP(J${row},parejas!$A$2:$E$${finalPairRow},5,FALSE),J${row})`]];
}

const reference = [
  ["Regatas — importación de fase de grupos", null],
  ["Origen", "Clausura REGATAS HORARIOS - RESULTADOS.xlsx"],
  ["Alcance", "Solo partidos de fase grupo. No incluye semis ni finales."],
  ["Regla", "Los ids son nuevos y únicos. Los nombres se normalizaron desde la pestaña zonas."],
  ["Revisión", "Las notas indican datos corregidos por zona o marcadores históricos incompletos."],
  [],
  ["Uso", "Publicar las pestañas parejas y partidos como CSV cuando el sitio necesite leerlas."],
  ["Marcador", "Vacío = pendiente. No hay columna estado. W.O. se carga como 12-0 12-0."],
];
referenceSheet.getRange(`A1:B${reference.length}`).values = reference;

const headerFormat = {
  fill: "#1F4E78",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
const bodyFormat = { font: { name: "Arial", size: 10, color: "#1F2937" }, verticalAlignment: "center" };

for (const [sheet, range] of [[pairsSheet, `A1:E${roster.length + 1}`], [matchesSheet, `A1:M${matches.length + 1}`]]) {
  sheet.getRange(range).format = bodyFormat;
  sheet.getRange(range).format.borders = { preset: "insideHorizontal", style: "thin", color: "#E5E7EB" };
  sheet.getRange(`A1:${range.split(":")[1].replace(/\d+$/, "1")}`).format = headerFormat;
  sheet.getRange(range).format.autofitColumns();
  sheet.getRange(range).format.autofitRows();
  sheet.freezePanes.freezeRows(1);
}

pairsSheet.getRange("A:E").format.wrapText = false;
matchesSheet.getRange("A:M").format.wrapText = false;
matchesSheet.getRange(`M2:M${matches.length + 1}`).format.wrapText = true;
matchesSheet.getRange(`L2:L${matches.length + 1}`).conditionalFormats.add("notContainsBlanks", { format: { fill: "#ECFDF5" } });
matchesSheet.getRange(`H2:H${matches.length + 1}`).dataValidation = { rule: { type: "list", formula1: `parejas!$A$2:$A$${finalPairRow}` } };
matchesSheet.getRange(`J2:J${matches.length + 1}`).dataValidation = { rule: { type: "list", formula1: `parejas!$A$2:$A$${finalPairRow}` } };

pairsSheet.getRange("A:A").format.columnWidth = 12;
pairsSheet.getRange("B:C").format.columnWidth = 14;
pairsSheet.getRange("D:E").format.columnWidth = 24;
matchesSheet.getRange("A:A").format.columnWidth = 8;
matchesSheet.getRange("B:B").format.columnWidth = 14;
matchesSheet.getRange("C:D").format.columnWidth = 13;
matchesSheet.getRange("E:G").format.columnWidth = 13;
matchesSheet.getRange("H:H").format.columnWidth = 12;
matchesSheet.getRange("I:I").format.columnWidth = 32;
matchesSheet.getRange("J:J").format.columnWidth = 12;
matchesSheet.getRange("K:K").format.columnWidth = 32;
matchesSheet.getRange("L:L").format.columnWidth = 18;
matchesSheet.getRange("M:M").format.columnWidth = 48;

referenceSheet.getRange(`A1:B${reference.length}`).format = bodyFormat;
referenceSheet.getRange("A1:B1").format = { fill: "#1F4E78", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" } };
referenceSheet.getRange("A:A").format.columnWidth = 18;
referenceSheet.getRange("B:B").format.columnWidth = 92;

workbook.recalculate();

const checks = await workbook.inspect({ kind: "table", range: `partidos!A1:M${matches.length + 1}`, include: "values,formulas", tableMaxRows: 55, tableMaxCols: 13 });
if (!checks.ndjson.includes('"grupo"')) throw new Error("The group-stage data was not written.");
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
if (errors.ndjson.includes('"matches":[') && !errors.ndjson.includes('"matches":[]')) throw new Error(`Formula errors detected: ${errors.ndjson}`);

const outputDir = outputPath.slice(0, outputPath.lastIndexOf("/"));
await fs.mkdir(outputDir, { recursive: true });
for (const sheetName of ["parejas", "partidos", "_referencia"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1.2, format: "png" });
  await fs.writeFile(`${outputDir}/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(JSON.stringify({ outputPath, pairs: roster.length, groupMatches: matches.length }, null, 2));

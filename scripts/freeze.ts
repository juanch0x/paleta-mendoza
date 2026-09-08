import fs from "node:fs/promises"
import path from "node:path"

import { fetchCsv } from "../src/data/fetch-csv.js"
import { freezeTournament, type TournamentMetadata } from "../src/data/freeze.js"

type RegistryEntry = TournamentMetadata & { alcance: string }

const option = (name: string) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const requiredOption = (name: string) => {
  const value = option(name)
  if (!value || value.startsWith("--")) throw new Error(`Falta ${name}.`)
  return value
}

if (process.argv.includes("--help")) {
  console.log("Uso: pnpm freeze -- --slug <slug> --nombre <nombre> --fecha <mes y año> --parejas-url <csv> --partidos-url <csv> [--overwrite]")
  process.exit(0)
}

const metadata: TournamentMetadata = {
  slug: requiredOption("--slug"),
  nombre: requiredOption("--nombre"),
  fecha: requiredOption("--fecha"),
}
const parejasUrl = requiredOption("--parejas-url")
const partidosUrl = requiredOption("--partidos-url")
const overwrite = process.argv.includes("--overwrite")

const [parejasCsv, partidosCsv] = await Promise.all([fetchCsv(parejasUrl), fetchCsv(partidosUrl)])
const tournament = freezeTournament(metadata, parejasCsv, partidosCsv)

const dataDirectory = path.resolve("src/data/torneos")
const archiveDirectory = path.join(dataDirectory, "archivos")
const archivePath = path.join(archiveDirectory, `${metadata.slug}.json`)
const registryPath = path.join(dataDirectory, "registro.json")

await fs.mkdir(archiveDirectory, { recursive: true })

try {
  await fs.access(archivePath)
  if (!overwrite) throw new Error(`Ya existe ${archivePath}. Usá --overwrite solo para corregir un histórico.`)
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("ENOENT")) throw error
}

const registry = JSON.parse(await fs.readFile(registryPath, "utf8")) as RegistryEntry[]
const entry: RegistryEntry = { slug: tournament.slug, nombre: tournament.nombre, fecha: tournament.fecha, alcance: tournament.alcance }
const nextRegistry = [...registry.filter((item) => item.slug !== metadata.slug), entry]

await fs.writeFile(archivePath, `${JSON.stringify(tournament, null, 2)}\n`)
await fs.writeFile(registryPath, `${JSON.stringify(nextRegistry, null, 2)}\n`)

console.log(`Congelado ${tournament.nombre}: ${tournament.parejas.length} parejas y ${tournament.partidos.length} partidos.`)

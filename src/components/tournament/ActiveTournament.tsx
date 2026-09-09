import { useEffect, useMemo, useState } from "react"

import { loadActiveTournament, type ActiveTournament } from "@/data/active-tournament"
import { mockActiveTournament } from "@/data/mock-active-tournament"
import { buildStandings, type StandingRow } from "@/domain/standings"
import type { Pareja, Participante, PartidoResuelto } from "@/domain/types"

type Props = {
  parejasUrl?: string
  partidosUrl?: string
  showMock?: boolean
  initialTournament?: ActiveTournament
  archived?: boolean
}

type TournamentState =
  | { status: "missing-source" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; tournament: ActiveTournament; updatedAt: Date; source: "live" | "mock" | "archive" }

const PHASE_ORDER: Record<string, number> = {
  final: 0,
  semi: 1,
  cuartos: 2,
  octavos: 3,
  repechaje: 4,
}

const PHASE_LABELS: Record<string, string> = {
  grupo: "Fase de grupos",
  repechaje: "Repechaje",
  octavos: "Octavos de final",
  cuartos: "Cuartos de final",
  semi: "Semifinales",
  final: "Final",
}

const visible = (partido: PartidoResuelto) => Boolean(partido.fecha) || partido.sets.length > 0

const participantName = (participante: Participante) =>
  participante.tipo === "pareja" ? participante.pareja.nombre : participante.label

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")

const sortByDate = (a: PartidoResuelto, b: PartidoResuelto) => {
  const aDate = a.fecha ? `${a.fecha}T${a.hora ?? "23:59"}` : "9999-12-31T23:59"
  const bDate = b.fecha ? `${b.fecha}T${b.hora ?? "23:59"}` : "9999-12-31T23:59"
  return aDate.localeCompare(bDate)
}

const formatDateTime = (partido: PartidoResuelto) => {
  if (!partido.fecha) return "Resultado cargado"

  const date = new Date(`${partido.fecha}T00:00:00`)
  const formattedDate = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date)

  return partido.hora ? `${formattedDate} · ${partido.hora}` : formattedDate
}

const formatUpdatedAt = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)

const scoreFor = (partido: PartidoResuelto, side: 0 | 1) => partido.sets.map(set => set[side]).join(" · ")

const phaseLabel = (phase: string) => PHASE_LABELS[phase] ?? phase

function MatchCard({ partido }: { partido: PartidoResuelto }) {
  const hasScore = partido.sets.length > 0
  const winner = hasScore
    ? partido.sets.reduce<[number, number]>(
        ([a, b], set) => (set[0] > set[1] ? [a + 1, b] : [a, b + 1]),
        [0, 0],
      )
    : undefined
  const aWon = winner !== undefined && winner[0] > winner[1]
  const bWon = winner !== undefined && winner[1] > winner[0]

  return (
    <article className="rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3 text-xs font-semibold tracking-wide uppercase">
        <span className="text-accent">{formatDateTime(partido)}</span>
        <span className={hasScore ? "rounded-full bg-accent/15 px-2.5 py-1 text-accent" : "rounded-full bg-muted px-2.5 py-1"}>
          {hasScore ? "Finalizado" : "Programado"}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-3 text-sm sm:text-base">
        <span className={aWon ? "font-bold" : "font-medium"}>{participantName(partido.a)}</span>
        <span className={aWon ? "text-right font-bold text-accent tabular-nums" : "text-right tabular-nums"}>{scoreFor(partido, 0) || "—"}</span>
        <span className={bWon ? "font-bold" : "font-medium"}>{participantName(partido.b)}</span>
        <span className={bWon ? "text-right font-bold text-accent tabular-nums" : "text-right tabular-nums"}>{scoreFor(partido, 1) || "—"}</span>
      </div>
      {partido.nota && <p className="mt-4 border-t border-border pt-3 text-sm text-foreground/70">{partido.nota}</p>}
    </article>
  )
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background">
      <table className="w-full min-w-135 text-sm">
        <thead className="bg-muted/70 text-left text-xs font-semibold tracking-wide uppercase">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Pareja</th>
            <th className="px-3 py-2 text-center">PG</th>
            <th className="px-3 py-2 text-center">PP</th>
            <th className="px-3 py-2 text-center">DS</th>
            <th className="px-3 py-2 text-center">DT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.pareja.id} className={row.posicion === 1 ? "border-t border-border bg-accent/5" : "border-t border-border"}>
              <td className="px-3 py-3 font-bold text-accent">{row.posicion}°</td>
              <td className="px-3 py-3 font-medium">{row.pareja.nombre}</td>
              <td className="px-3 py-3 text-center tabular-nums">{row.pg}</td>
              <td className="px-3 py-3 text-center tabular-nums">{row.pp}</td>
              <td className="px-3 py-3 text-center tabular-nums">{signed(row.dS)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{signed(row.dT)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function Category({ categoria, parejas, partidos }: { categoria: string; parejas: Pareja[]; partidos: PartidoResuelto[] }) {
  const groupMatches = partidos.filter(partido => partido.fase === "grupo")
  const playoffMatches = partidos.filter(partido => partido.fase !== "grupo" && visible(partido))
  const zones = Array.from(new Set(parejas.map(pareja => pareja.zona ?? "")))

  return (
    <section className="mt-10 rounded-2xl border border-border bg-muted/25 p-4 sm:p-6" aria-labelledby={`category-${categoria}`}>
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Categoría</p>
          <h2 id={`category-${categoria}`} className="mt-1 text-2xl font-bold sm:text-3xl">
            {categoria}
          </h2>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
          {parejas.length} parejas
        </span>
      </div>

      {playoffMatches.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          {groupByPhase(playoffMatches).map(([phase, matches], index) => (
            <div key={phase} className={index > 0 ? "mt-8" : ""}>
              <h3 className="text-lg font-bold tracking-wide uppercase">{phaseLabel(phase)}</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {matches.map(partido => (
                  <MatchCard key={partido.id} partido={partido} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {zones.map(zone => {
        const zonePairs = parejas.filter(pareja => (pareja.zona ?? "") === zone)
        const zoneMatches = groupMatches.filter(partido => (partido.zona ?? "") === zone)
        const scheduled = zoneMatches.filter(visible)

        return (
          <div key={zone || "unique"} className="min-w-0 pt-2">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold">{zone ? `Zona ${zone}` : "Zona única"}</h3>
              <span className="text-xs text-foreground/65">Posiciones</span>
            </div>
            <div className="mt-3">
              <StandingsTable rows={buildStandings(zonePairs, zoneMatches)} />
            </div>
            {scheduled.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold tracking-wide uppercase">Partidos</h4>
                {scheduled.map(partido => (
                  <MatchCard key={partido.id} partido={partido} />
                ))}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </section>
  )
}

function groupByPhase(partidos: PartidoResuelto[]) {
  const byPhase = new Map<string, PartidoResuelto[]>()
  for (const partido of partidos) {
    const matches = byPhase.get(partido.fase) ?? []
    matches.push(partido)
    byPhase.set(partido.fase, matches)
  }

  return [...byPhase.entries()].sort(([a], [b]) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99))
}

export default function ActiveTournament({ parejasUrl, partidosUrl, showMock = false, initialTournament, archived = false }: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [state, setState] = useState<TournamentState>(() => {
    if (initialTournament) return { status: "ready", tournament: initialTournament, updatedAt: new Date(), source: "archive" }
    if (parejasUrl && partidosUrl) return { status: "loading" }
    if (showMock) return { status: "ready", tournament: mockActiveTournament, updatedAt: new Date(), source: "mock" }
    return { status: "missing-source" }
  })

  useEffect(() => {
    if (initialTournament || !parejasUrl || !partidosUrl) return

    let cancelled = false
    loadActiveTournament({ parejasUrl, partidosUrl })
      .then(tournament => {
        if (!cancelled) setState({ status: "ready", tournament, updatedAt: new Date(), source: "live" })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" })
      })

    return () => {
      cancelled = true
    }
  }, [initialTournament, parejasUrl, partidosUrl])

  const tournament = state.status === "ready" ? state.tournament : undefined
  const matchesForSearch = useMemo(() => {
    const query = normalizeSearch(searchQuery.trim())
    if (!tournament || !query) return []

    return tournament.partidos
      .filter(visible)
      .filter(partido => normalizeSearch(`${participantName(partido.a)} ${participantName(partido.b)}`).includes(query))
      .sort(sortByDate)
  }, [searchQuery, tournament])

  if (state.status === "missing-source") {
    return <p className="rounded-lg border border-dashed border-border p-5">El torneo activo todavía no está configurado.</p>
  }

  if (state.status === "loading") return <p className="rounded-lg border border-border p-5">Cargando torneo…</p>

  if (state.status === "error") {
    return <p className="rounded-lg border border-border p-5">No pudimos cargar el torneo. Probá de nuevo en unos minutos.</p>
  }

  const categories = Array.from(
    new Set([...state.tournament.parejas.map(pareja => pareja.categoria), ...state.tournament.partidos.map(partido => partido.categoria)]),
  )

  if (categories.length === 0) return <p className="rounded-lg border border-border p-5">Todavía no hay partidos publicados.</p>

  return (
    <>
      <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              {archived ? "Torneo cerrado" : "Seguimiento en vivo"}
            </p>
            <p className="mt-2 text-lg font-bold">
              {archived ? "Resultados y posiciones definitivos." : "Consultá el fixture y las posiciones al instante."}
            </p>
          </div>
          {!archived && <p className="text-sm text-foreground/70">Actualizado: {formatUpdatedAt(state.updatedAt)}</p>}
        </div>
        {state.source === "mock" && (
          <p className="mt-5 rounded-xl border border-dashed border-accent bg-background p-4 text-sm">
            Vista de demostración: estos resultados no corresponden a un torneo real.
          </p>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-background p-5 sm:p-6" aria-labelledby="fixture-search-title">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Tu fixture</p>
        <h2 id="fixture-search-title" className="mt-2 text-2xl font-bold">¿Cuándo juego?</h2>
        <p className="mt-2 text-sm text-foreground/70">Buscá por tu nombre, apellido o pareja para ver todos tus partidos.</p>
        <label className="mt-5 block" htmlFor="fixture-search">
          <span className="sr-only">Buscar jugador o pareja</span>
          <input
            id="fixture-search"
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Ej.: Portugal, Latuf o Portugal / Guerra"
            className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        {searchQuery.trim() && (
          <div className="mt-5">
            {matchesForSearch.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  {matchesForSearch.length} {matchesForSearch.length === 1 ? "partido encontrado" : "partidos encontrados"}
                </p>
                {matchesForSearch.map(partido => (
                  <MatchCard key={partido.id} partido={partido} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
                No encontramos partidos publicados para esa búsqueda.
              </p>
            )}
          </div>
        )}
      </section>
      {categories.map(categoria => (
        <Category
          key={categoria}
          categoria={categoria}
          parejas={state.tournament.parejas.filter(pareja => pareja.categoria === categoria)}
          partidos={state.tournament.partidos.filter(partido => partido.categoria === categoria)}
        />
      ))}
    </>
  )
}

export type SetScore = readonly [home: number, away: number]

export type Pareja = {
  id: string
  categoria: string
  zona?: string
  nombre: string
}

export type Participante =
  | { tipo: "pareja"; pareja: Pareja }
  | { tipo: "label"; label: string }

export type Partido = {
  id: string
  a: Participante
  b: Participante
  sets: readonly SetScore[]
}

export type PartidoRaw = {
  id: string
  categoria: string
  fase: string
  zona?: string
  fecha?: string
  hora?: string
  pareja_a: string
  pareja_b: string
  sets: string
  nota?: string
}

export type PartidoResuelto = Partido &
  Pick<PartidoRaw, "categoria" | "fase" | "zona" | "fecha" | "hora" | "nota">

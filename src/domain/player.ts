/** A registry player: stable id, official name and official data. */
export type Player = {
  id: string;
  nombreOficial: string;
  /** Official category history; see `categoryOn`. */
  categorias?: readonly CategoriaOficial[];
  /** One position per year. */
  posiciones?: readonly PosicionAnual[];
};

/** An official category starting on `desde` (ISO date, YYYY-MM-DD). */
export type CategoriaOficial = {
  desde: string;
  categoria: string;
  origen: "federacion" | "ascenso";
};

export type Posicion = "delantero" | "zaguero";

export type PosicionAnual = {
  anio: number;
  posicion: Posicion;
  origen: "provisoria" | "federacion";
};

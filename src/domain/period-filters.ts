import { isoYear, tournamentDate } from "./archived-tournament.js";
import { normalizePlayerName } from "./player-names.js";

/** What period filtering needs from an archived tournament. */
export type PeriodSource = {
  slug: string;
  nombre: string;
  /** Edition recorded in the archive metadata, e.g. "Apertura" or "Clausura". */
  edition: string;
  partidos: readonly { fecha?: string }[];
};

/** The two seasons of a year, in calendar order. */
export const SEASONS = ["Apertura", "Clausura"] as const;
export type Season = (typeof SEASONS)[number];

export type PeriodOption = { etiqueta: string; path: string; actual: boolean };

export type PeriodFilter = {
  etiqueta: "Año" | "Temporada";
  opciones: PeriodOption[];
};

export type PeriodView<T extends PeriodSource> = {
  /** Route segment below the page, "" for the default view. */
  path: string;
  /** States the period shown, e.g. "2026 · Clausura". */
  titulo: string;
  torneos: T[];
  /** Only filters with more than one choice. */
  filtros: PeriodFilter[];
};

type Dated<T> = { torneo: T; fecha: string; anio: number; season: Season };

export type PeriodOptions = {
  /**
   * Default to every year together (the profile) instead of the latest year
   * (the annual table). Only applies when there are several years.
   */
  todosLosAnios?: boolean;
};

/**
 * The season a tournament belongs to: its archive `edition` when that is
 * "Apertura" or "Clausura", otherwise the one its name or slug mentions.
 * Throws when neither says, so a mislabelled archive fails the build.
 */
export function tournamentSeason(torneo: PeriodSource): Season {
  const fromEdition = seasonsIn(torneo.edition);
  if (fromEdition.length === 1) return fromEdition[0];
  const fromName = seasonsIn(`${torneo.nombre} ${torneo.slug}`);
  if (fromName.length === 1) return fromName[0];
  throw new Error(
    `No se pudo determinar la temporada (Apertura o Clausura) del torneo ${torneo.slug} (${torneo.nombre}): ni su edición "${torneo.edition}" ni su nombre la indican.`
  );
}

const seasonsIn = (text: string): Season[] => {
  const normalized = normalizePlayerName(text);
  return SEASONS.filter(season => normalized.includes(season.toLowerCase()));
};

/**
 * Every period a page can show over `tournaments`, one view per pre-rendered
 * route, the default view (path "") first. Periods narrow year, then season
 * (Apertura or Clausura) within that year; a filter is only listed when it
 * has more than one choice. Years come from ISO match dates
 * (`tournamentDate`) and seasons from `tournamentSeason`. Tournaments without
 * match dates are left out.
 */
export function buildPeriodViews<T extends PeriodSource>(
  tournaments: readonly T[],
  { todosLosAnios = false }: PeriodOptions = {}
): PeriodView<T>[] {
  const dated = datedTournaments(tournaments);
  const anios = [...new Set(dated.map(d => d.anio))].sort((a, b) => b - a);
  if (anios.length === 0)
    return [{ path: "", titulo: "", torneos: [], filtros: [] }];

  const allYears = todosLosAnios && anios.length > 1;
  const yearPath = (anio: number) =>
    !allYears && anio === anios[0] ? "" : String(anio);

  const yearFilter = (actual: number | undefined): PeriodFilter[] =>
    anios.length > 1
      ? [
          {
            etiqueta: "Año",
            opciones: [
              ...(allYears
                ? [
                    {
                      etiqueta: "Todos los años",
                      path: "",
                      actual: actual === undefined,
                    },
                  ]
                : []),
              ...anios.map(anio => ({
                etiqueta: String(anio),
                path: yearPath(anio),
                actual: anio === actual,
              })),
            ],
          },
        ]
      : [];

  const allYearsView: PeriodView<T>[] = allYears
    ? [
        {
          path: "",
          titulo: `Todos los años (${anios.at(-1)} a ${anios[0]})`,
          torneos: dated.map(d => d.torneo),
          filtros: yearFilter(undefined),
        },
      ]
    : [];

  return [
    ...allYearsView,
    ...anios.flatMap(anio => {
      const ofYear = dated.filter(d => d.anio === anio);
      const seasons = SEASONS.filter(season =>
        ofYear.some(d => d.season === season)
      );
      const seasonPath = (season: Season) => `${anio}/${season.toLowerCase()}`;
      const ofSeason = (season: Season) =>
        ofYear.filter(d => d.season === season).map(d => d.torneo);

      // With a single season the year view is that season.
      if (seasons.length === 1)
        return [
          {
            path: yearPath(anio),
            titulo: `${anio} · ${seasons[0]}`,
            torneos: ofSeason(seasons[0]),
            filtros: yearFilter(anio),
          },
        ];

      const seasonFilter = (actual: Season | undefined): PeriodFilter => ({
        etiqueta: "Temporada",
        opciones: [
          {
            etiqueta: `Todo ${anio}`,
            path: yearPath(anio),
            actual: actual === undefined,
          },
          ...seasons.map(season => ({
            etiqueta: season,
            path: seasonPath(season),
            actual: season === actual,
          })),
        ],
      });
      return [
        {
          path: yearPath(anio),
          titulo: `${anio} · ${seasons.join(" y ")}`,
          torneos: ofYear.map(d => d.torneo),
          filtros: [...yearFilter(anio), seasonFilter(undefined)],
        },
        ...seasons.map(season => ({
          path: seasonPath(season),
          titulo: `${anio} · ${season}`,
          torneos: ofSeason(season),
          filtros: [...yearFilter(anio), seasonFilter(season)],
        })),
      ];
    }),
  ];
}

/** Tournaments with a match date, most recent first. Undated ones are left out. */
function datedTournaments<T extends PeriodSource>(
  tournaments: readonly T[]
): Dated<T>[] {
  return tournaments
    .flatMap(torneo => {
      const fecha = tournamentDate(torneo);
      return fecha
        ? [
            {
              torneo,
              fecha,
              anio: isoYear(fecha),
              season: tournamentSeason(torneo),
            },
          ]
        : [];
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

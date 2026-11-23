import { tournamentDate } from "./archived-tournament.js";

/** What period filtering needs from an archived tournament. */
export type PeriodSource = {
  slug: string;
  nombre: string;
  /** Edition recorded in the archive metadata, e.g. "Apertura" or "Clausura". */
  edition: string;
  partidos: readonly { fecha?: string }[];
};

export type PeriodOption = { etiqueta: string; path: string; actual: boolean };

export type PeriodFilter = {
  etiqueta: "Año" | "Edición" | "Torneo";
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

type Dated<T> = { torneo: T; fecha: string; anio: number };

export type PeriodOptions = {
  /**
   * Default to every year together (the profile) instead of the latest year
   * (the annual table). Only applies when there are several years.
   */
  todosLosAnios?: boolean;
};

/**
 * Every period a page can show over `tournaments`, one view per pre-rendered
 * route, the default view (path "") first. Periods narrow year, then edition
 * within that year, then a single tournament of that edition; a filter is
 * only listed when it has more than one choice. Years come from ISO match
 * dates (`tournamentDate`) and editions from the archive's `edition` field.
 * Tournaments without match dates are left out.
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
      const editions = sortEditions(ofYear.map(d => d.torneo.edition));
      const editionPath = (edition: string) =>
        `${anio}/${slugifyEdition(edition)}`;

      const editionFilter = (actual: string | undefined): PeriodFilter[] =>
        editions.length > 1
          ? [
              {
                etiqueta: "Edición",
                opciones: [
                  {
                    etiqueta: `Todo ${anio}`,
                    path: yearPath(anio),
                    actual: actual === undefined,
                  },
                  ...editions.map(edition => ({
                    etiqueta: edition,
                    path: editionPath(edition),
                    actual: edition === actual,
                  })),
                ],
              },
            ]
          : [];

      /**
       * Views of one edition of the year, and of each of its tournaments when
       * there are several. With a single edition the year view is that edition.
       */
      const editionViews = (edition: string): PeriodView<T>[] => {
        const scopePath =
          editions.length > 1 ? editionPath(edition) : yearPath(anio);
        const ofEdition = ofYear
          .filter(d => d.torneo.edition === edition)
          .map(d => d.torneo);
        const tournamentFilter = (
          actual: string | undefined
        ): PeriodFilter[] =>
          ofEdition.length > 1
            ? [
                {
                  etiqueta: "Torneo",
                  opciones: [
                    {
                      etiqueta: "Todos los torneos",
                      path: scopePath,
                      actual: actual === undefined,
                    },
                    ...ofEdition.map(torneo => ({
                      etiqueta: torneo.nombre,
                      path: tournamentPath(torneo),
                      actual: torneo.slug === actual,
                    })),
                  ],
                },
              ]
            : [];
        const filtros = (actual: string | undefined) => [
          ...yearFilter(anio),
          ...editionFilter(edition),
          ...tournamentFilter(actual),
        ];

        return [
          {
            path: scopePath,
            titulo: `${anio} · ${edition}`,
            torneos: ofEdition,
            filtros: filtros(undefined),
          },
          ...(ofEdition.length > 1
            ? ofEdition.map(torneo => ({
                path: tournamentPath(torneo),
                titulo: `${anio} · ${torneo.nombre}`,
                torneos: [torneo],
                filtros: filtros(torneo.slug),
              }))
            : []),
        ];
      };

      if (editions.length === 1) return editionViews(editions[0]);
      return [
        {
          path: yearPath(anio),
          titulo: `${anio} · ${editions.join(" y ")}`,
          torneos: ofYear.map(d => d.torneo),
          filtros: [...yearFilter(anio), ...editionFilter(undefined)],
        },
        ...editions.flatMap(editionViews),
      ];
    }),
  ];
}

const tournamentPath = (torneo: PeriodSource) => `torneo/${torneo.slug}`;

/** Apertura comes before Clausura; any other edition follows, alphabetically. */
const EDITION_ORDER = ["Apertura", "Clausura"];

function sortEditions(editions: readonly string[]): string[] {
  const rank = (edition: string) => {
    const index = EDITION_ORDER.indexOf(edition);
    return index === -1 ? EDITION_ORDER.length : index;
  };
  return [...new Set(editions)].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b, "es")
  );
}

/** URL segment for an edition: "Apertura" becomes "apertura". */
function slugifyEdition(edition: string): string {
  return edition
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Tournaments with a match date, most recent first. Undated ones are left out. */
function datedTournaments<T extends PeriodSource>(
  tournaments: readonly T[]
): Dated<T>[] {
  return tournaments
    .flatMap(torneo => {
      const fecha = tournamentDate(torneo);
      return fecha ? [{ torneo, fecha, anio: Number(fecha.slice(0, 4)) }] : [];
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

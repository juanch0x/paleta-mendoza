import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { activeTournamentConfig } from "@/data/active-tournament-config";
import type { ExportDay } from "@/data/tournament-export";
import type { Participante, PartidoResuelto } from "@/domain/types";
import { SITE } from "@/config";

type Props = {
  days: ExportDay[];
  generatedAt: string;
};

const POINTS_PER_MM = 72 / 25.4;
const PAGE_WIDTH_MM = 210;
const HORIZONTAL_PADDING_MM = 14;

const participantName = (participante: Participante) =>
  participante.tipo === "pareja"
    ? participante.pareja.nombre
    : participante.label;

const scoreBySet = (partido: PartidoResuelto) =>
  partido.sets.map(([a, b]) => `${a}–${b}`).join(" · ");

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Mendoza",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));

const estimatedLines = (text: string, charactersPerLine = 52) =>
  Math.max(1, Math.ceil(text.length / charactersPerLine));

const estimatedMatchHeight = (partido: PartidoResuelto) => {
  const participants =
    estimatedLines(participantName(partido.a), 42) +
    estimatedLines(participantName(partido.b), 42);
  const note = partido.nota ? estimatedLines(partido.nota, 56) : 0;
  const result = partido.sets.length ? 7 : 0;

  // Includes generous room for React-PDF's word wrapping inside the card.
  return 23 + participants * 4.5 + note * 3.5 + result;
};

/** Calculates a deliberately roomy single-page height in millimetres. */
export const calculateTournamentPdfHeight = (days: ExportDay[]) => {
  const headerAndFooter = 58;
  const dayHeight = days.reduce((total, day) => {
    const matches = [...day.results, ...day.scheduled];
    const sectionHeadings =
      (day.results.length > 0 ? 7 : 0) + (day.scheduled.length > 0 ? 7 : 0);
    return (
      total +
      16 +
      sectionHeadings +
      matches.reduce(
        (matchTotal, match) => matchTotal + estimatedMatchHeight(match),
        0
      )
    );
  }, 0);

  return Math.max(120, Math.ceil(headerAndFooter + dayHeight));
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f7f6f2",
    color: "#282728",
    fontFamily: "Helvetica",
    padding: `${18 * POINTS_PER_MM} ${HORIZONTAL_PADDING_MM * POINTS_PER_MM}`,
  },
  eyebrow: {
    color: "#006cac",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.15 },
  header: {
    borderBottomColor: "#d8d4cb",
    borderBottomWidth: 1,
    marginBottom: 14,
    paddingBottom: 12,
  },
  day: { marginBottom: 15 },
  dayHeader: {
    alignItems: "flex-end",
    borderBottomColor: "#d8d4cb",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 6,
  },
  dayTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "capitalize",
  },
  matchCount: { color: "#66615c", fontSize: 8 },
  sectionTitle: {
    color: "#006cac",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e1ddd5",
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: 7,
    overflow: "hidden",
  },
  cardMeta: {
    alignItems: "center",
    backgroundColor: "#eef5f8",
    flexDirection: "row",
    padding: "5 7",
  },
  time: {
    color: "#006cac",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    marginRight: 7,
  },
  meta: { color: "#5d6466", flexGrow: 1, fontSize: 7.5 },
  status: {
    backgroundColor: "#dbeef7",
    borderRadius: 8,
    color: "#006cac",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    padding: "2 5",
  },
  completeStatus: { backgroundColor: "#e6efe8", color: "#27633b" },
  teams: { alignItems: "center", flexDirection: "row", padding: "8 9" },
  team: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    lineHeight: 1.25,
  },
  versus: { color: "#77716a", fontSize: 8, marginHorizontal: 7 },
  result: {
    alignItems: "center",
    backgroundColor: "#006cac",
    color: "#ffffff",
    flexDirection: "row",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    padding: "5 9",
  },
  resultLabel: { fontSize: 7, letterSpacing: 0.8, marginRight: 8 },
  note: { color: "#625d57", fontSize: 8, lineHeight: 1.35, padding: "6 9 7" },
  footer: {
    borderTopColor: "#d8d4cb",
    borderTopWidth: 1,
    color: "#6c6761",
    fontSize: 7.5,
    lineHeight: 1.4,
    marginTop: 6,
    paddingTop: 9,
  },
  footerLine: { marginBottom: 3 },
});

function MatchCard({
  partido,
  status,
}: {
  partido: PartidoResuelto;
  status: "Finalizado" | "Programado";
}) {
  const phase =
    partido.fase === "grupo" ? `Zona ${partido.zona ?? "única"}` : partido.fase;
  const statusStyle =
    status === "Finalizado"
      ? [styles.status, styles.completeStatus]
      : styles.status;

  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardMeta}>
        <Text style={styles.time}>{partido.hora ?? "A confirmar"}</Text>
        <Text style={styles.meta}>
          {partido.categoria} · {phase}
        </Text>
        <Text style={statusStyle}>{status}</Text>
      </View>
      <View style={styles.teams}>
        <Text style={styles.team}>{participantName(partido.a)}</Text>
        <Text style={styles.versus}>vs.</Text>
        <Text style={styles.team}>{participantName(partido.b)}</Text>
      </View>
      {status === "Finalizado" && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>RESULTADO</Text>
          <Text>{scoreBySet(partido)}</Text>
        </View>
      )}
      {partido.nota && <Text style={styles.note}>{partido.nota}</Text>}
    </View>
  );
}

export default function TournamentExportPdf({ days, generatedAt }: Props) {
  const heightMm = calculateTournamentPdfHeight(days);
  const source = SITE.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <Document>
      <Page
        size={[PAGE_WIDTH_MM * POINTS_PER_MM, heightMm * POINTS_PER_MM]}
        style={styles.page}
        wrap={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PARTE DEL TORNEO</Text>
          <Text style={styles.title}>{activeTournamentConfig.name}</Text>
        </View>
        {days.map(day => {
          const count = day.results.length + day.scheduled.length;
          return (
            <View style={styles.day} key={day.date}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{formatDate(day.date)}</Text>
                <Text style={styles.matchCount}>
                  {count}{" "}
                  {count === 1 ? "partido publicado" : "partidos publicados"}
                </Text>
              </View>
              {day.results.length > 0 && (
                <Text style={styles.sectionTitle}>RESULTADOS</Text>
              )}
              {day.results.map(partido => (
                <MatchCard
                  key={partido.id}
                  partido={partido}
                  status="Finalizado"
                />
              ))}
              {day.scheduled.length > 0 && (
                <Text style={styles.sectionTitle}>PARTIDOS PROGRAMADOS</Text>
              )}
              {day.scheduled.map(partido => (
                <MatchCard
                  key={partido.id}
                  partido={partido}
                  status="Programado"
                />
              ))}
            </View>
          );
        })}
        <View style={styles.footer}>
          <Text style={styles.footerLine}>Generado: {generatedAt}</Text>
          <Text style={styles.footerLine}>Generado desde {source}</Text>
          <Text>
            Información orientativa. Confirmá horarios, cambios y resultados en
            los canales oficiales de la Federación y la organización.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

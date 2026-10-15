import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventCard } from "../../components/mundial/MundialAgenda";
import {
  argentinaCount,
  dailyEvents,
  dates,
  dayNavigation,
  defaultDate,
  formatDate,
  isArgentinaEvent,
  localDate,
  modalities,
  type MundialEvent,
  mundial,
  precedingCeremony,
  readSelection,
  selectionUrl,
} from "./agenda";

const selection = { date: "2026-10-16", modality: "", argentinaOnly: false };

describe("Argentina helpers", () => {
  it("matches only the exact participant name on either side", () => {
    const argentina = mundial.events.find(
      event => event.participantA === "Argentina"
    )!;
    expect(isArgentinaEvent(argentina)).toBe(true);
    expect(
      isArgentinaEvent({
        ...argentina,
        participantA: "Argentina Sub-20",
      } as MundialEvent)
    ).toBe(false);
    const other = mundial.events.find(
      event =>
        event.participantA !== "Argentina" && event.participantB !== "Argentina"
    )!;
    expect(isArgentinaEvent(other)).toBe(false);
  });

  it("counts Argentina events for the selected day and modality, ignoring argentinaOnly", () => {
    expect(argentinaCount(selection)).toBe(6);
    expect(argentinaCount({ ...selection, argentinaOnly: true })).toBe(6);
    expect(argentinaCount({ ...selection, date: "2026-10-24" })).toBe(0);

    const modality = dailyEvents(selection).find(
      event => isArgentinaEvent(event) && event.modality
    )!.modality!;
    const expected = dailyEvents({
      ...selection,
      modality,
      argentinaOnly: true,
    }).length;
    expect(
      argentinaCount({ ...selection, modality, argentinaOnly: false })
    ).toBe(expected);
    expect(argentinaCount({ ...selection, modality: "Cesta Punta" })).toBe(
      dailyEvents({
        ...selection,
        modality: "Cesta Punta",
        argentinaOnly: true,
      }).length
    );
  });
});

describe("dayNavigation", () => {
  const first = "2026-10-15";
  const last = "2026-10-24";

  it("has no previous day on the first date and no next day on the last date", () => {
    const atFirst = dayNavigation(first, first);
    expect(atFirst.previous).toBeNull();
    expect(atFirst.next).toBe("2026-10-16");
    const atLast = dayNavigation(last, last);
    expect(atLast.previous).toBe("2026-10-23");
    expect(atLast.next).toBeNull();
  });

  it("moves one tournament date in each direction from a middle day", () => {
    const middle = dayNavigation("2026-10-18", "2026-10-18");
    expect(middle.previous).toBe("2026-10-17");
    expect(middle.next).toBe("2026-10-19");
  });

  it("shows Hoy on the tournament day and hides Ayer and Mañana outside the dates", () => {
    expect(dayNavigation("2026-10-16", "2026-10-16").shortcuts).toEqual([
      { label: "Ayer", date: "2026-10-15" },
      { label: "Hoy", date: "2026-10-16" },
      { label: "Mañana", date: "2026-10-17" },
    ]);
    expect(dayNavigation(first, first).shortcuts[0]).toEqual({
      label: "Ayer",
      date: null,
    });
    expect(dayNavigation(last, last).shortcuts[2]).toEqual({
      label: "Mañana",
      date: null,
    });
  });

  it("clamps Hoy to the tournament range when today is outside it", () => {
    const before = dayNavigation(first, "2026-10-01");
    expect(before.shortcuts).toEqual([
      { label: "Ayer", date: null },
      { label: "Hoy", date: first },
      { label: "Mañana", date: null },
    ]);
    expect(before.previous).toBeNull();
    expect(before.next).toBe("2026-10-16");

    const after = dayNavigation(last, "2026-11-30");
    expect(after.shortcuts).toEqual([
      { label: "Ayer", date: null },
      { label: "Hoy", date: last },
      { label: "Mañana", date: null },
    ]);
    expect(after.next).toBeNull();
  });

  it("offers the first day as Mañana when today is the day before the tournament", () => {
    expect(dayNavigation(first, "2026-10-14").shortcuts).toEqual([
      { label: "Ayer", date: null },
      { label: "Hoy", date: first },
      { label: "Mañana", date: first },
    ]);
  });

  it("offers the last day as Ayer when today is the day after the tournament", () => {
    expect(dayNavigation(last, "2026-10-25").shortcuts).toEqual([
      { label: "Ayer", date: last },
      { label: "Hoy", date: last },
      { label: "Mañana", date: null },
    ]);
  });
});

describe("Mundial agenda", () => {
  it("uses the championship timezone at midnight and clamps outside its ten dates", () => {
    expect(dates).toHaveLength(10);
    expect(defaultDate(new Date("2026-10-01T12:00:00Z"))).toBe("2026-10-15");
    expect(localDate(new Date("2026-10-16T02:59:59Z"))).toBe("2026-10-15");
    expect(defaultDate(new Date("2026-10-16T03:00:00Z"))).toBe("2026-10-16");
    expect(defaultDate(new Date("2026-10-25T02:59:59Z"))).toBe("2026-10-24");
    expect(defaultDate(new Date("2026-10-25T03:00:00Z"))).toBe("2026-10-24");
    expect(formatDate("2026-10-15")).toContain("15 de octubre");
  });

  it("round-trips a shared URL and rejects invalid values", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    const next = {
      date: "2026-10-17",
      modality: "Mano Parejas",
      argentinaOnly: true,
    };
    const url = new URL(
      selectionUrl(
        new URL("https://example.com/mundial/2026/?ref=share#agenda"),
        next
      ),
      "https://example.com"
    );
    expect(readSelection(url.search, now)).toEqual(next);
    expect(url.searchParams.get("ref")).toBe("share");
    expect(url.hash).toBe("#agenda");
    expect(
      readSelection("?fecha=2026-10-99&modalidad=bogus&argentina=true", now)
    ).toEqual({ date: "2026-10-19", modality: "", argentinaOnly: false });
    expect(readSelection("", now).date).toBe("2026-10-19");
    const cleared = new URL(
      selectionUrl(url, { ...next, modality: "", argentinaOnly: false }),
      url
    );
    expect(cleared.searchParams.has("modalidad")).toBe(false);
    expect(cleared.searchParams.has("argentina")).toBe(false);
  });

  it("combines filters, preserves them across days and excludes unknown participants", () => {
    const next = { ...selection, modality: "Paleta Goma", argentinaOnly: true };
    const matches = dailyEvents(next);
    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every(
        event =>
          event.modality === "Paleta Goma" &&
          [event.participantA, event.participantB].includes("Argentina")
      )
    ).toBe(true);
    expect(dailyEvents({ ...next, date: "2026-10-24" })).toEqual([]);
    expect(
      dailyEvents({ ...selection, modality: "Cesta Punta" }).some(
        event => event.kind === "ceremony"
      )
    ).toBe(false);
    expect(
      dailyEvents({ ...selection, date: "2026-10-24", argentinaOnly: true })
    ).toEqual([]);
  });

  it("retains every source entry and anchors the continuation to its inauguration", () => {
    expect(
      dates.flatMap(date => dailyEvents({ ...selection, date }))
    ).toHaveLength(223);
    const all = dailyEvents(selection);
    const continuation = all.find(event => event.startNote)!;
    const ceremony = precedingCeremony(continuation)!;
    expect(ceremony.startTime).toBe("19:00");
    expect(all.indexOf(continuation)).toBe(all.indexOf(ceremony) + 1);
    expect(continuation.startTime).toBeNull();
    const filtered = dailyEvents({ ...selection, modality: "Cesta Punta" });
    expect(filtered).toContain(continuation);
    expect(renderToStaticMarkup(<EventCard event={continuation} />)).toContain(
      "Después de la inauguración de las 19:00"
    );
  });

  it("renders sessions, ceremonies, unknown venues and pending matches honestly", () => {
    const session = mundial.events.find(
      event => event.kind === "session" && event.venue === null
    )!;
    const sessionHtml = renderToStaticMarkup(<EventCard event={session} />);
    expect(sessionHtml).toContain("Sesión");
    expect(sessionHtml).toContain("Sede no indicada");
    const ceremony = mundial.events.find(event => event.kind === "ceremony")!;
    expect(renderToStaticMarkup(<EventCard event={ceremony} />)).toContain(
      "Inauguración"
    );
    const pending = mundial.events.find(
      event =>
        event.kind === "match" && !event.participantA && !event.participantB
    )!;
    expect(renderToStaticMarkup(<EventCard event={pending} />)).toContain(
      "Participantes por definir"
    );
    expect(modalities).not.toContain(null);
  });
});

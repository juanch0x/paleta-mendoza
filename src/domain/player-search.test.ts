import { describe, expect, it } from "vitest";

import { filterPlayers } from "./player-search";

const players = [
  { id: "ana-gomez", nombreOficial: "Ana Gómez" },
  { id: "bruno-nunez", nombreOficial: "Bruno Núñez" },
  { id: "carla-diaz", nombreOficial: "Carla Díaz" },
];

const ids = (query: string) => filterPlayers(players, query).map(p => p.id);

describe("filterPlayers", () => {
  it("finds a player whose name has accents when typed without them", () => {
    expect(ids("nunez")).toEqual(["bruno-nunez"]);
  });

  it("ignores case and accents typed in the query", () => {
    expect(ids("DÍAZ")).toEqual(["carla-diaz"]);
  });

  it("matches part of a name and ignores surrounding spaces", () => {
    expect(ids("  go ")).toEqual(["ana-gomez"]);
  });

  it("returns every player when the query is blank", () => {
    expect(ids("   ")).toEqual(["ana-gomez", "bruno-nunez", "carla-diaz"]);
  });
});

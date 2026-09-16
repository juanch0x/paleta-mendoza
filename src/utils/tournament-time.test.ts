import { describe, expect, it } from "vitest"

import { estimateTournamentTime, formatDelayDuration } from "./tournament-time.js"

describe("formatDelayDuration", () => {
  it.each([
    [0, "0 min"],
    [30, "30 min"],
    [60, "1 h"],
    [90, "1 h 30 min"],
    [135, "2 h 15 min"],
    [1440, "24 h"],
  ])("formats %i minutes as %s", (delayMinutes, expected) => {
    expect(formatDelayDuration(delayMinutes)).toBe(expected)
  })
})

describe("estimateTournamentTime", () => {
  it("adds delay minutes to a scheduled time", () => {
    expect(estimateTournamentTime("19:30", 30)).toEqual({ time: "20:00", dayOffset: 0 })
  })

  it("marks estimates that continue into the next day", () => {
    expect(estimateTournamentTime("23:50", 30)).toEqual({ time: "00:20", dayOffset: 1 })
  })

  it("preserves the exact day offset for unusually long delays", () => {
    expect(estimateTournamentTime("18:00", 2880)).toEqual({ time: "18:00", dayOffset: 2 })
  })
})

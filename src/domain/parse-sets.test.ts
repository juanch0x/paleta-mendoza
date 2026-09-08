import { describe, expect, it } from "vitest"

import { parseSets } from "./parse-sets.js"

describe("parseSets", () => {
  it("parses a complete three-set result", () => {
    expect(parseSets("12-7 10-12 7-4")).toEqual([[12, 7], [10, 12], [7, 4]])
  })

  it("treats a blank score as pending", () => {
    expect(parseSets("   ")).toEqual([])
  })

  it("accepts a manually entered walkover as a normal result", () => {
    expect(parseSets("12-0 12-0")).toEqual([[12, 0], [12, 0]])
  })

  it("rejects incomplete or inconsistent results", () => {
    expect(() => parseSets("12-7")).toThrow("dos o tres sets")
    expect(() => parseSets("12-7 10-12")).toThrow("debe tener tercer set")
    expect(() => parseSets("12-7 12-9 7-4")).toThrow("no puede tener tercer set")
    expect(() => parseSets("12-7 10-x 7-4")).toThrow("Set inválido")
  })
})

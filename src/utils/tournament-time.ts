export type EstimatedTime = {
  time: string
  dayOffset: number
}

export function formatDelayDuration(delayMinutes: number): string {
  const hours = Math.floor(delayMinutes / 60)
  const minutes = delayMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`

  return `${hours} h ${minutes} min`
}

export function estimateTournamentTime(time: string, delayMinutes: number): EstimatedTime {
  const [hours, minutes] = time.split(":").map(Number)
  const totalMinutes = hours * 60 + minutes + delayMinutes

  return {
    time: `${String(Math.floor((totalMinutes % (24 * 60)) / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`,
    dayOffset: Math.floor(totalMinutes / (24 * 60)),
  }
}

export type FetchLike = (input: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

export async function fetchCsv(url: string, fetcher: FetchLike = fetch): Promise<string> {
  let response: Awaited<ReturnType<FetchLike>>

  try {
    response = await fetcher(url)
  } catch {
    throw new Error(`No se pudo descargar el CSV: ${url}`)
  }

  if (!response.ok) throw new Error(`El CSV respondió ${response.status}: ${url}`)
  return response.text()
}

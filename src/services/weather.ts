/**
 * Christchurch weather forecast, used to make suggestions weather-aware.
 *
 * Uses Open-Meteo (free, no API key) for a fixed city location — so no user
 * location is involved and there's no privacy concern. The forecast only
 * reaches ~16 days ahead; dates beyond that simply have no entry and are
 * treated as "unknown" (no bias). Failures degrade silently.
 */
export interface DayForecast {
  date: string
  /** Max chance of precipitation that day, 0–100. */
  precipProb: number
  /** Our simple "plan indoors" flag. */
  rainy: boolean
}

// Christchurch city centre.
const LAT = -43.53
const LNG = 172.63
const URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
  `&daily=precipitation_probability_max,weather_code&timezone=Pacific%2FAuckland&forecast_days=16`

let cache: Record<string, DayForecast> | null = null

/** WMO weather codes that mean rain/showers/thunderstorm. */
function isWetCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) || // drizzle + rain
    (code >= 80 && code <= 82) || // rain showers
    (code >= 95 && code <= 99) // thunderstorm
  )
}

/** Fetch (and cache for the session) the Christchurch daily forecast. */
export async function getForecast(): Promise<Record<string, DayForecast>> {
  if (cache) return cache
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Forecast request failed: ${res.status}`)
  const data = await res.json()
  const days: string[] = data?.daily?.time ?? []
  const probs: number[] = data?.daily?.precipitation_probability_max ?? []
  const codes: number[] = data?.daily?.weather_code ?? []
  const out: Record<string, DayForecast> = {}
  for (let i = 0; i < days.length; i++) {
    const precipProb = probs[i] ?? 0
    const rainy = precipProb >= 50 || isWetCode(codes[i] ?? 0)
    out[days[i]] = { date: days[i], precipProb, rainy }
  }
  cache = out
  return out
}

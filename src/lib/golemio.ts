// Golemio PID API client — Prague public transport departure boards

const BASE = "https://api.golemio.cz/v2";

export interface Departure {
  route: { short_name: string; type: number };
  trip: { headsign: string; is_canceled: boolean };
  departure_timestamp: { predicted: string; scheduled: string; minutes: number };
  delay: { minutes: number; seconds: number; is_available: boolean };
}

interface GolemioResponse {
  stops: unknown[];
  departures: Departure[];
}

export async function fetchDepartures(
  stopName: string,
  minutesAfter = 30,
  limit = 10
): Promise<Departure[]> {
  const url = new URL(`${BASE}/pid/departureboards`);
  url.searchParams.set("names", stopName);
  url.searchParams.set("minutesAfter", String(minutesAfter));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { "X-Access-Token": import.meta.env.VITE_GOLEMIO_API_KEY ?? "" },
  });

  if (!res.ok) throw new Error(`Golemio API error: ${res.status}`);
  const data: GolemioResponse = await res.json();
  return data.departures;
}

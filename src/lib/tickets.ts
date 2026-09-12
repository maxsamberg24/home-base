// No ticket marketplace API/key available, so "see get-in price" links out to
// a live SeatGeek search for the matchup instead of showing a price in-app.
export function ticketSearchUrl(awayName: string, homeName: string): string {
  return `https://seatgeek.com/search?search=${encodeURIComponent(`${awayName} at ${homeName}`)}`;
}

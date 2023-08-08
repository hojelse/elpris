export async function getMarketPrices() {
  const hourCount = 24 * 30 * 12

  const res = await fetch(
      `https://api.energidataservice.dk/dataset/Elspotprices?limit=${hourCount}&offset=0&sort=HourUTC DESC&timezone=utc+1&filter={"PriceArea":"DK2"}`,
      { next: { revalidate: 60*60 } }
    )
  const data = (await res.json()) as ElspotType

  const prices = data.records.map(
    ({ HourDK, SpotPriceEUR }) => {

      const spotPriceEur = SpotPriceEUR
      const eurToDkk = 7.45
      const dkkToOre = 100
      const mwtToKwt = 0.001
      const orePrKwt = spotPriceEur * mwtToKwt * eurToDkk * dkkToOre

      return {
        date: new Date(HourDK),
        orePrKwt: orePrKwt
      }
    }
  )
  return prices
}

export type ElspotType = {
  dataset: string,
  records: {
    HourDK: string
    HourUTC: string
    PriceArea: string
    SpotPriceDKK: number
    SpotPriceEUR: number
  }[]
}

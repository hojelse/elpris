import { getMarketPrices } from "./get_market_prices";
import { getNetTarifs } from "./get_net_tarifs";
import { getElectricityTax } from "./get_electricity_tax";

export async function getData() {
  const marketPrices = await getMarketPrices()

  const tarifs = await getNetTarifs()

  const firstApplicableTarifOrDefault = (date: Date, defaultValue: number) => {
    for (let i = 0; i < tarifs.length; i++) {
      const tarif = tarifs[i];
      if (tarif.from <= date && date <= tarif.to)
        return tarif.hours[date.getHours()]
    }
    return defaultValue
  }

  // Apply nettarifs
  return marketPrices.map(({ date, orePrKwt }) => {
    return {
      date: date,
      marketPrice: orePrKwt,
      electricityTax: getElectricityTax(date),
      netTarif: firstApplicableTarifOrDefault(date, 0),
      vat: 1.25
    }
  })
}

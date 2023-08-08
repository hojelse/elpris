export async function getNetTarifs() {
  const tarifRes = await fetch(
      `https://api.energidataservice.dk/dataset/DatahubPricelist?offset=0&filter=%7B%22ChargeOwner%22:%22Radius%20Elnet%20A/S%22,%22ChargeTypeCode%22:%22DT_C_01%22%7D&sort=ValidFrom%20DESC&timezone=dk`,
      { next: { revalidate: 60*60 } }
    )
  const tarifData = await tarifRes.json() as NetTarifType

  const tarifs = tarifData.records.map((rec) => {
    const from = new Date(rec.ValidFrom)
    const to = new Date(rec.ValidTo)

    let hours: number[] = [
      rec["Price1"],
      rec["Price2"],
      rec["Price3"],
      rec["Price4"],
      rec["Price5"],
      rec["Price6"],
      rec["Price7"],
      rec["Price8"],
      rec["Price9"],
      rec["Price10"],
      rec["Price11"],
      rec["Price12"],
      rec["Price13"],
      rec["Price14"],
      rec["Price15"],
      rec["Price16"],
      rec["Price17"],
      rec["Price18"],
      rec["Price19"],
      rec["Price20"],
      rec["Price21"],
      rec["Price22"],
      rec["Price23"],
      rec["Price24"],
    ]

    const dkkToOre = 100
    hours = hours.map(tarif_value => tarif_value * dkkToOre)

    return {
      from,
      to,
      hours
    }
  });
  
  return tarifs
}

export type NetTarifType = {
  total: number
  filters: any // not actually any
  sort: any // not actually any
  limit: number
  dataset: string
  records: {
    ChargeOwner: string
    GLN_Number: string
    ChargeType: string
    ChargeTypeCode: string
    Note: string
    ValidFrom: string
    ValidTo: string
    VATClass: string
    Price1: number
    Price2: number
    Price3: number
    Price4: number
    Price5: number
    Price6: number
    Price7: number
    Price8: number
    Price9: number
    Price10: number
    Price11: number
    Price12: number
    Price13: number
    Price14: number
    Price15: number
    Price16: number
    Price17: number
    Price18: number
    Price19: number
    Price20: number
    Price21: number
    Price22: number
    Price23: number
    Price24: number
    TransparentInvoicing: number
    TaxIndicator: number
    ResolutionDuration: string
  }[]
}

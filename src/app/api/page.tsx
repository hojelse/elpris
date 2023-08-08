import { getData } from "./get_data"

export default async function Api() {
  const data = await getData()

  return <>
    { JSON.stringify(data) }
  </>
}
import { NewChartSettings, useChartDimensions } from "../hooks/useChartDimensions";
import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { DateAxis } from "./DateAxis";
import { PriceAxis } from "./PriceAxis";
import styled from "styled-components";
import { MashType } from "../server-functions/MashData";
import { MashTypeHydated } from "../pages";

type DataEntries = {
  date: Date;
  price: number;
}[]

export type ChartSettings = {
  width?: number,
  height?: number,
  marginTop?: number,
  marginRight?: number,
  marginBottom?: number,
  marginLeft?: number,
}

const chartSettings: ChartSettings = {
  marginLeft: 30,
  marginRight: 10,
  marginTop: 35,
  marginBottom: 10
}

function myFormat(date: Date) {
  return date.toLocaleString("en-UK", localeFormat)
}

const localeFormat : Intl.DateTimeFormatOptions = {
  // year: 'numeric',
  // month: 'long',
  // day: 'numeric',
  weekday: "long",
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  // timeZoneName: 'short'
}

export const InterativeChart = ({ dataEntries }: { dataEntries: MashTypeHydated }) => {

  const [withMarketPrice, setWithMarketPrice] = useState(true)
  const [withElafgift, setWithElafgift] = useState(true)
  const [withNetTarif, setWithNetTarif] = useState(true)
  const [withVAT, setWithVAT] = useState(true)

  const compositePrices = useMemo(() => (
    dataEntries.map(({ date, marketPrice, electricityTax: elafgift, netTarif, vat }) => {
      let price = 0
      if (withMarketPrice) price += marketPrice
      if (withElafgift) price += elafgift
      if (withNetTarif) price += netTarif
      if (withVAT) price *= vat
      return {
        date,
        price
      }
    })
  ), [dataEntries, withMarketPrice, withElafgift, withNetTarif, withVAT])

  const passedData = compositePrices

  const [numHoursShown, setNumHoursShown] = useState(48)

  const boundArea = useRef<SVGRectElement>(null)

  const [ref, dms] = useChartDimensions(chartSettings)

  const data = useMemo(() => (
    passedData.slice().reverse()
  ), [passedData])

  const shownData = data.slice().splice(data.length - numHoursShown)

  const minPriceItem = shownData.reduce((prev, curr) => (prev.price < curr.price) ? prev : curr);
  const minPrice = minPriceItem.price
  const maxPriceItem = shownData.reduce((prev, curr) => (prev.price > curr.price) ? prev : curr);
  const maxPrice = maxPriceItem.price

  const minDate = shownData[0].date
  const maxDate = shownData[shownData.length-1].date

  const beginDate = addHours(1-numHoursShown, maxDate);

  const boundPadding = 50

  const yScale = useMemo(() => (
    d3.scaleLinear()
    .domain([maxPrice, minPrice])
    .range([boundPadding, -boundPadding + dms.boundedHeight])
  ), [maxPrice, minPrice, dms])

  const xScale = useMemo(() => (
    d3.scaleTime()
    .domain([beginDate, addHours(1, maxDate)])
    .range([0, dms.boundedWidth])
  ), [maxDate, beginDate, dms])

  const [highlightOffset, setHighlightOffset] = useState<number | undefined>(undefined)
  const highlightTime = (highlightOffset) ? xScale.invert(highlightOffset) : undefined

  const setStuff = (e: PointerEvent) => {
    const rect = boundArea.current?.getBoundingClientRect()
    setHighlightOffset((rect) ? e.clientX - (rect.left) : undefined)
  }

  boundArea.current?.addEventListener("pointerdown", e => {
    boundArea.current?.setPointerCapture(e.pointerId)
    setStuff(e)

    boundArea.current?.addEventListener("pointermove", setStuff)
    boundArea.current?.addEventListener("pointerup", () => {
      setHighlightOffset(undefined)
      boundArea.current?.releasePointerCapture(e.pointerId)
      boundArea.current?.removeEventListener("pointermove", setStuff)
    }, {once: true})
  }, {once: true})

  const [currTime, setCurrTime] = useState(new Date())
  const currOffset = xScale(currTime)
  const refreshStuff = () => {
    setCurrTime(new Date())
  }

  useEffect(() => {
    const timerId = setInterval(refreshStuff, 1000);
    return function cleanup() {
      clearInterval(timerId);
    };
  }, [currTime]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto auto 1fr auto",
        height: "100%",
        width: "100%"
      }}
    >
      <h4 style={{ color: "var(--color-text-2)", marginBottom: "0" }}>{myFormat(highlightTime ?? currTime)}</h4>
      <h1 style={{ color: "var(--color-text)"}}>ØRE {Math.floor(findPrice(data, highlightTime ?? currTime) ?? 0)}</h1>
      <div style={{
          width: "100%",
          minHeight: "0",
          backgroundColor: "var(--color-background-2)",
        }}>
        <div
          style={{
            height: "100%",
            width: "100%",
            backgroundColor: "var(--color-background-3)",
            touchAction: "none"
          }}
          ref={ref}
        >
          <svg width={dms.width} height={dms.height}>
            <defs>
                <clipPath id="clipPath">
                    <rect x={0} y={0} width={dms.boundedWidth} height={dms.boundedHeight} />
                </clipPath>
            </defs>
            <g
              transform={`translate(${[
                dms.marginLeft,
                dms.marginTop
              ].join(",")})`}
              clipPath="url(#clipPath)"
            >
              <rect
                ref={boundArea}
                width={dms.boundedWidth}
                height={dms.boundedHeight}
                fill="var(--color-background-4)"
              />
              <MinText xScale={xScale} yScale={yScale} minPriceItem={minPriceItem} />
              <MaxText xScale={xScale} yScale={yScale} maxPriceItem={maxPriceItem} />
              <StepCurve xScale={xScale} yScale={yScale} data={data} />
              <line
                stroke="var(--color-text)"
                x1={highlightOffset ?? currOffset} y1={0}
                x2={highlightOffset ?? currOffset} y2={dms.boundedHeight}
                strokeDasharray="10 5"
                strokeWidth={1}
                style={{
                  pointerEvents: "none"
                }}
              />
              <circle
                cx={highlightOffset ?? currOffset}
                cy={yScale(findPrice(data, highlightTime ?? currTime) ?? 0)}
                r={5}
                stroke="var(--color-text)"
                strokeWidth={2}
                fill="var(--color-background-4)"
                style={{
                  pointerEvents: "none"
                }}
              />
            </g>
            <XAxis xScale={xScale} dms={dms} numHoursShown={numHoursShown} />
            <YAxis yScale={yScale} dms={dms} />
          </svg>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around"
        }}
      >
        <input
          style={{ pointerEvents: "none", position: "absolute", opacity: "0" }}
          type="radio"
          name="timeScale"
          id="timeScale-1M"
          value={24*30}
          checked={numHoursShown === 24*30}
          onChange={e => setNumHoursShown(24*30)}
        />
        <StyledRadioLabel
          style={{
            backgroundColor: `${(numHoursShown === 24*30) ? "var(--color-background-hue)" : "inherit"}`,
            color: `${(numHoursShown === 24*30) ? "var(--color-foreground-hue)" : "var(--color-text-2)"}`
          }}
          htmlFor="timeScale-1M"
        >
          1M
        </StyledRadioLabel>
        <input
          style={{ pointerEvents: "none", position: "absolute", opacity: "0" }}
          type="radio"
          name="timeScale"
          id="timeScale-1W"
          value={24*7}
          checked={numHoursShown === 24*7}
          onChange={e => setNumHoursShown(24*7)}
        />
        <StyledRadioLabel
          style={{
            backgroundColor: `${(numHoursShown === 24*7) ? "var(--color-background-hue)" : "inherit"}`,
            color: `${(numHoursShown === 24*7) ? "var(--color-foreground-hue)" : "var(--color-text-2)"}`
          }}
          htmlFor="timeScale-1W"
        >
          1W
        </StyledRadioLabel>
        <input
          style={{ pointerEvents: "none", position: "absolute", opacity: "0" }}
          type="radio"
          name="timeScale"
          id="timeScale-48H"
          value={48}
          checked={numHoursShown === 48}
          onChange={e => setNumHoursShown(48)}
        />
        <StyledRadioLabel
          style={{
            backgroundColor: `${(numHoursShown === 48) ? "var(--color-background-hue)" : "inherit"}`,
            color: `${(numHoursShown === 48) ? "var(--color-foreground-hue)" : "var(--color-text-2)"}`
          }}
          htmlFor="timeScale-48H"
        >
          48H
        </StyledRadioLabel>
        <input
          style={{ pointerEvents: "none", position: "absolute", opacity: "0" }}
          type="radio"
          name="timeScale"
          id="timeScale-36H"
          value={36}
          checked={numHoursShown === 36}
          onChange={e => setNumHoursShown(36)}
        />
        <StyledRadioLabel
          style={{
            backgroundColor: `${(numHoursShown === 36) ? "var(--color-background-hue)" : "inherit"}`,
            color: `${(numHoursShown === 36) ? "var(--color-foreground-hue)" : "var(--color-text-2)"}`
          }}
          htmlFor="timeScale-36H"
        >
          36H
        </StyledRadioLabel>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="with"
            id="with-marketprice"
            checked={withMarketPrice}
            onChange={e => setWithMarketPrice(!withMarketPrice)}
          />
          <StyledRadioLabel
            style={{
              color: `var(--color-text-2)`,
            }}
            htmlFor="with-marketprice"
          >
            marketprice
          </StyledRadioLabel>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="with"
            id="with-elafgift"
            checked={withElafgift}
            onChange={e => setWithElafgift(!withElafgift)}
          />
          <StyledRadioLabel
            style={{
              color: `var(--color-text-2)`
            }}
            htmlFor="with-elafgift"
          >
            elafgift
          </StyledRadioLabel>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="with"
            id="with-nettarif"
            checked={withNetTarif}
            onChange={e => setWithNetTarif(!withNetTarif)}
          />
          <StyledRadioLabel
            style={{
              color: `var(--color-text-2)`
            }}
            htmlFor="with-nettarif"
          >
            Radius nettarif
          </StyledRadioLabel>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            style={{ pointerEvents: "none" }}
            type="checkbox"
            name="with"
            id="with-moms"
            checked={withVAT}
            onChange={e => setWithVAT(!withVAT)}
          />
          <StyledRadioLabel
            style={{
              color: `var(--color-text-2)`
            }}
            htmlFor="with-moms"
          >
            VAT
          </StyledRadioLabel>
        </div>
      </div>
    </div>
  )
}

const StyledRadioLabel = styled.label`
  border-radius: 1000px;
  margin: 0.5em 0;
  padding: 0.1em 0.7em;
`

function findPrice(
  data: DataEntries,
  date: Date
) {
  const dateFloor = date
  dateFloor.setMinutes(0, 0, 0)

  const dateCeil = addHours(1, dateFloor)

  
  for (let i = 0; i < data.length; i++) {
    const el = data[i];
    if (dateFloor <= el.date && el.date <= dateCeil) {
        return el.price
    }
  }
  return null
}

type TypeXScale = d3.ScaleTime<number, number, never>
type TypeYScale = d3.ScaleLinear<number, number, never>

function XAxis({dms, xScale, numHoursShown}: {dms: NewChartSettings, xScale: TypeXScale, numHoursShown: number}) {
  return (
    <>
      <g transform={`translate(${[
        dms.marginLeft,
        dms.marginTop,
      ].join(",")})`}>
        <DateAxis
          dms={dms}
          domain={xScale.domain()}
          range={xScale.range()}
          numHoursShown={numHoursShown}
        />
      </g>
    </>
  )
}

function YAxis({dms, yScale}: {dms: NewChartSettings, yScale: TypeYScale}) {
  return (
    <g transform={`translate(${[
      dms.marginLeft,
      dms.marginTop
    ].join(",")})`}>
      <PriceAxis
        dms={dms}
        domain={yScale.domain()}
        range={yScale.range()} />
    </g>
  )
}

function MinText({ xScale, yScale, minPriceItem }: { xScale: TypeXScale, minPriceItem: { date: Date; price: number; }, yScale: TypeYScale }) {
  return (
    <text
      style={{
        transform: "translateY(20px)",
        fontSize: "1rem",
        textAnchor: "middle",
        dominantBaseline: "hanging",
        fill: "var(--color-text-2)",
        pointerEvents: "none"
      }}
      x={xScale(minPriceItem.date)}
      y={yScale(minPriceItem.price)}
    >
      {`ØRE ${Math.floor(minPriceItem.price)}`}
    </text>
  )
}

function MaxText({ xScale, yScale, maxPriceItem }: { xScale: TypeXScale, maxPriceItem: { date: Date; price: number; }, yScale: TypeYScale }) {
  return <text
    style={{
      transform: "translateY(-20px)",
      fontSize: "1rem",
      textAnchor: "middle",
      fill: "var(--color-text-2)",
      pointerEvents: "none"
    }}
    x={xScale(maxPriceItem.date)}
    y={yScale(maxPriceItem.price)}
  >
    {`ØRE ${Math.floor(maxPriceItem.price)}`}
  </text>;
}

// function StepGradient({ data, xScale, yScale }: { data: DataEntries, xScale: TypeXScale, yScale: TypeYScale}) {
//   const stepCurve = createStepCurve(data, xScale, yScale)

//   const closedStepCurve = stepCurve + " " + [
//     "V", yScale(0),
//     "H", xScale(data[0].date),
//     "Z"
//   ].join(" ")

//   return (
//     <>
//       <path
//         d={closedStepCurve}
//         fill="url(#Gradient1)"
//         mask="url(#fade)"
//       />
//       <defs>
//         <linearGradient id="Gradient1">
//           <stop offset="0%"   stopColor="hsl(250,72%,27%)" />
//           <stop offset="20%"  stopColor="hsl(252,75%,32%)" />
//           <stop offset="30%"  stopColor="hsl(260,89%,40%)" />
//           <stop offset="50%"  stopColor="hsl(277,85%,45%)" />
//           <stop offset="70%"  stopColor="hsl(294,75%,45%)" />
//           <stop offset="80%"  stopColor="hsl(327,55%,62%)" />
//           <stop offset="100%" stopColor="hsl(307,41%,68%)" />
//         </linearGradient>
//         <linearGradient id="fadeGrad" y2="1" x2="0">
//           <stop offset="0%" stopColor="white" stopOpacity="1"/>
//           <stop offset="100%" stopColor="white" stopOpacity="0"/>
//         </linearGradient>
//         <mask id="fade" maskContentUnits="objectBoundingBox">
//           <rect width="1" height="1" fill="url(#fadeGrad)"/>
//         </mask>
//       </defs>
//     </>
//   )
// }

function StepCurve({ data, xScale, yScale }: { data: DataEntries, xScale: TypeXScale, yScale: TypeYScale}) {

  const stepCurve = createStepCurve(data, xScale, yScale)

  return (
    <>
      <path
        d={stepCurve}
        fill="none"
        stroke="var(--color-foreground-hue)"
        strokeWidth={2}
        strokeLinecap="round"
        style={{
          pointerEvents: "none"
        }}
      />
    </>
  )
}

function createStepCurve(data: DataEntries, xScale: TypeXScale, yScale: TypeYScale) {
  const head = data.slice().splice(0, 1)[0]
  
  const start = ["M", xScale(head.date), yScale(head.price), "H", xScale(addHours(1, head.date))].join(" ")
  const mid = data.map(({date, price}) => {
    return ["L", xScale(date), yScale(price), "H", xScale(addHours(1, date))].join(" ")
  })
  return start + " " + mid.join(" ")
}

function addHours(numOfHours: number, date: Date) {
  const newDate = new Date(date)
  newDate.setTime(newDate.getTime() + numOfHours * 60 * 60 * 1000);
  return newDate;
}

function roundDecimal(num: number, decimals: number) {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

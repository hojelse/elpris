"use client"

import { NewChartSettings, useChartDimensions } from "../hooks/useChartDimensions";
import * as d3 from "d3";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { DateAxis } from "./DateAxis";
import { PriceAxis } from "./PriceAxis";
import { dayOfTheMonthFormat, hourFormat, minuteFormat, monthFormat, myDateTimeFormat as fullDateTimeFormat } from "../util/datetimeformats";

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

type DataEntriesApi = {
  date: Date;
  marketPrice: number;
  electricityTax: number;
  netTarif: number;
  vat: number;
}[]

export const InteractiveChart = ({ dataEntries }: { dataEntries: DataEntriesApi}) => {

  if (dataEntries.length == 0) { 
    throw new Error("No data entries...")
  }

  const [currTime, setCurrTime] = useState(new Date())

  const refreshStuff = () => { setCurrTime(new Date()) }

  useEffect(() => {
    const timerId = setInterval(refreshStuff, 100);
    return function cleanup() {
      clearInterval(timerId);
    };
  }, [currTime]);

  const [withMarketPrice, setWithMarketPrice] = useState(true)
  const [withElafgift, setWithElafgift] = useState(true)
  const [withNetTarif, setWithNetTarif] = useState(true)
  const [withVAT, setWithVAT] = useState(true)

  const [fixedBaseline, setFixedBaseline] = useState(true)

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

  const boundArea = useRef<SVGRectElement>(null)

  const [ref, dms] = useChartDimensions(chartSettings)

  const data = useMemo(() => (
    passedData.slice().reverse()
  ), [passedData])

  let hoursInFuture = 2 + Math.floor((data[data.length-1].date.getTime() - currTime.getTime())/1000/60/60)
  
  const [numHoursShown, setNumHoursShown] = useState(hoursInFuture)

  const shownData = data.slice().splice(data.length - numHoursShown)

  const minPriceItem = shownData.reduce((prev, curr) => (prev.price < curr.price) ? prev : curr, {date: new Date(), price: Number.MAX_SAFE_INTEGER});
  const minPrice = minPriceItem.price
  const maxPriceItem = shownData.reduce((prev, curr) => (prev.price > curr.price) ? prev : curr, {date: new Date(), price: Number.MIN_SAFE_INTEGER});
  const maxPrice = maxPriceItem.price

  const minDate = shownData[0].date
  const maxDate = shownData[shownData.length-1].date

  const beginDate = addHours(1-numHoursShown, maxDate)

  const boundPadding = 50

  const minPrice_fixedBaseLine = (minPrice < 0) ? minPrice : 0
  const priceBaseLine = fixedBaseline
    ? minPrice_fixedBaseLine
    : minPrice

  const yScale =
    d3.scaleLinear()
      .domain([maxPrice, priceBaseLine])
      .range([boundPadding, -boundPadding + dms.boundedHeight])

  const xScale =
    d3.scaleTime()
      .domain([beginDate, addHours(1, maxDate)])
      .range([0, dms.boundedWidth])
      .nice()

  const [highlightOffset, setHighlightOffset] = useState<number | undefined>(undefined)
  const highlightTime = highlightOffset ? xScale.invert(highlightOffset) : undefined

  const canvas_bound_area = boundArea.current?.getBoundingClientRect()
  const xclamp = (x: number) => {
    const s = 30
    return canvas_bound_area
      ? Math.max(s, Math.min(canvas_bound_area.right-s-canvas_bound_area.left, x))
      : x
  }
  const setStuff = (e: PointerEvent) => {
    const s = 0.1
    const offset = canvas_bound_area
      ? Math.max(s, Math.min(canvas_bound_area.right-s-canvas_bound_area.left, e.clientX - canvas_bound_area.left))
      : undefined
    setHighlightOffset(offset)
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

  const currOffset = xScale(currTime)

  const [openSettings, setOpenSettings] = useState(false)

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto auto",
        height: "100%",
        width: "100%",
        padding: "0em 1em 1em 1em",
      }}
    >
      <Header data={data} highlightTime={highlightTime} currTime={currTime}/>
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
          <svg width={dms.width} height={dms.height} style={{position: "absolute"}}>
            <defs>
                <clipPath id="clipPath">
                    <rect x={0} y={0} width={dms.boundedWidth} height={dms.boundedHeight} />
                </clipPath>
            </defs>
            <XAxis
              xScale={xScale}
              dms={dms}
              numHoursShown={numHoursShown}
            />
            <YAxis
              yScale={yScale}
              dms={dms}
            />
            <g
              transform={`translate(${[
                dms.marginLeft,
                dms.marginTop
              ].join(",")})`}
              clipPath="url(#clipPath)"
            >
              <rect // transparent touch target
                ref={boundArea}
                width={dms.boundedWidth}
                height={dms.boundedHeight}
                fillOpacity="0"
              />
              <MinText
                xScale={xScale}
                yScale={yScale}
                minPriceItem={minPriceItem}
                xclamp={xclamp}
              />
              <MaxText
                xScale={xScale}
                yScale={yScale}
                maxPriceItem={maxPriceItem}
                xclamp={xclamp}
              />
              <StepCurve
                xScale={xScale}
                yScale={yScale}
                data={data}
              />
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
          </svg>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          flexWrap: "wrap"
        }}
      >
        <button
          tabIndex={0}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            margin: "0.5em 0",
            padding: "0.5em 1.5em 0.2em 1.5em",
            borderRadius: "10px",
            backgroundColor: openSettings
              ? "var(--c-yellow-mid)"
              : "inherit",
            fill: openSettings
              ? "var(--c-purple-mid)"
              : "var(--c-yellow-dark)"
          }}
          onClick={e => setOpenSettings(!openSettings)}
        >
          {settings_icon}
        </button>
        <div
          style={{
            height: "100%",
            width: "2px",
            backgroundColor: "var(--c-purple-mid)"
          }}
        ></div>
        <DateRangeRadioButton
          name={"1Y"}
          value={24*30*12}
          numHoursShown={numHoursShown}
          setNumHoursShown={setNumHoursShown}
        />
        <DateRangeRadioButton
          name={"1M"}
          value={24*30}
          numHoursShown={numHoursShown}
          setNumHoursShown={setNumHoursShown}
        />
        <DateRangeRadioButton
          name={"1W"}
          value={24*7}
          numHoursShown={numHoursShown}
          setNumHoursShown={setNumHoursShown}
        />
        <DateRangeRadioButton
          name={"Future"}
          value={hoursInFuture}
          numHoursShown={numHoursShown}
          setNumHoursShown={setNumHoursShown}
        />
      </div>
      <div
        style={{
          backgroundColor: "var(--c-purple-mid)",
          marginTop: "1em",
          padding: "1em",
          borderRadius: "10px",
          display: openSettings
            ? "grid"
            : "none"
        }}
      >
        <div
          style={{
            marginBottom: "1em",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            alignItems: "center",
          }}
        >
          <p
            style={{
              margin: "0",
              padding: "0",
              color: "var(--c-yellow-light)",
            }}
          >
            Settings
          </p>
        </div>
        {/* <div
          style={{
            marginBottom: "1em",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            alignItems: "center",
          }}
        >
          <p
            style={{
              margin: "0",
              padding: "0",
              color: "var(--c-yellow-light)",
              fontSize: "1em",
            }}
          >
            Price Composition
          </p>
        </div> */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: "1em",
            gap: "1em",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <Toggle
            name={"Market Price"}
            state={withMarketPrice}
            set={setWithMarketPrice}
          />
          <Toggle
            name={"Electricity Tax"}
            state={withElafgift}
            set={setWithElafgift}
          />
          <Toggle
            name={"Net Tariff (Radius)"}
            state={withNetTarif}
            set={setWithNetTarif}
          />
          <Toggle
            name={"VAT"}
            state={withVAT}
            set={setWithVAT}
          />
        </div>
        {/* <div
          style={{
            marginBottom: "1em",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            alignItems: "center",
          }}
        >
          <p
            style={{
              margin: "0",
              padding: "0",
              color: "var(--c-yellow-light)",
              fontSize: "1em",
            }}
          >
            Display Options
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            gap: "1em",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <Toggle
            name={"Fixed price axis baseline"}
            state={fixedBaseline}
            set={setFixedBaseline}
          />
        </div> */}
      </div>
    </div>
  )
}

function Header({data, highlightTime, currTime}: {data: { date: Date; price: number; }[], highlightTime: Date | undefined, currTime: Date}) {
  return <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "1em 0em 1em 0em",
      borderRadius: "0 0 1.5em 1.5em"
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        color: "var(--color-text)",
        gap: "0.5em"
      }}
    >
      <p
        style={{
          color: "var(--color-text)",
          margin: "0",
          fontSize: "2em",
        }}
      >
        {Math.round(findPrice(data, highlightTime ?? currTime) ?? 0)}
      </p>
      <p
        style={{
          color: "var(--color-text)",
          margin: "0",
        }}
      >
        øre kWh
      </p>
    </div>
    <p
      style={{
        color: "var(--color-text)",
        margin: "0",
      }}
    >
      {fullDateTimeFormat(highlightTime ?? currTime)}
    </p>
  </div>;
}

function DateRangeRadioButton({name, value, numHoursShown, setNumHoursShown}: {name: string, value: number, numHoursShown: number, setNumHoursShown: Dispatch<SetStateAction<number>>}) {
  const isActive = numHoursShown == value
  return <button
      tabIndex={0}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        margin: "0.5em 0",
        padding: "0.5em 1.5em",
        borderRadius: "10000px",
        backgroundColor: isActive
          ? "var(--c-purple-mid)"
          : "inherit",
        color: isActive
          ? "var(--c-yellow-mid)"
          : "var(--c-yellow-dark)"
      }}
      onClick={e => setNumHoursShown(value)}
    >
      <p
        style={{
          margin: "0",
          pointerEvents: "none",
        }}
      >
        {name}
      </p>
  </button>
}

function Toggle({name, state, set}: {name: string, state: boolean, set: Dispatch<SetStateAction<boolean>>}) {
  return (
    <button
      tabIndex={0}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: "max-content",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: "0.5em 1.5em",
        border: "none",
        color: state
          ? "var(--c-purple-mid)"
          : "var(--c-yellow-dark)",
        backgroundColor: state
          ? "var(--c-yellow-mid)"
          : "var(--c-purple-dark)",
        borderRadius: "10px",
      }}
      onClick={e => set(!state)}
    >
      {/* <div
        style={{
          pointerEvents: "none",
          margin: "0 1em 0 0",
          padding: "0",
        }}
      >
        {
          state
          ? checkbox_active
          : checkbox_inactive
        }
      </div> */}
      <p
        style={{
          pointerEvents: "none",
          borderRadius: "1000px",
          margin: "0",
        }}
      >
        {name}
      </p>
    </button>
  )
}

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

function MinText({ xScale, yScale, minPriceItem, xclamp }: { xScale: TypeXScale, minPriceItem: { date: Date; price: number; }, yScale: TypeYScale, xclamp: (x: number) => number }) {
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
      x={xclamp(xScale(minPriceItem.date))}
      y={yScale(minPriceItem.price)}
    >
      {`ØRE ${Math.round(minPriceItem.price)}`}
    </text>
  )
}

function MaxText({ xScale, yScale, maxPriceItem, xclamp }: { xScale: TypeXScale, maxPriceItem: { date: Date; price: number; }, yScale: TypeYScale, xclamp: (x: number) => number }) {
  return <text
    style={{
      transform: "translateY(-20px)",
      fontSize: "1rem",
      textAnchor: "middle",
      fill: "var(--color-text-2)",
      pointerEvents: "none"
    }}
    x={xclamp(xScale(maxPriceItem.date))}
    y={yScale(maxPriceItem.price)}
  >
    {`ØRE ${Math.round(maxPriceItem.price)}`}
  </text>;
}

function StepCurve({ data, xScale, yScale }: { data: DataEntries, xScale: TypeXScale, yScale: TypeYScale}) {

  const stepCurve = createStepCurve(data, xScale, yScale)

  return (
    <>
      <path
        d={stepCurve}
        fill="none"
        stroke="var(--c-yellow-mid)"
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

const settings_icon = <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 48 48"><path d="m18.3 45.25-1.05-6.7q-.65-.2-1.475-.675-.825-.475-1.375-.925l-6.25 2.9-5.8-10.25 5.7-4.15q-.05-.3-.075-.725Q7.95 24.3 7.95 24t.025-.725q.025-.425.075-.725l-5.7-4.2L8.15 8.2l6.35 2.85q.5-.4 1.3-.85.8-.45 1.45-.65L18.3 2.7h11.4l1.05 6.8q.65.25 1.475.675.825.425 1.375.875l6.3-2.85 5.75 10.15-5.75 4.1q.05.35.1.775.05.425.05.775 0 .35-.05.75t-.1.75l5.75 4.1-5.8 10.25-6.3-2.9q-.55.45-1.325.925-.775.475-1.475.675l-1.05 6.7Zm5.6-14.75q2.7 0 4.6-1.9 1.9-1.9 1.9-4.6 0-2.7-1.9-4.6-1.9-1.9-4.6-1.9-2.7 0-4.6 1.9-1.9 1.9-1.9 4.6 0 2.7 1.9 4.6 1.9 1.9 4.6 1.9Z"/></svg>

const checkbox_active = <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 42 42">
  <path fill="var(--c-purple-dark)" d="M20.95 31.95 35.4 17.5l-2.15-2.15-12.3 12.3L15 21.7l-2.15 2.15ZM9 42q-1.2 0-2.1-.9Q6 40.2 6 39V9q0-1.2.9-2.1Q7.8 6 9 6h30q1.2 0 2.1.9.9.9.9 2.1v30q0 1.2-.9 2.1-.9.9-2.1.9Zm0-3h30V9H9v30ZM9 9v30V9Z"/>
</svg>

const checkbox_inactive = <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 42 42">
  <path fill="var(--c-yellow-light)" d="M9 42q-1.2 0-2.1-.9Q6 40.2 6 39V9q0-1.2.9-2.1Q7.8 6 9 6h30q1.2 0 2.1.9.9.9.9 2.1v30q0 1.2-.9 2.1-.9.9-2.1.9Zm0-3h30V9H9v30Z"/>
</svg>

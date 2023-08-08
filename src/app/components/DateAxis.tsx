import { useMemo } from "react"
import * as d3 from 'd3'
import { NewChartSettings } from "../hooks/useChartDimensions"
import { dayOfTheMonthFormat as dayOfMonthFormat, hourFormat, monthFormat, weekDayFormat } from "../util/datetimeformats"

type ArgType = {
  domain: Date[],
  range: number[],
  dms: NewChartSettings,
  numHoursShown: number
}

export const DateAxis = ({ dms, domain, range, numHoursShown }: ArgType) => {
  const ticks = useMemo(() => {
    const xScale = d3.scaleTime()
      .domain(domain)
      .range(range)
    const width = range[1] - range[0]
    const pixelsPerTick = 30
    const numberOfTicksTarget = Math.max(1, Math.floor(width / pixelsPerTick))

    return xScale.ticks(numberOfTicksTarget)
      .map(value => ({
        value,
        xOffset: xScale(value)
      }))
  }, [
    domain,
    range
  ])

  const first: Date = domain[0]
  const last: Date = domain[domain.length-1]
  const diffHours = Math.abs(last.valueOf() - first.valueOf()) / (60*60*1000);

  return (
    <g>
      {ticks.map(({ value, xOffset }) => (
        <g
          key={value.toISOString()}
          transform={`translate(${xOffset}, 0)`}
        >
          <line
            y1={-6}
            y2={dms.boundedHeight}
            stroke="var(--c-purple-mid)"
          />

          {
            (
              value.getDate() == 1 && // is first day of month
              numHoursShown >= 7*24+1 // is month view
            )
            ? MonthText(value)
            : null
          }

          {
            (
              value.getHours() == 0 && // is first hour of day
              numHoursShown > 7*24 // is month view
            )
            ? DayOfMonthText(value)
            : null
          }
          {
            (
              value.getHours() == 0 && // is first hour of day
              numHoursShown <= 7*24 // isn't month view
            ) 
            ? WeekDayText(value)
            : null
          }

          {
            (
              numHoursShown <= 7*24 // isn't month view
            )
            ? HourText(value)
            : null
          }
        </g>
      ))}
    </g>
  )
}

function HourText(value: Date) {
  return <text
    key={"hour-" + value.toISOString()}
    fill="var(--c-yellow-dark)"
    style={{
      fontSize: "10px",
      textAnchor: "middle",
      transform: "translateY(-12px)"
    }}
  >
    {hourFormat(value)}
    {/* &apos; */}
  </text>
}

function DayOfMonthText(value: Date) {
  return <text
    key={"dayNumber-" + value.toISOString()}
    fill="var(--c-yellow-dark)"
    style={{
      fontSize: "10px",
      textAnchor: "middle",
      transform: "translateY(-12px)"
    }}
  >
    {dayOfMonthFormat(value)}
  </text>
}

function WeekDayText(value: Date) {
  return <text
    key={"weekday-" + value.toISOString()}
    fill="var(--c-yellow-dark)"
    style={{
      fontSize: "10px",
      textAnchor: "middle",
      transform: "translateY(-24px)"
    }}
  >
    {weekDayFormat(value)}
  </text>
}

function MonthText(value: Date) {
  return <text
    key={"month-" + value.toISOString()}
    fill="var(--c-yellow-dark)"
    style={{
      fontSize: "10px",
      textAnchor: "middle",
      transform: "translateY(-24px)"
    }}
  >
    {monthFormat(value)}
  </text>
}

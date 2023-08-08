import { useMemo } from "react"
import * as d3 from 'd3'
import { NewChartSettings } from "../hooks/useChartDimensions"

type ArgType = {
  domain: number[],
  range: number[],
  dms: NewChartSettings
}

export const PriceAxis = ({ dms, domain, range }: ArgType) => {
  const ticks = useMemo(() => {
    const yScale = d3.scaleLinear()
      .domain(domain)
      .range(range)
    const width = range[1] - range[0]
    const pixelsPerTick = 60
    const numberOfTicksTarget = Math.max(1, Math.floor(width / pixelsPerTick))

    return yScale.ticks(numberOfTicksTarget)
      .map(value => ({
        value,
        yOffset: yScale(value)
      }))
  }, [domain, range])

  return (
    <g>
      {ticks.map(({ value, yOffset }) => (
        <g
          key={value}
          transform={`translate(0, ${yOffset})`}
        >
          <line
            x1={-6}
            x2={dms.boundedWidth}
            stroke="var(--c-purple-mid)"
          />
          <text
            key={value}
            fill="var(--c-yellow-dark)"
            style={{
              fontSize: "10px",
              textAnchor: "middle",
              dominantBaseline: "central",
              transform: "translateX(-20px)",
            }}>
            { value }
          </text>
        </g>
      ))}
    </g>
  )
}
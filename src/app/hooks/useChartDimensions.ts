
import { ResizeObserver } from '@juggle/resize-observer'
import { RefObject, useEffect, useState, useRef } from 'react'
import { ChartSettings } from '../components/InteractiveChart';

export type NewChartSettings = {
  width: number,
  height: number,
  marginTop: number,
  marginRight: number,
  marginBottom: number,
  marginLeft: number,
  boundedWidth: number,
  boundedHeight: number,
}

export const useChartDimensions = (passedSettings: ChartSettings) : [RefObject<HTMLDivElement>, NewChartSettings] => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const dimensions = combineChartDimensions(
    {
      ...passedSettings,
      width: passedSettings.width ?? width,
      height: passedSettings.height ?? height
    }
  )

  useEffect(() => {
      const element = ref.current as Element

      const resizeObserver = new ResizeObserver(
        (entries) => {
          if (!Array.isArray(entries)) return
          if (!entries.length) return
          const entry = entries[0]
          if (width != entry.contentRect.width)
            setWidth(entry.contentRect.width)
          if (height != entry.contentRect.height)
            setHeight(entry.contentRect.height)
        }
      )
      resizeObserver.observe(element)
      return () => resizeObserver.unobserve(element)
  }, [dimensions, height, width])

  if (dimensions.width && dimensions.height)
    return [ref, dimensions]

  const newSettings = combineChartDimensions({
      ...dimensions,
      width: dimensions.width ?? width,
      height: dimensions.height ?? height,
  })
  return [ref, newSettings]
}

type Dimensions = {
  width: number,
  height: number,
  marginTop?: number,
  marginRight?: number,
  marginBottom?: number,
  marginLeft?: number,
}

const combineChartDimensions = (dimensions: Dimensions) => {
  const parsedDimensions = {
      ...dimensions,
      marginTop: dimensions.marginTop ?? 10,
      marginRight: dimensions.marginRight ?? 10,
      marginBottom: dimensions.marginBottom ?? 40,
      marginLeft: dimensions.marginLeft ?? 40,
  }
  return {
      ...parsedDimensions,
      boundedHeight: Math.max(
        parsedDimensions.height
        - parsedDimensions.marginTop
        - parsedDimensions.marginBottom,
        0,
      ),
      boundedWidth: Math.max(
        parsedDimensions.width
        - parsedDimensions.marginLeft
        - parsedDimensions.marginRight,
        0,
      ),
  }
}
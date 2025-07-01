'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import React from 'react'

interface SparklineProps {
  data: number[]
  strokeColor?: string
}

function SparklineChartComponent({ data, strokeColor = '#8884d8' }: SparklineProps) {
  const chartData = data.map((value, index) => ({ name: index, value }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// eslint-disable-next-line react/display-name
export const SparklineChart = React.memo(SparklineChartComponent) as typeof SparklineChartComponent; 
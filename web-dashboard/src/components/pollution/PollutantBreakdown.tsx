import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { getSensorTypeColor } from '@/lib/utils'
import { demoPollutantBreakdown } from '@/lib/demoData'

const pollutantLabels: Record<string, string> = {
  pm25: 'PM2.5',
  co2: 'CO₂',
  voc: 'VOCs',
  no2: 'NO₂',
  o3: 'O₃',
  pm10: 'PM10',
}

export default function PollutantBreakdown() {
  const data = useMemo(() => {
    return Object.entries(demoPollutantBreakdown).map(([key, value]) => ({
      name: pollutantLabels[key] ?? key,
      value,
      color: getSensorTypeColor(key),
    }))
  }, [])

  return (
    <div className="w-full h-full min-h-[240px]">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6',
            }}
            formatter={(value: number, name: string) => [`${value}%`, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

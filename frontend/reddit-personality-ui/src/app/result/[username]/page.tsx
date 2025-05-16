'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function ResultPage() {
  const { username } = useParams()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('http://20.193.139.7:7000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      const result = await res.json()
      setData(result)
    }
    fetchData()
  }, [username])

  if (!data) return <p className="text-center mt-10">Loading analysis for {username}...</p>

  const chartData = Object.entries(data.traits).map(([trait, value]) => ({
    name: trait,
    value
  }))

  return (
    <div className="max-w-3xl mx-auto mt-10 p-4 space-y-6">
      <h2 className="text-3xl font-semibold text-center">Analysis for {data.username}</h2>
      <p className="text-center text-gray-600">{data.summary}</p>

      <div className="grid sm:grid-cols-3 gap-4 text-xl">
        {data.strengths.map((trait: string, i: number) => (
          <div key={i} className="bg-white shadow rounded-xl p-4 text-center">
            {trait}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-2 text-center">Big Five Personality Traits</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis domain={[0, 1]} />
            <Tooltip />
            <Radar
              name="Personality"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

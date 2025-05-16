'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip,
  ResponsiveContainer
} from 'recharts'

interface RedditAnalysis {
  username: string
  traits: Record<string, number>
  strengths: string[]
  summary: string
  posts: {
    title: string
    selftext: string
    url: string
    created_utc: number
  }[]
  comments: {
    body: string
    link_permalink: string
    created_utc: number
  }[]
}

export default function ResultPage() {
  const { username } = useParams()
  const [data, setData] = useState<RedditAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.detail || 'Unexpected error occurred.')
        }

        const result = await res.json()
        setData(result)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred.'
        setError(message)
      }
    }

    fetchData()
  }, [username])

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#DAE0E6] px-4">
        <div className="bg-white border border-red-200 text-center p-6 rounded-xl shadow max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Unable to Analyze</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{error}</p>
          <p className="text-xs text-gray-500 mt-2">
            This may be due to lack of Safe For Work (SFW) content or restricted access.
          </p>
          <button
            onClick={() => window.location.href = '/analyze'}
            className="mt-4 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm px-4 py-2 rounded-md shadow"
          >
            Try Another User
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#DAE0E6]">
        <p className="text-lg text-gray-700">🔍 Analyzing <span className="font-semibold">{username}</span>...</p>
      </div>
    )
  }

  // ✅ Handle users with no posts and no comments
  if (data.posts.length === 0 && data.comments.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#DAE0E6] px-4">
        <div className="bg-white text-center p-6 rounded-xl shadow max-w-md border border-yellow-200">
          <h2 className="text-xl font-bold text-yellow-600 mb-2">No Public Activity</h2>
          <p className="text-sm text-gray-700">
            This user has no visible Safe For Work (SFW) posts or comments, or their content may be restricted.
          </p>
          <button
            onClick={() => window.location.href = '/analyze'}
            className="mt-4 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm px-4 py-2 rounded-md shadow"
          >
            Try Another User
          </button>
        </div>
      </div>
    )
  }

  const chartData = Object.entries(data.traits).map(([trait, value]) => ({
    name: trait,
    value
  }))

  return (
    <div className="min-h-screen bg-[#DAE0E6] pb-16">
      {/* Top Bar */}
      <header className="bg-[#FF4500] text-white py-3 px-5 shadow sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-sm sm:text-base">
          <h1 className="font-semibold tracking-tight">Reddit Personality Analyzer</h1>
          <span>User: <strong>{data.username}</strong></span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {/* Summary */}
        <section className="bg-white rounded-2xl shadow border border-gray-200 p-6 text-center">
          <h2 className="text-2xl font-bold text-[#FF4500] mb-1">🧠 Personality Analysis</h2>
          <p className="text-gray-700 text-sm">Here&rsquo;s how <strong>{data.username}</strong> expresses themselves on Reddit.</p>
          <p className="mt-3 text-sm text-gray-500 italic">{data.summary}</p>
        </section>

        {/* Strengths */}
        <section className="bg-white rounded-2xl shadow border border-[#FF4500]/30 p-6">
          <h3 className="text-xl font-semibold text-[#FF4500] mb-4">🌟 Key Strengths</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.strengths.map((trait, i) => (
              <div
                key={i}
                className="bg-[#FFF1EB] text-[#FF4500] font-medium px-3 py-2 text-center rounded-md shadow-sm hover:scale-[1.03] transition-transform"
              >
                {trait}
              </div>
            ))}
          </div>
        </section>

        {/* Radar Chart */}
        <section className="bg-white rounded-2xl shadow border border-[#0079D3]/30 p-6">
          <h3 className="text-xl font-semibold text-[#0079D3] mb-4">📊 Big Five Traits</h3>
          <div className="h-[300px] bg-[#F5F9FC] rounded-md p-3">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis domain={[0, 1]} />
                <Tooltip />
                <Radar
                  name="Personality"
                  dataKey="value"
                  stroke="#0079D3"
                  fill="#0079D3"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Posts */}
        <section className="bg-white rounded-2xl shadow border border-[#FF4500]/20 p-6">
          <h3 className="text-xl font-semibold text-[#FF4500] mb-4">📝 Recent Posts</h3>
          {data.posts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">📭 No recent posts available for this user.</p>
          ) : (
            <ul className="space-y-4">
              {data.posts.map((post, i) => (
                <li
                  key={i}
                  className="bg-[#FFF6F0] p-4 rounded-lg border border-[#FFD6C2] shadow-sm hover:shadow transition"
                >
                  <h4 className="font-semibold text-[#1A1A1B] text-sm mb-1">{post.title}</h4>
                  {post.selftext && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{post.selftext}</p>
                  )}
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[#FF4500] text-sm hover:underline"
                  >
                    View on Reddit ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Comments */}
        <section className="bg-white rounded-2xl shadow border border-[#0079D3]/20 p-6">
          <h3 className="text-xl font-semibold text-[#0079D3] mb-4">💬 Recent Comments</h3>
          {data.comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">💬 No recent comments available for this user.</p>
          ) : (
            <ul className="space-y-4">
              {data.comments.map((comment, i) => (
                <li
                  key={i}
                  className="bg-[#EDF6FA] p-4 rounded-lg border border-[#C6E2F8] shadow-sm hover:shadow transition"
                >
                  <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">{comment.body}</p>
                  <a
                    href={`https://reddit.com${comment.link_permalink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[#0079D3] text-sm hover:underline"
                  >
                    View on Reddit ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

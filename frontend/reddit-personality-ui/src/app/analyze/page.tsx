'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

export default function AnalyzePage() {
  const [username, setUsername] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    router.push(`/result/${username}`)
  }

  return (
    <div className="min-h-screen bg-[#DAE0E6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#FF4500]/20 p-8 text-center">
        <h1 className="text-2xl font-bold text-[#FF4500] mb-2">🧠 Reddit Personality Analyzer</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter a Reddit username to begin analysis. Don&rsquo;t worry, we only read public data.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col items-center">
          <input
            type="text"
            placeholder="e.g. spez"
            className="w-72 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] transition placeholder-gray-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!username.trim()}
            className="w-72 bg-[#FF4500] hover:bg-[#e03d00] text-white font-semibold py-2 px-4 rounded-md flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow hover:shadow-lg"
          >
            Analyze <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

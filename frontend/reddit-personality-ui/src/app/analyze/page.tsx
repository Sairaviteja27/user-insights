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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 p-4">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-center text-gray-800 mb-4">
          🧠 Reddit Personality Analyzer
        </h1>
        <p className="text-center text-gray-500 mb-4 text-sm">
          Enter your Reddit username:
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 flex flex-col items-center">
          <input
            type="text"
            placeholder="e.g. spez"
            className="w-72 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            type="submit"
            className="w-72 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center justify-center gap-1 transition"
          >
            Analyze <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

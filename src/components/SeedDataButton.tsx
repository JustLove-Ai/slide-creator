'use client'

import { useState } from 'react'
import { seedDefaultData } from '@/lib/actions'

export default function SeedDataButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSeed = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const result = await seedDefaultData()
      
      if (result.success) {
        setMessage('Default data initialized successfully!')
        // Refresh the page to show the new data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to initialize data'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleSeed}
        disabled={isLoading}
        className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
            Initializing...
          </div>
        ) : (
          'Initialize Default Data'
        )}
      </button>
      
      {message && (
        <p className={`mt-3 text-sm ${
          message.startsWith('Error') 
            ? 'text-destructive' 
            : 'text-green-600 dark:text-green-400'
        }`}>
          {message}
        </p>
      )}
    </div>
  )
}
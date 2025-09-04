'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface AddSlideButtonProps {
  presentationId: string
  afterOrder: number
  onSlideAdded: () => void
}

export default function AddSlideButton({ presentationId, afterOrder, onSlideAdded }: AddSlideButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateBlankSlide = async () => {
    console.log('Creating slide with:', { presentationId, afterOrder })
    setIsLoading(true)
    try {
      const response = await fetch('/api/slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentationId,
          title: 'New Slide',
          content: 'Click to edit content',
          slideType: 'CONTENT',
          layout: 'TEXT_ONLY',
          order: afterOrder + 1,
        }),
      })

      if (response.ok) {
        onSlideAdded()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to create slide:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error creating slide:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div 
      className="flex justify-center my-6"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <button
        onClick={handleCreateBlankSlide}
        disabled={isLoading}
        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
          />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </button>
    </motion.div>
  )
}
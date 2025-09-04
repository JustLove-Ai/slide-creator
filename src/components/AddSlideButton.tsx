'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { createSlide } from '@/lib/actions'

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
      const formData = new FormData()
      formData.append('presentationId', presentationId)
      formData.append('title', 'New Slide')
      formData.append('content', 'Click to edit content')
      formData.append('slideType', 'CONTENT')
      formData.append('layout', 'TEXT_ONLY')
      formData.append('order', (afterOrder + 1).toString())

      const result = await createSlide(formData)
      
      if (result.success) {
        onSlideAdded()
      } else {
        console.error('Failed to create slide:', result.error)
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
'use client'

import { useState, useEffect } from 'react'
import { createPresentation } from '@/lib/actions'

interface VoiceProfile {
  id: string
  name: string
  instructions: string
  isDefault: boolean
}

interface Framework {
  id: string
  name: string
  description?: string
  isDefault: boolean
  slides: Array<{
    id: string
    title: string
    instructions: string
  }>
}

interface CreatePresentationFormProps {
  initialVoiceProfiles: VoiceProfile[]
  initialFrameworks: Framework[]
}

export default function CreatePresentationForm({ 
  initialVoiceProfiles, 
  initialFrameworks 
}: CreatePresentationFormProps) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [voiceProfileId, setVoiceProfileId] = useState('')
  const [frameworkId, setFrameworkId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceProfiles] = useState<VoiceProfile[]>(initialVoiceProfiles)
  const [frameworks] = useState<Framework[]>(initialFrameworks)

  useEffect(() => {
    // Set default profile as selected
    const defaultProfile = initialVoiceProfiles.find(p => p.isDefault)
    if (defaultProfile) {
      setVoiceProfileId(defaultProfile.id)
    }
  }, [initialVoiceProfiles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('prompt', prompt)
      formData.append('voiceProfileId', voiceProfileId || 'none')
      formData.append('frameworkId', frameworkId || 'none')
      
      // createPresentation has redirect built-in, so no need to handle response
      await createPresentation(formData)
    } catch (error) {
      console.error('Error creating presentation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-card rounded-lg shadow-lg border p-8">
      <h2 className="text-2xl font-bold text-card-foreground mb-6">
        Create New Presentation
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Presentation Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
              placeholder="Enter your presentation title"
              required
            />
          </div>

          <div>
            <label htmlFor="voiceProfile" className="block text-sm font-medium text-foreground mb-2">
              Voice & Audience Profile
            </label>
            <div className="flex gap-2">
              <select
                id="voiceProfile"
                value={voiceProfileId}
                onChange={(e) => setVoiceProfileId(e.target.value)}
                className="flex-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">No specific voice profile</option>
                {voiceProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} {profile.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => window.location.href = '/voice-profiles'}
                className="px-3 py-2 border border-input bg-background text-foreground rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                title="Create new voice profile"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {voiceProfileId && (
              <p className="mt-2 text-sm text-muted-foreground">
                {voiceProfiles.find(p => p.id === voiceProfileId)?.instructions}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="framework" className="block text-sm font-medium text-foreground mb-2">
              Presentation Framework
            </label>
            <div className="flex gap-2">
              <select
                id="framework"
                value={frameworkId}
                onChange={(e) => setFrameworkId(e.target.value)}
                className="flex-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">No framework (free-form)</option>
                {frameworks.map((framework) => (
                  <option key={framework.id} value={framework.id}>
                    {framework.name} {framework.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => window.location.href = '/frameworks'}
                className="px-3 py-2 border border-input bg-background text-foreground rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                title="Create new framework"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {frameworkId && (
              <div className="mt-2">
                {frameworks.find(f => f.id === frameworkId)?.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {frameworks.find(f => f.id === frameworkId)?.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  <strong>Slide Structure:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {frameworks.find(f => f.id === frameworkId)?.slides.map((slide, index) => (
                      <li key={slide.id}>
                        {index + 1}. {slide.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-foreground mb-2">
              Content Instructions
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground resize-none"
              placeholder="Describe your presentation topic, key points, target audience, and any specific requirements..."
              required
            />
            <p className="mt-2 text-sm text-muted-foreground">
              The more specific your instructions, the better AI can generate relevant content.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  Generating Presentation...
                </div>
              ) : (
                'Generate Presentation'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 border border-input text-foreground bg-background rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
    </div>
  )
}
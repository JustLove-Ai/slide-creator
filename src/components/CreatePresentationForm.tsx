'use client'

import { useState, useEffect } from 'react'
import { generateOutlinePreview, createPresentation, generateAngles, createPresentationFromAngle } from '@/lib/actions'

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

interface SimpleOutlineItem {
  title: string
  mainTopic: string
  slideType: string
  order: number
}

interface Idea {
  id: string
  title: string
  description: string
}

interface GeneratedAngle {
  frameworkType: 'CUB' | 'PASE' | 'HEAR'
  angleTitle: string
  description: string
  keyPoints: string[]
  frameworkId: string
}

interface CreatePresentationFormProps {
  initialVoiceProfiles: VoiceProfile[]
  initialFrameworks: Framework[]
  selectedIdea?: Idea | null
}

export default function CreatePresentationForm({
  initialVoiceProfiles,
  initialFrameworks,
  selectedIdea
}: CreatePresentationFormProps) {
  const [title, setTitle] = useState(selectedIdea?.title || '')
  const [prompt, setPrompt] = useState(selectedIdea?.description || '')
  const [voiceProfileId, setVoiceProfileId] = useState('')
  const [frameworkId, setFrameworkId] = useState('')
  const [selectedAngle, setSelectedAngle] = useState<GeneratedAngle | null>(null)
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[]>([])
  const [isLoadingAngles, setIsLoadingAngles] = useState(false)
  const [isLoadingOutline, setIsLoadingOutline] = useState(false)
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [outline, setOutline] = useState<SimpleOutlineItem[] | null>(null)
  const [voiceProfiles] = useState<VoiceProfile[]>(initialVoiceProfiles)
  const [frameworks] = useState<Framework[]>(initialFrameworks)

  // Separate frameworks into regular ones and angle frameworks
  const angleFrameworks = frameworks.filter(f =>
    f.name.includes('CUB Framework') ||
    f.name.includes('PASE Framework') ||
    f.name.includes('HEAR Framework')
  )
  const regularFrameworks = frameworks.filter(f =>
    !f.name.includes('CUB Framework') &&
    !f.name.includes('PASE Framework') &&
    !f.name.includes('HEAR Framework')
  )

  useEffect(() => {
    // Set default profile as selected
    const defaultProfile = initialVoiceProfiles.find(p => p.isDefault)
    if (defaultProfile) {
      setVoiceProfileId(defaultProfile.id)
    }
  }, [initialVoiceProfiles])

  const handleGenerateAngles = async () => {
    setIsLoadingAngles(true)
    try {
      const formData = new FormData()

      if (selectedIdea) {
        formData.append('ideaId', selectedIdea.id)
      } else {
        formData.append('title', title)
        formData.append('prompt', prompt)
      }

      const result = await generateAngles(formData)
      if (result.success) {
        setGeneratedAngles(result.angles)
      } else {
        console.error('Error generating angles:', result.error)
        alert('Failed to generate angles. Please try again.')
      }
    } catch (error) {
      console.error('Error generating angles:', error)
      alert('Failed to generate angles. Please try again.')
    } finally {
      setIsLoadingAngles(false)
    }
  }

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoadingOutline(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('prompt', prompt)
      formData.append('voiceProfileId', voiceProfileId || 'none')
      // Use selectedAngle for ideas, otherwise use frameworkId
      formData.append('frameworkId', selectedAngle || frameworkId || 'none')
      if (selectedIdea) {
        formData.append('ideaId', selectedIdea.id)
      }
      
      const result = await generateOutlinePreview(formData)
      if (result.success) {
        setOutline(result.outline)
      } else {
        console.error('Error generating outline:', result.error)
      }
    } catch (error) {
      console.error('Error generating outline:', error)
    } finally {
      setIsLoadingOutline(false)
    }
  }

  const handleGeneratePresentation = async () => {
    setIsGeneratingSlides(true)

    try {
      if (selectedAngle) {
        // New angle-based workflow for all presentations
        const formData = new FormData()
        formData.append('title', title)
        formData.append('voiceProfileId', voiceProfileId || 'none')
        if (selectedIdea) {
          formData.append('ideaId', selectedIdea.id)
        } else {
          formData.append('prompt', prompt)
        }
        formData.append('selectedAngle', JSON.stringify(selectedAngle))

        // createPresentationFromAngle has redirect built-in
        await createPresentationFromAngle(formData)
      } else if (outline) {
        // Fallback outline-based workflow (should rarely be used now)
        const formData = new FormData()
        formData.append('title', title)
        formData.append('prompt', prompt)
        formData.append('voiceProfileId', voiceProfileId || 'none')
        formData.append('frameworkId', frameworkId || 'none')

        // createPresentation has redirect built-in
        await createPresentation(formData)
      }
    } catch (error) {
      console.error('Error creating presentation:', error)
      alert('Failed to create presentation. Please try again.')
    } finally {
      setIsGeneratingSlides(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      {/* Form Section */}
      <div className="bg-card rounded-lg shadow-lg border p-8">
        <div className="mb-6">
          {selectedIdea && (
            <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center mr-3 mt-0.5">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-orange-900 dark:text-orange-100">Working from Idea</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                    Creating presentation from: <strong>{selectedIdea.title}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
          <h2 className="text-2xl font-bold text-card-foreground">
            {selectedIdea ? 'Create Presentation from Idea' : 'Create New Presentation'}
          </h2>
        </div>
        
        <form onSubmit={handleGenerateOutline} className="space-y-6">
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

          {!selectedIdea && (
            // Regular Framework Selection for non-ideas
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
                  {regularFrameworks.map((framework) => (
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
                  {regularFrameworks.find(f => f.id === frameworkId)?.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {regularFrameworks.find(f => f.id === frameworkId)?.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <strong>Slide Structure:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {regularFrameworks.find(f => f.id === frameworkId)?.slides.map((slide, index) => (
                        <li key={slide.id}>
                          {index + 1}. {slide.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

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
              The more specific your instructions, the better AI can generate relevant content. We&apos;ll show you an outline first to confirm the direction.
            </p>
          </div>

          <div className="flex gap-4">
            {selectedAngle ? (
              // For presentations with selected angle, generate presentation directly
              <button
                type="button"
                onClick={handleGeneratePresentation}
                disabled={isGeneratingSlides || !selectedAngle}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGeneratingSlides ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Presentation...
                  </div>
                ) : (
                  'Create Full Presentation'
                )}
              </button>
            ) : generatedAngles.length === 0 ? (
              // Generate angles first
              <button
                type="button"
                onClick={handleGenerateAngles}
                disabled={isLoadingAngles || !title.trim() || !prompt.trim()}
                className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingAngles ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                    Generating Angles...
                  </div>
                ) : (
                  'Generate Angles'
                )}
              </button>
            ) : null}

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

      {/* Preview Section */}
      <div className="bg-card rounded-lg shadow-lg border p-8">
        <h3 className="text-xl font-bold text-card-foreground mb-6">
          Angle Preview
        </h3>

{generatedAngles.length === 0 && !isLoadingAngles && (
          <div className="text-center text-muted-foreground py-12">
            <div className="text-4xl mb-4">🎯</div>
            <p>Click &quot;Generate Angles&quot; to see 3 AI-suggested presentation approaches</p>
          </div>
        )}

        {isLoadingAngles && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing your content and generating angles...</p>
          </div>
        )}

        {generatedAngles.length > 0 && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground mb-4">
              Choose the presentation angle that best fits your audience and goals:
            </div>

            {generatedAngles.map((angle, index) => (
              <div
                key={`${angle.frameworkType}-${index}`}
                className={`border rounded-lg p-6 cursor-pointer transition-all ${
                  selectedAngle?.frameworkType === angle.frameworkType
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-input hover:border-ring hover:shadow-sm'
                }`}
                onClick={() => setSelectedAngle(angle)}
              >
                <div className="flex items-start mb-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id={`angle-${angle.frameworkType}`}
                      name="selectedAngle"
                      value={angle.frameworkType}
                      checked={selectedAngle?.frameworkType === angle.frameworkType}
                      onChange={() => setSelectedAngle(angle)}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-card-foreground mb-1">
                        {index + 1}. {angle.frameworkType} ({angle.frameworkType === 'CUB' ? 'Contrarian – Useful – Bridge' :
                                                            angle.frameworkType === 'PASE' ? 'Problem – Agitate – Solve – Expand' :
                                                            angle.frameworkType === 'HEAR' ? 'Hook – Empathy – Authority – Roadmap' :
                                                            'What – Why – How'})
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {angle.keyPoints.map((point, pointIndex) => {
                    const frameworkSteps = angle.frameworkType === 'CUB' ? ['Contrarian', 'Useful', 'Bridge'] :
                                         angle.frameworkType === 'PASE' ? ['Problem', 'Agitate', 'Solve', 'Expand'] :
                                         angle.frameworkType === 'HEAR' ? ['Hook', 'Empathy', 'Authority', 'Roadmap'] :
                                         ['What', 'Why', 'How'];

                    // Only show the steps that exist in keyPoints
                    if (pointIndex >= frameworkSteps.length) return null;

                    return (
                      <div key={pointIndex} className="mb-3">
                        <div className="font-medium text-card-foreground mb-1">
                          {frameworkSteps[pointIndex]}:
                        </div>
                        <div className="text-muted-foreground pl-4">
                          &quot;{point}&quot;
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedAngle?.frameworkType === angle.frameworkType && (
                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Ready to Create</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-200">
                            Your presentation will include complete speaker notes for every slide, so you&apos;ll never get stuck during your presentation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="text-center">
              <button
                type="button"
                onClick={handleGenerateAngles}
                disabled={isLoadingAngles}
                className="text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingAngles ? 'Regenerating...' : 'Regenerate Different Angles'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
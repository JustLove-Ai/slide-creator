'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import TodoListInput from '@/components/TodoListInput'

interface VoiceProfile {
  id: string
  name: string
  instructions: string
  tone?: string
  audience?: string
  objective?: string
  brandVoice?: string
  contentStyle?: string
  restrictions?: string
  other?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

type ViewMode = 'list' | 'create' | 'edit'

export default function VoiceProfilesPage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<VoiceProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingProfile, setEditingProfile] = useState<VoiceProfile | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  useEffect(() => {
    const filtered = profiles.filter(profile =>
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.instructions.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredProfiles(filtered)
  }, [profiles, searchTerm])

  const fetchProfiles = async () => {
    try {
      const { getVoiceProfiles } = await import('@/lib/actions')
      const data = await getVoiceProfiles()
      setProfiles(data)
    } catch (error) {
      console.error('Error fetching voice profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice profile?')) return
    
    try {
      const { deleteVoiceProfile } = await import('@/lib/actions')
      const result = await deleteVoiceProfile(id)
      
      if (result.success) {
        fetchProfiles()
      } else {
        alert(result.error || 'Failed to delete voice profile')
      }
    } catch (error) {
      console.error('Error deleting voice profile:', error)
    }
  }

  const handleEdit = (profile: VoiceProfile) => {
    setEditingProfile(profile)
    setViewMode('edit')
  }

  const handleCreate = () => {
    setEditingProfile(null)
    setViewMode('create')
  }

  const handleCancel = () => {
    setViewMode('list')
    setEditingProfile(null)
  }

  const handleFormSuccess = () => {
    setViewMode('list')
    setEditingProfile(null)
    fetchProfiles()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-4 text-lg text-muted-foreground">Loading voice profiles...</span>
          </div>
        </div>
      </main>
    )
  }

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Voice Profiles</h1>
        <p className="text-muted-foreground">
          {viewMode === 'list' 
            ? 'Manage your AI voice and audience profiles for personalized presentations'
            : viewMode === 'create'
            ? 'Create a new voice profile with categorized instructions'
            : 'Edit voice profile details and categories'
          }
        </p>
      </div>
      {viewMode === 'list' ? (
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Create Profile
        </button>
      ) : (
        <button
          onClick={handleCancel}
          className="px-6 py-3 border border-input text-foreground bg-background rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Back to List
        </button>
      )}
    </div>
  )

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {renderHeader()}

        {viewMode === 'list' && (
          <>
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-6">
              {filteredProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm ? 'No profiles found' : 'No voice profiles yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Create your first voice profile to get started.'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleCreate}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Create Profile
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Categories
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Default
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredProfiles.map((profile, index) => (
                          <motion.tr
                            key={profile.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-muted/50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-foreground">{profile.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {profile.tone && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    {profile.tone}
                                  </span>
                                )}
                                {profile.audience && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                    {profile.audience}
                                  </span>
                                )}
                                {profile.objective && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                    {profile.objective}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {profile.isDefault && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  Default
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {new Date(profile.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEdit(profile)}
                                className="text-primary hover:text-primary/80 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(profile.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                Delete
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <VoiceProfileForm
            profile={editingProfile}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        )}
      </div>
    </main>
  )
}

interface VoiceProfileFormProps {
  profile: VoiceProfile | null
  onSuccess: () => void
  onCancel: () => void
}

function VoiceProfileForm({ profile, onSuccess, onCancel }: VoiceProfileFormProps) {
  const [name, setName] = useState(profile?.name || '')
  const [tone, setTone] = useState<string[]>(profile?.tone || [])
  const [audience, setAudience] = useState<string[]>(profile?.audience || [])
  const [objective, setObjective] = useState<string[]>(profile?.objective || [])
  const [brandVoice, setBrandVoice] = useState<string[]>(profile?.brandVoice || [])
  const [contentStyle, setContentStyle] = useState<string[]>(profile?.contentStyle || [])
  const [restrictions, setRestrictions] = useState<string[]>(profile?.restrictions || [])
  const [other, setOther] = useState<string[]>(profile?.other || [])
  const [isDefault, setIsDefault] = useState(profile?.isDefault || false)
  const [loading, setLoading] = useState(false)

  // Suggestion arrays for each category
  const toneSuggestions = ['Professional', 'Casual', 'Formal', 'Friendly', 'Authoritative', 'Conversational', 'Enthusiastic']
  const audienceSuggestions = ['Executives', 'Students', 'General Public', 'Technical Teams', 'Sales Teams', 'Marketing Teams', 'Customers']
  const objectiveSuggestions = ['Educate', 'Persuade', 'Inform', 'Sell', 'Train', 'Update', 'Inspire']
  const brandVoiceSuggestions = ['Company values', 'Mission focused', 'Innovation leader', 'Customer centric', 'Quality driven', 'Results oriented']
  const contentStyleSuggestions = ['Use examples', 'Include statistics', 'Avoid jargon', 'Use bullet points', 'Tell stories', 'Use visuals', 'Keep it simple']
  const restrictionsSuggestions = ['Avoid competitors', 'No technical terms', 'No pricing discussion', 'Keep it brief', 'No controversial topics']
  const otherSuggestions = ['Use humor appropriately', 'Include call to action', 'Reference company culture', 'Use industry terms']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('tone', JSON.stringify(tone))
      formData.append('audience', JSON.stringify(audience))
      formData.append('objective', JSON.stringify(objective))
      formData.append('brandVoice', JSON.stringify(brandVoice))
      formData.append('contentStyle', JSON.stringify(contentStyle))
      formData.append('restrictions', JSON.stringify(restrictions))
      formData.append('other', JSON.stringify(other))
      formData.append('isDefault', isDefault.toString())

      if (profile) {
        const { updateVoiceProfile } = await import('@/lib/actions')
        const result = await updateVoiceProfile(profile.id, formData)
        
        if (result.success) {
          onSuccess()
        } else {
          alert(result.error || 'Failed to update voice profile')
        }
      } else {
        const { createVoiceProfile } = await import('@/lib/actions')
        const result = await createVoiceProfile(formData)
        
        if (result.success) {
          onSuccess()
        } else {
          alert(result.error || 'Failed to create voice profile')
        }
      }
    } catch (error) {
      console.error('Error saving voice profile:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toneOptions = ['Professional', 'Casual', 'Formal', 'Friendly', 'Authoritative', 'Conversational']
  const audienceOptions = ['Executives', 'Students', 'General Public', 'Technical Teams', 'Sales Teams', 'Marketing Teams']
  const objectiveOptions = ['Educate', 'Persuade', 'Inform', 'Sell', 'Inspire', 'Train']

  return (
    <div className="bg-card rounded-lg border p-8">
      <h3 className="text-2xl font-semibold text-foreground mb-6">
        {profile ? 'Edit Voice Profile' : 'Create Voice Profile'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <h4 className="text-lg font-medium text-foreground border-b border-border pb-2">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Profile Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Executive Presentations"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isDefault" className="text-sm text-foreground">
                Set as default profile
              </label>
            </div>
          </div>
        </div>

        {/* Voice Categories */}
        <div className="space-y-6">
          <h4 className="text-lg font-medium text-foreground border-b border-border pb-2">Voice Categories</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TodoListInput
              label="Tone"
              items={tone}
              onAdd={(item) => setTone([...tone, item])}
              onRemove={(index) => setTone(tone.filter((_, i) => i !== index))}
              placeholder="Add tone (e.g., Professional, Casual)"
              suggestions={toneSuggestions}
            />

            <TodoListInput
              label="Target Audience"
              items={audience}
              onAdd={(item) => setAudience([...audience, item])}
              onRemove={(index) => setAudience(audience.filter((_, i) => i !== index))}
              placeholder="Add audience (e.g., Executives, Students)"
              suggestions={audienceSuggestions}
            />

            <TodoListInput
              label="Primary Objective"
              items={objective}
              onAdd={(item) => setObjective([...objective, item])}
              onRemove={(index) => setObjective(objective.filter((_, i) => i !== index))}
              placeholder="Add objective (e.g., Educate, Persuade)"
              suggestions={objectiveSuggestions}
            />

            <TodoListInput
              label="Brand Voice"
              items={brandVoice}
              onAdd={(item) => setBrandVoice([...brandVoice, item])}
              onRemove={(index) => setBrandVoice(brandVoice.filter((_, i) => i !== index))}
              placeholder="Add brand voice (e.g., Company values)"
              suggestions={brandVoiceSuggestions}
            />

            <TodoListInput
              label="Content Style"
              items={contentStyle}
              onAdd={(item) => setContentStyle([...contentStyle, item])}
              onRemove={(index) => setContentStyle(contentStyle.filter((_, i) => i !== index))}
              placeholder="Add content style (e.g., Use examples)"
              suggestions={contentStyleSuggestions}
            />

            <TodoListInput
              label="Restrictions"
              items={restrictions}
              onAdd={(item) => setRestrictions([...restrictions, item])}
              onRemove={(index) => setRestrictions(restrictions.filter((_, i) => i !== index))}
              placeholder="Add restrictions (e.g., Avoid competitors)"
              suggestions={restrictionsSuggestions}
            />
          </div>

          <TodoListInput
            label="Additional Instructions"
            items={other}
            onAdd={(item) => setOther([...other, item])}
            onRemove={(index) => setOther(other.filter((_, i) => i !== index))}
            placeholder="Add other instructions (e.g., Use humor appropriately)"
            suggestions={otherSuggestions}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-input text-foreground bg-background rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : (profile ? 'Update Profile' : 'Create Profile')}
          </button>
        </div>
      </form>
    </div>
  )
}
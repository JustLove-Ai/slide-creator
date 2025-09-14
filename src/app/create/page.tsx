import CreatePresentationForm from '@/components/CreatePresentationForm'
import { getVoiceProfiles, getFrameworks, getIdea } from '@/lib/actions'

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ ideaId?: string }> }) {
  const resolvedSearchParams = await searchParams
  const [voiceProfiles, frameworks] = await Promise.all([
    getVoiceProfiles(),
    getFrameworks()
  ])

  // Get the idea if ideaId is provided
  const idea = resolvedSearchParams.ideaId ? await getIdea(resolvedSearchParams.ideaId) : null

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Presentation
          </h1>
          <p className="text-muted-foreground">
            Let AI generate a complete presentation from your idea
          </p>
        </div>
        
        
        <CreatePresentationForm
          initialVoiceProfiles={voiceProfiles}
          initialFrameworks={frameworks}
          selectedIdea={idea}
        />
      </div>
    </main>
  )
}
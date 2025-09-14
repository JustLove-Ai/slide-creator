import CreatePresentationForm from '@/components/CreatePresentationForm'
import SeedDataButton from '@/components/SeedDataButton'
import { getVoiceProfiles, getFrameworks, getIdea } from '@/lib/actions'

export default async function CreatePage({ searchParams }: { searchParams: { ideaId?: string } }) {
  const [voiceProfiles, frameworks] = await Promise.all([
    getVoiceProfiles(),
    getFrameworks()
  ])

  // Get the idea if ideaId is provided
  const idea = searchParams.ideaId ? await getIdea(searchParams.ideaId) : null

  // Check if seed data is needed
  const needsSeed = voiceProfiles.length === 0 && frameworks.length === 0

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
        
        {needsSeed && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-card rounded-lg shadow-lg border p-6 text-center">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Initialize Default Data
              </h3>
              <p className="text-muted-foreground mb-4">
                No voice profiles or frameworks found. Initialize with default templates to get started.
              </p>
              <SeedDataButton />
            </div>
          </div>
        )}
        
        <CreatePresentationForm
          initialVoiceProfiles={voiceProfiles}
          initialFrameworks={frameworks}
          selectedIdea={idea}
        />
      </div>
    </main>
  )
}
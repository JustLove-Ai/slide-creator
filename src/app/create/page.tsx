import CreatePresentationForm from '@/components/CreatePresentationForm'

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Presentation
          </h1>
          <p className="text-gray-600">
            Let AI generate a complete presentation from your idea
          </p>
        </div>
        
        <CreatePresentationForm />
      </div>
    </main>
  )
}
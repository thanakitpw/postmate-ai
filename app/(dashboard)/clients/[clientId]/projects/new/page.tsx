// New project page placeholder
export default function NewProjectPage({ params }: { params: { clientId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">New Project</h1>
      <p>Client ID: {params.clientId}</p>
    </div>
  );
}

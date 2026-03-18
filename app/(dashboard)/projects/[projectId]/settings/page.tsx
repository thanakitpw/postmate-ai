// Brand profile edit / project settings page placeholder
export default function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Project Settings</h1>
      <p>Project ID: {params.projectId}</p>
    </div>
  );
}

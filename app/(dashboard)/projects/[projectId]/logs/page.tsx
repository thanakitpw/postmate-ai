// Post result logs page placeholder
export default function LogsPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Post Logs</h1>
      <p>Project ID: {params.projectId}</p>
    </div>
  );
}

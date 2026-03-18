// Platform session connect page placeholder
export default function ConnectPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Connect Platform</h1>
      <p>Project ID: {params.projectId}</p>
    </div>
  );
}

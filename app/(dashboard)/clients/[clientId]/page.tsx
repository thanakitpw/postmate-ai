// Client dashboard page placeholder
export default function ClientDashboardPage({ params }: { params: { clientId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Client Dashboard</h1>
      <p>Client ID: {params.clientId}</p>
    </div>
  );
}

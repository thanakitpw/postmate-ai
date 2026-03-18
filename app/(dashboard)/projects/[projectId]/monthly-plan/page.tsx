// AI Monthly Plan page placeholder
export default function MonthlyPlanPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Monthly Plan</h1>
      <p>Project ID: {params.projectId}</p>
    </div>
  );
}

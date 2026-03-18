// Calendar view (default project page) placeholder
export default function ProjectCalendarPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <p>Project ID: {params.projectId}</p>
    </div>
  );
}

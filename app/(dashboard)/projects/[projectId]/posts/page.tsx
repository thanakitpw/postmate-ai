// Post list with filter page placeholder
export default function PostsPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Posts</h1>
      <p>Project ID: {params.projectId}</p>
    </div>
  );
}

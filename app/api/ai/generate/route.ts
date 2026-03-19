import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePosts, type GenerateRequest } from "@/lib/ai/generate";
import type { Project } from "@/types/database";

interface GenerateRequestBody {
  projectId: string;
  topic: string;
  type: "single" | "series";
  seriesCount?: number;
  language?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as GenerateRequestBody;
    const { projectId, topic, type, seriesCount, language } = body;

    if (!projectId || !topic || !type) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, topic, type" },
        { status: 400 }
      );
    }

    if (type !== "single" && type !== "series") {
      return NextResponse.json(
        { error: "type must be 'single' or 'series'" },
        { status: 400 }
      );
    }

    // Fetch project with ownership check
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, clients!inner(owner_id)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const clientData = project.clients as unknown as { owner_id: string };
    if (clientData.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Strip the joined clients data for the Project type
    const { clients: _clients, ...projectData } = project;
    const typedProject = projectData as unknown as Project;

    const generateRequest: GenerateRequest = {
      topic,
      type,
      seriesCount: type === "series" ? (seriesCount ?? 3) : undefined,
      language,
    };

    const generatedPosts = await generatePosts(typedProject, generateRequest);

    return NextResponse.json({ posts: generatedPosts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

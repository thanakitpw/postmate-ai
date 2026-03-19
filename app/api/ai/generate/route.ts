import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generatePosts, type GenerateRequest } from "@/lib/ai/generate";
import type { Project } from "@/types/database";

const generateRequestSchema = z.object({
  projectId: z.string().uuid("projectId ต้องเป็น UUID"),
  topic: z.string().min(1, "กรุณาระบุหัวข้อ").max(500, "หัวข้อต้องไม่เกิน 500 ตัวอักษร"),
  type: z.enum(["single", "series"], {
    error: "type ต้องเป็น 'single' หรือ 'series'",
  }),
  seriesCount: z.number().int().min(2).max(10).optional(),
  language: z.string().max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody: unknown = await request.json();
    const parseResult = generateRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { projectId, topic, type, seriesCount, language } = parseResult.data;

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

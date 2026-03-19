import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyPlan, type MonthlyPlanConfig } from "@/lib/ai/monthly-plan";
import type { Project } from "@/types/database";

interface MonthlyPlanRequestBody {
  projectId: string;
  month: string;
  activeDays: number[];
  defaultPostsPerDay: number;
  dayOverrides: Record<string, number>;
  slotTypes: Record<string, string>;
  theme: string | null;
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

    const body = (await request.json()) as MonthlyPlanRequestBody;
    const {
      projectId,
      month,
      activeDays,
      defaultPostsPerDay,
      dayOverrides,
      slotTypes,
      theme,
    } = body;

    if (!projectId || !month || !activeDays || activeDays.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, month, activeDays" },
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

    const config: MonthlyPlanConfig = {
      month,
      activeDays,
      defaultPostsPerDay: defaultPostsPerDay ?? 1,
      dayOverrides: dayOverrides ?? {},
      slotTypes: slotTypes ?? {},
      theme: theme ?? null,
    };

    const generatedPosts = await generateMonthlyPlan(typedProject, config);

    return NextResponse.json({ posts: generatedPosts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

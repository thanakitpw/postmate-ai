import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyPlan, type MonthlyPlanConfig } from "@/lib/ai/monthly-plan";
import type { Project } from "@/types/database";

const monthlyPlanRequestSchema = z.object({
  projectId: z.string().uuid("projectId ต้องเป็น UUID"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month ต้องอยู่ในรูปแบบ YYYY-MM"),
  activeDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "ต้องเลือกวันโพสต์อย่างน้อย 1 วัน")
    .max(7),
  defaultPostsPerDay: z.number().int().min(1).max(5).default(1),
  dayOverrides: z.record(z.string(), z.number().int().min(1).max(5)).default({}),
  slotTypes: z.record(z.string(), z.string()).default({}),
  theme: z.string().max(500).nullable().default(null),
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
    const parseResult = monthlyPlanRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const {
      projectId,
      month,
      activeDays,
      defaultPostsPerDay,
      dayOverrides,
      slotTypes,
      theme,
    } = parseResult.data;

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

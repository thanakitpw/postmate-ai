import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeBrand, type BrandAnalysisRequest } from "@/lib/ai/analyze-brand";

interface AnalyzeBrandRequestBody {
  url: string;
  type: "facebook" | "website";
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

    const body = (await request.json()) as AnalyzeBrandRequestBody;
    const { url, type } = body;

    if (!url || !type) {
      return NextResponse.json(
        { error: "Missing required fields: url, type" },
        { status: 400 }
      );
    }

    if (type !== "facebook" && type !== "website") {
      return NextResponse.json(
        { error: "type must be 'facebook' or 'website'" },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "กรุณากรอก URL ที่ถูกต้อง" },
        { status: 400 }
      );
    }

    const analysisRequest: BrandAnalysisRequest = { url, type };
    const result = await analyzeBrand(analysisRequest);

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

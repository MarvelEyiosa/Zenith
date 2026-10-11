import { NextResponse } from "next/server";

import { getDashboardSummary } from "@/lib/db";

export async function GET() {
  const data = await getDashboardSummary();

  return NextResponse.json(data);
}

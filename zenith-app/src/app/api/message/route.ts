import { NextResponse } from "next/server";

import { addMessageAssessment } from "@/lib/db";
import { assessMessageRisk } from "@/lib/verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body.message || "");

    if (!message.trim()) {
      return NextResponse.json(
        {
          status: "UNABLE_TO_ASSESS",
          explanation: "No message text was supplied for evaluation.",
          reasons: [],
        },
        { status: 400 }
      );
    }

    const result = assessMessageRisk(message);
    await addMessageAssessment({
      status: result.status,
      explanation: result.explanation,
      rawMessage: message,
      reasons: result.reasons.join(" | "),
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        status: "UNABLE_TO_ASSESS",
        explanation: "The message could not be assessed at this time.",
        reasons: [],
      },
      { status: 400 }
    );
  }
}

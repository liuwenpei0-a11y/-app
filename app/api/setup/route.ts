import { NextResponse } from "next/server";

export async function GET() {
  const isConfigured = !!(
    process.env.FEISHU_APP_ID &&
    process.env.FEISHU_APP_SECRET &&
    process.env.FEISHU_APP_TOKEN &&
    process.env.FEISHU_TABLE_ID
  );

  return NextResponse.json({ configured: isConfigured });
}

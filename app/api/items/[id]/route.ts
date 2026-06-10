import { NextResponse } from "next/server";
import { updateItem, deleteItem } from "@/lib/feishu";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Awaitable params for Next.js 15
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateItem(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Awaitable params for Next.js 15
) {
  try {
    const { id } = await params;
    await deleteItem(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

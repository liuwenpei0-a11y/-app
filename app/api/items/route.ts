import { NextResponse } from "next/server";
import { getItems, createItem } from "@/lib/feishu";

export async function GET() {
  try {
    const items = await getItems();
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { Name, Price, PurchaseDate, CurrentValue } = body;

    if (!Name || typeof Price !== "number") {
      return NextResponse.json(
        { error: "Invalid item format" },
        { status: 400 }
      );
    }

    const newItem = await createItem({
      Name,
      Price,
      PurchaseDate: PurchaseDate || Date.now(),
      CurrentValue: CurrentValue || 0,
    });

    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

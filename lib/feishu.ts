export interface FeishuItem {
  record_id?: string;
  Name: string;
  Price: number;
  PurchaseDate: number; // Unix timestamp
  CurrentValue: number;
}

// 1. Authenticate with Feishu to get tenant_access_token
async function getTenantAccessToken() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Feishu Credentials missing or incomplete.");
  }

  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
      // Revalidate cache briefly for token performance
      next: { revalidate: 3600 },
    }
  );

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Feishu Auth Error: ${data.msg}`);
  }

  return data.tenant_access_token;
}

// 2. Fetch all records from Bitable
export async function getItems(): Promise<FeishuItem[]> {
  const token = await getTenantAccessToken();
  const appToken = process.env.FEISHU_APP_TOKEN;
  const tableId = process.env.FEISHU_TABLE_ID;

  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=100`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Ensure we get fresh data
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Feishu Bitable Fetch Error: ${err}`);
  }

  const data = await res.json();
  
  if (data.code !== 0) {
    throw new Error(`Feishu Bitable API Error: ${data.msg}`);
  }

  // Map Feishu's response format to our interface and filter out blank/empty rows
  return (data.data.items || [])
    .filter((item: any) => item.fields && item.fields.Name && String(item.fields.Name).trim() !== "")
    .map((item: any) => ({
      record_id: item.record_id,
      Name: item.fields.Name,
      Price: Number(item.fields.Price) || 0,
      PurchaseDate: Number(item.fields.PurchaseDate) || Date.now(),
      CurrentValue: Number(item.fields.CurrentValue) || 0,
    }));
}

// 3. Create a new record in Bitable
export async function createItem(item: Omit<FeishuItem, "record_id">) {
  const token = await getTenantAccessToken();
  const appToken = process.env.FEISHU_APP_TOKEN;
  const tableId = process.env.FEISHU_TABLE_ID;

  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          Name: item.Name,
          Price: item.Price,
          PurchaseDate: item.PurchaseDate,
          CurrentValue: item.CurrentValue,
        },
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Feishu Create Error: ${data.msg}`);
  }

  return data.data.record;
}

// 4. Update an existing record
export async function updateItem(recordId: string, fields: Partial<FeishuItem>) {
  const token = await getTenantAccessToken();
  const appToken = process.env.FEISHU_APP_TOKEN;
  const tableId = process.env.FEISHU_TABLE_ID;

  // Strip record_id before sending update
  const { record_id, ...updateFields } = fields as any;

  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: updateFields,
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Feishu Update Error: ${data.msg}`);
  }

  return data.data.record;
}

// 5. Delete a record
export async function deleteItem(recordId: string) {
  const token = await getTenantAccessToken();
  const appToken = process.env.FEISHU_APP_TOKEN;
  const tableId = process.env.FEISHU_TABLE_ID;

  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Feishu Delete Error: ${data.msg}`);
  }

  return true;
}

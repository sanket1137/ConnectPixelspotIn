import { getAuthHeaders } from "@/lib/queryClient";

// apiRequest errors look like `400: {"error":"..."}` — show just the message
export function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.match(/^\d{3}: ([\s\S]*)$/);
  if (m) {
    try {
      const body = JSON.parse(m[1]);
      if (body?.error) return body.error;
    } catch {
      return m[1];
    }
  }
  return msg;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    return JSON.parse(text).error || text;
  } catch {
    return text || res.statusText;
  }
}

// GET a file with the admin's auth and save it
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url, { headers: await getAuthHeaders(), credentials: "include" });
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || fallbackName;
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// POST multipart (file upload) with the admin's auth
export async function uploadForm<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", body: form, headers: await getAuthHeaders(), credentials: "include" });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

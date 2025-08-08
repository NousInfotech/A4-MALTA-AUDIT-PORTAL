import { supabase } from "@/integrations/supabase/client"

export type GlobalFolder = {
  _id: string
  name: string
  path: string
  createdAt: string
}

export type GlobalFile = {
  name: string
  size: number
  updatedAt: string
  publicUrl: string
}

const API_BASE = typeof window !== "undefined"
  ? (import.meta.env.VITE_APIURL as string) || "http://localhost:8000"
  : (import.meta.env.VITE_APIURL as string) || "http://localhost:8000"

// Helper function to get the current session token
async function getAuthToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token
}

export async function getFolders(): Promise<GlobalFolder[]> {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/folders`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createFolder(name: string): Promise<GlobalFolder> {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/folders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function renameFolder(id: string, newName: string): Promise<GlobalFolder> {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/folders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ newName }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteFolder(id: string): Promise<{ message: string }> {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/folders/${id}`, {
    method: "DELETE",
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getFiles(folderName: string): Promise<GlobalFile[]> {
  const token = await getAuthToken()
  const url = new URL(`${API_BASE}/api/global-library/files`)
  url.searchParams.set("folder", folderName)
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadFile(folderName: string, file: File): Promise<GlobalFile> {
  const token = await getAuthToken()
  const fd = new FormData()
  fd.append("folder", folderName)
  fd.append("file", file)
  const res = await fetch(`${API_BASE}/api/global-library/files/upload`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: fd,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function moveFile(args: { fileName: string; fromFolder: string; toFolder: string }) {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/files/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteFile(folderName: string, fileName: string) {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/files`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ folder: folderName, fileName }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
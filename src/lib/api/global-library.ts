// @ts-nocheck
import { supabase } from "@/integrations/supabase/client"

export type GlobalFolder = {
  _id: string
  name: string
  path: string
  createdAt: string
}

export type GlobalFile = {
  _id?: string
  name: string
  fileName?: string
  size: number
  updatedAt: string
  uploadedAt?: string
  publicUrl: string
  version?: number
  uploadedBy?: string
  uploadedByName?: string
  uploadedByRole?: string
  description?: string
  tags?: string[]
  fileType?: string
  mimeType?: string
  downloadCount?: number
  viewCount?: number
  status?: string
  engagementId?: string
  clientId?: string
}

export type DocumentVersion = {
  version: number
  fileName: string
  fileSize: number
  uploadedBy: string
  uploadedAt: string
  publicUrl: string
  isLatest: boolean
  restoredFromVersion?: number | null // Track which version was restored from
}

export type DocumentActivity = {
  _id: string
  action: string
  userName: string
  userRole: string
  details?: string
  timestamp: string
}

export type FileSearchParams = {
  folder: string
  search?: string
  fileType?: string
  uploadedBy?: string
  dateFrom?: string
  dateTo?: string
  engagementId?: string
  clientId?: string
  tags?: string[]
  sortBy?: string
  sortOrder?: "asc" | "desc"
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

// Helper function to handle API errors (including 2FA)
async function handleApiError(response: Response) {
  const errorText = await response.text()
  try {
    const errorData = JSON.parse(errorText)
    const error = new Error(errorText)
    Object.assign(error, errorData)
    throw error
  } catch {
    throw new Error(errorText)
  }
}

export async function getFolders(): Promise<GlobalFolder[]> {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/folders`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) await handleApiError(res)
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
  if (!res.ok) await handleApiError(res)
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
  if (!res.ok) await handleApiError(res)
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
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function getFiles(folderName: string, params?: Partial<FileSearchParams>): Promise<GlobalFile[]> {
  const token = await getAuthToken()
  const url = new URL(`${API_BASE}/api/global-library/files`)
  url.searchParams.set("folder", folderName)
  
  if (params) {
    if (params.search) url.searchParams.set("search", params.search)
    if (params.fileType) url.searchParams.set("fileType", params.fileType)
    if (params.uploadedBy) url.searchParams.set("uploadedBy", params.uploadedBy)
    if (params.dateFrom) url.searchParams.set("dateFrom", params.dateFrom)
    if (params.dateTo) url.searchParams.set("dateTo", params.dateTo)
    if (params.engagementId) url.searchParams.set("engagementId", params.engagementId)
    if (params.clientId) url.searchParams.set("clientId", params.clientId)
    if (params.tags) {
      params.tags.forEach(tag => url.searchParams.append("tags", tag))
    }
    if (params.sortBy) url.searchParams.set("sortBy", params.sortBy)
    if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder)
  }
  
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function uploadFile(
  folderName: string, 
  file: File, 
  options?: { description?: string; tags?: string[]; engagementId?: string; clientId?: string }
): Promise<GlobalFile> {
  const token = await getAuthToken()
  const fd = new FormData()
  fd.append("folder", folderName)
  fd.append("file", file)
  if (options?.description) fd.append("description", options.description)
  if (options?.tags) fd.append("tags", JSON.stringify(options.tags))
  if (options?.engagementId) fd.append("engagementId", options.engagementId)
  if (options?.clientId) fd.append("clientId", options.clientId)
  
  const res = await fetch(`${API_BASE}/api/global-library/files/upload`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: fd,
  })
  if (!res.ok) await handleApiError(res)
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
  if (!res.ok) await handleApiError(res)
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
  if (!res.ok) await handleApiError(res)
  return res.json()
}

// New API functions
export async function getFileVersions(folderName: string, fileName: string): Promise<DocumentVersion[]> {
  const token = await getAuthToken()
  const url = new URL(`${API_BASE}/api/global-library/files/versions`)
  url.searchParams.set("folder", folderName)
  url.searchParams.set("fileName", fileName)
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function restoreVersion(folderName: string, fileName: string, version: number) {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/files/restore-version`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ folder: folderName, fileName, version }),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function downloadFile(folderName: string, fileName: string): Promise<{ downloadUrl: string; fileName: string }> {
  const token = await getAuthToken()
  const url = new URL(`${API_BASE}/api/global-library/files/download`)
  url.searchParams.set("folder", folderName)
  url.searchParams.set("fileName", fileName)
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function previewFile(folderName: string, fileName: string): Promise<{
  previewUrl: string
  fileName: string
  fileType: string
  mimeType: string
  canPreview: boolean
}> {
  const token = await getAuthToken()
  const url = new URL(`${API_BASE}/api/global-library/files/preview`)
  url.searchParams.set("folder", folderName)
  url.searchParams.set("fileName", fileName)
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function bulkDownload(folderName: string, fileNames: string[]): Promise<Blob> {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/files/bulk-download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ folder: folderName, fileNames }),
  })
  if (!res.ok) await handleApiError(res)
  return res.blob()
}

export async function getFileActivity(folderName: string, fileName: string, limit = 50): Promise<DocumentActivity[]> {
  const token = await getAuthToken()
  const url = new URL(`${API_BASE}/api/global-library/files/activity`)
  url.searchParams.set("folder", folderName)
  url.searchParams.set("fileName", fileName)
  url.searchParams.set("limit", limit.toString())
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function updateFileMetadata(
  folderName: string,
  fileName: string,
  metadata: { description?: string; tags?: string[]; status?: string }
) {
  const token = await getAuthToken()
  const url = new URL(`${API_BASE}/api/global-library/files/metadata`)
  url.searchParams.set("folder", folderName)
  url.searchParams.set("fileName", fileName)
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(metadata),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

// 2FA functions
export async function generate2FASecret(folderName: string) {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/2fa/generate-secret`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ folderName }),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function enable2FA(folderName: string, secret?: string, token?: string, method: "email" | "totp" = "email") {
  const authToken = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/2fa/enable`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ folderName, secret, token, method }),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function disable2FA(folderName: string) {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/2fa/disable`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ folderName }),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function verify2FA(folderName: string, token: string, method?: string) {
  const authToken = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/2fa/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ folderName, token, method }),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export async function sendEmailOTP(folderName: string) {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/2fa/send-email-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ folderName }),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

// Session management
export async function updateSessionActivity() {
  const token = await getAuthToken()
  const res = await fetch(`${API_BASE}/api/global-library/session/activity`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${token}`
    },
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}
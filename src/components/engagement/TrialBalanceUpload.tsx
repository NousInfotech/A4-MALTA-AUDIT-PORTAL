
// @ts-nocheck

import type React from "react"
import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, Link, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { supabase } from "@/integrations/supabase/client"
import { useSidebarStats } from "@/contexts/SidebarStatsContext"
 

// 🔹 Auth fetch helper: attaches Supabase Bearer token
async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const headers = new Headers(options.headers || {})
  // don't force Content-Type here; caller sets it for JSON. For FormData, leave it unset.
  headers.set("Authorization", `Bearer ${data.session?.access_token}`)
  return fetch(url, { ...options, headers })
}

interface TrialBalanceUploadProps {
  engagement: any
  onUploadSuccess: (data: any) => void
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  data?: any[]
}

const REQUIRED_COLUMNS = ["Code", "Account Name", "Current Year", "Prior Year"]
const OPTIONAL_COLUMNS = ["Grouping 1", "Grouping 2", "Grouping 3", "Grouping 4"]

// Parse accounting number formats: (55,662) → 55662, 42,127 → 42127
// Removes parentheses and special characters, preserves any existing minus sign
// Returns rounded integer value
const parseAccountingNumber = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  
  // If already a number, round and return it
  if (typeof value === "number") return Math.round(value);
  
  // Convert to string and clean
  let str = String(value).trim();
  
  // Remove parentheses, commas, and currency symbols (preserves existing minus sign if present)
  str = str.replace(/[(),\$€£¥]/g, "").trim();
  
  // Parse to number
  const num = Number(str);
  
  // Return rounded number (no negative conversion for parentheses)
  return isNaN(num) ? 0 : Math.round(num);
};

export const TrialBalanceUpload: React.FC<TrialBalanceUploadProps> = ({ engagement, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false)
  const [googleSheetUrl, setGoogleSheetUrl] = useState("")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refetch } = useSidebarStats(); // shared instance
  const { toast } = useToast()

  const validateTrialBalance = (data: any[]): ValidationResult => {
    const errors: string[] = []

    if (!data || data.length === 0) {
      errors.push("File is empty or could not be read")
      return { isValid: false, errors }
    }

    const headers = data[0]
    // Ensure headers are strings and filter out null/undefined values
    const normalizedHeaders = headers.map((h: any) => {
      if (h == null) return ""
      return String(h).trim()
    })

    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) => !normalizedHeaders.some((header: string) => header.toLowerCase() === col.toLowerCase()),
    )

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(", ")}`)
    }

    const dataRows = data.slice(1)
    if (dataRows.length === 0) {
      errors.push("No data rows found")
    }

    const currentYearIndex = normalizedHeaders.findIndex((h: string) => h.toLowerCase() === "current year")
    const priorYearIndex = normalizedHeaders.findIndex((h: string) => h.toLowerCase() === "prior year")

    if (currentYearIndex !== -1 && priorYearIndex !== -1) {
      dataRows.forEach((row: any[], index: number) => {
        const currentYear = row[currentYearIndex]
        const priorYear = row[priorYearIndex]
        
        // Try to parse accounting format - if result is NaN, it's invalid
        if (currentYear && currentYear !== "" && isNaN(parseAccountingNumber(currentYear))) {
          errors.push(`Row ${index + 2}: Current Year must be a number (found: "${currentYear}")`)
        }
        if (priorYear && priorYear !== "" && isNaN(parseAccountingNumber(priorYear))) {
          errors.push(`Row ${index + 2}: Prior Year must be a number (found: "${priorYear}")`)
        }
      })
    }

    return { isValid: errors.length === 0, errors, data: errors.length === 0 ? data : undefined }
  }

  const filterZeroRows = (data: any[]): any[] => {
    if (!data || data.length === 0) return data

    const headers = data[0]
    // Ensure headers are strings and filter out null/undefined values
    const normalizedHeaders = headers.map((h: any) => {
      if (h == null) return ""
      return String(h).trim()
    })

    const codeIndex = normalizedHeaders.findIndex((h: string) => h.toLowerCase().includes("code"))
    const accountNameIndex = normalizedHeaders.findIndex((h: string) => h.toLowerCase().includes("account name"))
    const currentYearIndex = normalizedHeaders.findIndex((h: string) => h.toLowerCase() === "current year")

    if (codeIndex === -1 || accountNameIndex === -1 || currentYearIndex === -1) {
      // If we can't find required columns, return data as-is
      return data
    }

    const dataRows = data.slice(1)
    const filteredRows = dataRows.filter((row: any[]) => {
      const code = (row[codeIndex] || "").toString().trim()
      const accountName = (row[accountNameIndex] || "").toString().trim()
      const currentYear = parseAccountingNumber(row[currentYearIndex])
      
      // Keep row if at least ONE of these has a value (Code OR Account Name OR Current Year)
      // Filter out ONLY if ALL THREE are empty/zero
      return code !== "" || accountName !== "" || currentYear !== 0
    })

    // Return headers + filtered rows
    return [headers, ...filteredRows]
  }

  const parseCSVFile = (file: File): Promise<any[]> =>
    new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        complete: (result) => {
          if (result.errors.length > 0) reject(new Error(`CSV parsing error: ${result.errors[0].message}`))
          else resolve(result.data as any[])
        },
        error: (error) => reject(error),
      })
    })

  const parseExcelFile = (file: File): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          resolve(jsonData as any[])
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsArrayBuffer(file)
    })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setValidationErrors([])
    setUploadSuccess(false)

    try {
      let parsedData: any[]
      if (file.name.toLowerCase().endsWith(".csv")) parsedData = await parseCSVFile(file)
      else if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls"))
        parsedData = await parseExcelFile(file)
      else throw new Error("Unsupported file format. Please upload CSV or Excel files only.")

      const validation = validateTrialBalance(parsedData)
      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        return
      }

      // Filter out rows where Code, Account Name, AND Current Year are ALL empty/zero
      const filteredData = filterZeroRows(validation.data)
      
      if (filteredData.length <= 1) {
        // Only headers or no data rows after filtering
        throw new Error("No valid data rows found (all rows have Code, Account Name, and Current Year empty/zero)")
      }

      // delete existing TB (if your API supports it)
      await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/trial-balance`, {
        method: "DELETE",
      })

      // Upload file to engagement library (FormData -> don't set Content-Type)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "Trial Balance")
      formData.append("replaceExisting", "true")

      const response = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/library`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error("Failed to upload file to library")

      // Save trial balance data with filtered rows
      const tbResponse = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/trial-balance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: filteredData, fileName: file.name }),
        },
      )
      if (!tbResponse.ok) throw new Error("Failed to save trial balance data")

      const trialBalanceData = await tbResponse.json()
      refetch()
      setUploadSuccess(true)
      onUploadSuccess(trialBalanceData)
      toast({ title: "Success", description: "Trial Balance uploaded and saved successfully" })
    } catch (error: any) {
      console.error("Upload error:", error)
      setValidationErrors([error.message])
      toast({ title: "Upload failed", description: error.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleGoogleSheetsUpload = async () => {
    if (!googleSheetUrl.trim()) {
      setValidationErrors(["Please enter a Google Sheets URL"])
      return
    }

    setUploading(true)
    setValidationErrors([])
    setUploadSuccess(false)

    try {
      await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/trial-balance`, {
        method: "DELETE",
      })

      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/trial-balance/google-sheets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheetUrl: googleSheetUrl }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to fetch Google Sheets data")
      }

      const trialBalanceData = await response.json()
      setUploadSuccess(true)
      onUploadSuccess(trialBalanceData)
      toast({ title: "Success", description: "Trial Balance imported from Google Sheets successfully" })
    } catch (error: any) {
      console.error("Google Sheets import error:", error)
      setValidationErrors([error.message])
      toast({ title: "Import failed", description: error.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Trial Balance
        </CardTitle>
        <CardDescription>
          Upload your Trial Balance file (CSV/Excel) or import from Google Sheets. Required columns: Code, Account Name,
          Current Year, Prior Year. Optional columns: Grouping 1, Grouping 2, Grouping 3, Grouping 4
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload" className="text-sm font-medium">
              Upload CSV or Excel File
            </Label>
            <div className="mt-2 flex items-center gap-4">
              <Input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Google Sheets Section */}
          <div className="space-y-2">
            <Label htmlFor="google-sheets-url" className="text-sm font-medium">
              Import from Google Sheets
            </Label>
            <div className="flex gap-2">
              <Input
                id="google-sheets-url"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                disabled={uploading}
                className="flex-1"
              />
              <Button onClick={handleGoogleSheetsUpload} disabled={uploading || !googleSheetUrl.trim()}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link className="h-4 w-4 mr-2" />}
                Import
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Please fix the following errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {uploadSuccess && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Trial Balance uploaded successfully! You can now proceed to the Extended Trial Balance.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {uploading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Processing Trial Balance...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

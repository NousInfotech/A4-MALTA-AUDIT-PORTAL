"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { taxApi } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Loader2,
  ArrowRight,
  FileCheck,
  TrendingUp,
  Edit,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TaxTabProps {
  engagement: any
  isReadOnly?: boolean
}

const TaxStatusEnum = {
  PENDING: "PENDING",
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
}

export const TaxTab = ({ engagement, isReadOnly = false }: TaxTabProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tax, setTax] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingDraft, setUploadingDraft] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedDraftFile, setSelectedDraftFile] = useState<File | null>(null)

  useEffect(() => {
    if (engagement?._id) {
      fetchTax()
    }
  }, [engagement?._id])

  const fetchTax = async () => {
    if (!engagement?._id) return
    
    setLoading(true)
    try {
      const data = await taxApi.getByEngagement(engagement._id)
      setTax(data)
    } catch (error: any) {
      console.error("Failed to fetch Tax:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load Tax data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 20 MB",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleDraftFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 20 MB",
          variant: "destructive",
        })
        return
      }
      setSelectedDraftFile(file)
    }
  }

  const handleUpload = async () => {
    if (!tax?._id || !selectedFile || !user?.id) return

    if (tax.currentStatus === TaxStatusEnum.PENDING || tax.currentStatus === TaxStatusEnum.DRAFT) {
      toast({
        title: "Upload not allowed",
        description: "Final document upload is only allowed at SUBMITTED status or later",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      await taxApi.uploadDocument(tax._id, selectedFile, user.id)
      toast({
        title: "Success",
        description: "Tax document uploaded successfully",
      })
      setSelectedFile(null)
      await fetchTax()
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDraftUpload = async () => {
    if (!tax?._id || !selectedDraftFile || !user?.id) return

    if (tax.currentStatus !== TaxStatusEnum.DRAFT) {
      toast({
        title: "Upload not allowed",
        description: "Draft document upload is only allowed at DRAFT status",
        variant: "destructive",
      })
      return
    }

    setUploadingDraft(true)
    try {
      await taxApi.uploadDraftDocument(tax._id, selectedDraftFile, user.id)
      toast({
        title: "Success",
        description: "Tax draft document uploaded successfully",
      })
      setSelectedDraftFile(null)
      await fetchTax()
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload draft document",
        variant: "destructive",
      })
    } finally {
      setUploadingDraft(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!tax?._id || !user?.id) return

    setUpdatingStatus(true)
    try {
      await taxApi.updateStatus(tax._id, {
        status: newStatus,
        employeeId: user.id,
      })
      toast({
        title: "Success",
        description: `Tax status updated to ${newStatus}`,
      })
      await fetchTax()
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      [TaxStatusEnum.PENDING]: {
        label: "Pending",
        className: "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300 shadow-sm",
        icon: Clock,
      },
      [TaxStatusEnum.DRAFT]: {
        label: "Draft",
        className: "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-300 shadow-sm",
        icon: Edit,
      },
      [TaxStatusEnum.SUBMITTED]: {
        label: "Submitted",
        className: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300 shadow-sm",
        icon: FileText,
      },
      [TaxStatusEnum.APPROVED]: {
        label: "Approved",
        className: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 shadow-sm",
        icon: CheckCircle2,
      },
      [TaxStatusEnum.REJECTED]: {
        label: "Rejected",
        className: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-300 shadow-sm",
        icon: XCircle,
      },
    }

    const config = statusConfig[status] || statusConfig[TaxStatusEnum.PENDING]
    const Icon = config.icon

    return (
      <Badge className={cn("px-4 py-2 flex items-center gap-2 text-sm font-semibold border-2", config.className)}>
        <Icon className="h-4 w-4" />
        {config.label}
      </Badge>
    )
  }

  const getNextStatusOptions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      [TaxStatusEnum.PENDING]: [TaxStatusEnum.DRAFT],
      [TaxStatusEnum.DRAFT]: [TaxStatusEnum.SUBMITTED],
      [TaxStatusEnum.SUBMITTED]: [TaxStatusEnum.APPROVED, TaxStatusEnum.REJECTED],
      [TaxStatusEnum.APPROVED]: [],
      [TaxStatusEnum.REJECTED]: [],
    }
    return transitions[currentStatus] || []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <EnhancedLoader size="lg" text="Loading Tax data..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-6 border-2 border-purple-100 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tax Management</h2>
            <p className="text-gray-600">
              {isReadOnly 
                ? `View Tax documents and status for ${engagement?.title}` 
                : `Manage Tax documents and workflow for ${engagement?.title}`
              }
            </p>
          </div>
          {tax && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Current Status</p>
                {getStatusBadge(tax.currentStatus)}
              </div>
            </div>
          )}
        </div>
      </div>

      {tax ? (
        <div className="space-y-6">
            {/* Current Status Card */}
            <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Document Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <Label className="text-sm font-semibold text-gray-700">Final Document</Label>
                    </div>
                    <div className="mt-2">
                      {tax.document?.url ? (
                        <a
                          href={tax.document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium text-sm flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          View Document
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">No final document</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Edit className="h-5 w-5 text-purple-600" />
                      </div>
                      <Label className="text-sm font-semibold text-gray-700">Draft Document</Label>
                    </div>
                    <div className="mt-2">
                      {tax.draftDocument?.url ? (
                        <a
                          href={tax.draftDocument.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline font-medium text-sm flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          View Draft
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">No draft document</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isReadOnly && (
              <>
                {/* Update Status Card */}
                <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRight className="h-5 w-5 text-blue-600" />
                      Update Status
                    </CardTitle>
                    <CardDescription>
                      Progress through the Tax workflow by updating the status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {getNextStatusOptions(tax.currentStatus).length > 0 ? (
                        getNextStatusOptions(tax.currentStatus).map((status) => (
                          <Button
                            key={status}
                            onClick={() => handleStatusUpdate(status)}
                            disabled={updatingStatus}
                            variant="outline"
                            className="w-full justify-between p-4 h-auto border-2 hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Update to {status}</span>
                            </div>
                            {updatingStatus ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        ))
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-xl text-center">
                          <p className="text-sm text-gray-500">
                            No further status transitions available. Current status is final.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Upload Draft Document Card */}
                <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-purple-600" />
                      Upload Draft Document
                    </CardTitle>
                    <CardDescription>
                      {tax.currentStatus !== TaxStatusEnum.DRAFT ? (
                        <span className="text-yellow-600 font-medium">
                          ⚠️ Draft upload is only allowed at DRAFT status. Current status: {tax.currentStatus}
                        </span>
                      ) : (
                        "Upload draft Tax document (only allowed at DRAFT status)"
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-draft-file" className="text-sm font-semibold">Select Draft File</Label>
                      <div className="relative">
                        <Input
                          id="tax-draft-file"
                          type="file"
                          onChange={handleDraftFileSelect}
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          className="border-2 border-dashed hover:border-purple-400 transition-colors"
                          disabled={tax.currentStatus !== TaxStatusEnum.DRAFT}
                        />
                      </div>
                      {selectedDraftFile && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-gray-700 font-medium">
                            📄 {selectedDraftFile.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Size: {(selectedDraftFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                      {tax.currentStatus !== TaxStatusEnum.DRAFT && (
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            💡 Tip: Update status to "DRAFT" above to enable draft document upload
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleDraftUpload}
                      disabled={!selectedDraftFile || uploadingDraft || tax.currentStatus !== TaxStatusEnum.DRAFT}
                      className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all"
                      size="lg"
                    >
                      {uploadingDraft ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Upload Draft Document
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Upload Final Document Card */}
                <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-green-600" />
                      Upload Final Document
                    </CardTitle>
                    <CardDescription>
                      {tax.currentStatus === TaxStatusEnum.PENDING || tax.currentStatus === TaxStatusEnum.DRAFT ? (
                        <span className="text-yellow-600 font-medium">
                          ⚠️ Final document upload is only allowed at SUBMITTED status or later. Current status: {tax.currentStatus}
                        </span>
                      ) : (
                        "Upload final Tax document (allowed at SUBMITTED status or later)"
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-file" className="text-sm font-semibold">Select File</Label>
                      <div className="relative">
                        <Input
                          id="tax-file"
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          className="border-2 border-dashed hover:border-green-400 transition-colors"
                          disabled={tax.currentStatus === TaxStatusEnum.PENDING || tax.currentStatus === TaxStatusEnum.DRAFT}
                        />
                      </div>
                      {selectedFile && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-gray-700 font-medium">
                            📄 {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                      {(tax.currentStatus === TaxStatusEnum.PENDING || tax.currentStatus === TaxStatusEnum.DRAFT) && (
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            💡 Tip: Update status to "SUBMITTED" or later above to enable final document upload
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading || tax.currentStatus === TaxStatusEnum.PENDING || tax.currentStatus === TaxStatusEnum.DRAFT}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
                      size="lg"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Upload Final Document
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Status History */}
            <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-600" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {tax.statusHistory && tax.statusHistory.length > 0 ? (
                    tax.statusHistory.map((entry: any, index: number) => {
                      const isLatest = index === tax.statusHistory.length - 1;
                      return (
                        <div
                          key={index}
                          className="relative p-4 border-2 rounded-xl hover:shadow-md transition-all bg-white"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(entry.status)}
                              </div>
                              <p className="text-xs text-gray-500 mb-1">
                                {new Date(entry.createdAt).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-400">
                                Employee: {entry.employeeId}
                              </p>
                            </div>
                            {isLatest && (
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                Latest
                              </Badge>
                            )}
                          </div>
                          {index < tax.statusHistory.length - 1 && (
                            <div className="absolute left-6 top-full w-0.5 h-3 bg-gray-200 mt-1" />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No status history available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>
      ) : (
        <Card className="border-2 shadow-lg">
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-600">Tax record not found for this engagement</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


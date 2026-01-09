"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { mbrApi } from "@/services/api"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MBRTabProps {
  engagement: any
  isReadOnly?: boolean
}

const MBRStatusEnum = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
}

export const MBRTab = ({ engagement, isReadOnly = false }: MBRTabProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [mbr, setMbr] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (engagement?._id) {
      fetchMBR()
    }
  }, [engagement?._id])

  const fetchMBR = async () => {
    if (!engagement?._id) return
    
    setLoading(true)
    try {
      const data = await mbrApi.getByEngagement(engagement._id)
      setMbr(data)
    } catch (error: any) {
      console.error("Failed to fetch MBR:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load MBR data",
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

  const handleUpload = async () => {
    if (!mbr?._id || !selectedFile || !user?.id) return

    if (mbr.currentStatus === MBRStatusEnum.PENDING) {
      toast({
        title: "Upload not allowed",
        description: "Document upload is only allowed at SUBMITTED status or later",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      await mbrApi.uploadDocument(mbr._id, selectedFile, user.id)
      toast({
        title: "Success",
        description: "MBR document uploaded successfully",
      })
      setSelectedFile(null)
      await fetchMBR()
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

  const handleStatusUpdate = async (newStatus: string) => {
    if (!mbr?._id || !user?.id) return

    setUpdatingStatus(true)
    try {
      await mbrApi.updateStatus(mbr._id, {
        status: newStatus,
        employeeId: user.id,
      })
      toast({
        title: "Success",
        description: `MBR status updated to ${newStatus}`,
      })
      await fetchMBR()
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
      [MBRStatusEnum.PENDING]: {
        label: "Pending",
        className: "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300 shadow-sm",
        icon: Clock,
      },
      [MBRStatusEnum.SUBMITTED]: {
        label: "Submitted",
        className: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300 shadow-sm",
        icon: FileText,
      },
      [MBRStatusEnum.APPROVED]: {
        label: "Approved",
        className: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 shadow-sm",
        icon: CheckCircle2,
      },
      [MBRStatusEnum.REJECTED]: {
        label: "Rejected",
        className: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-300 shadow-sm",
        icon: XCircle,
      },
    }

    const config = statusConfig[status] || statusConfig[MBRStatusEnum.PENDING]
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
      [MBRStatusEnum.PENDING]: [MBRStatusEnum.SUBMITTED],
      [MBRStatusEnum.SUBMITTED]: [MBRStatusEnum.APPROVED, MBRStatusEnum.REJECTED],
      [MBRStatusEnum.APPROVED]: [],
      [MBRStatusEnum.REJECTED]: [],
    }
    return transitions[currentStatus] || []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <EnhancedLoader size="lg" text="Loading MBR data..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-100 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">MBR Management</h2>
            <p className="text-gray-600">
              {isReadOnly 
                ? `View MBR documents and status for ${engagement?.title}` 
                : `Manage MBR documents and workflow for ${engagement?.title}`
              }
            </p>
          </div>
          {mbr && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Current Status</p>
                {getStatusBadge(mbr.currentStatus)}
              </div>
            </div>
          )}
        </div>
      </div>

      {mbr ? (
        <div className="space-y-6">
            {/* Current Status Card */}
            <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <FileCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Document Status</Label>
                        <div className="mt-1">
                          {mbr.document?.url ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <a
                                href={mbr.document.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                View Document
                              </a>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No document uploaded</span>
                          )}
                        </div>
                      </div>
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
                      Progress through the MBR workflow by updating the status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {getNextStatusOptions(mbr.currentStatus).length > 0 ? (
                        getNextStatusOptions(mbr.currentStatus).map((status) => (
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

                {/* Upload Document Card */}
                <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-green-600" />
                      Upload Document
                    </CardTitle>
                    <CardDescription>
                      {mbr.currentStatus === MBRStatusEnum.PENDING ? (
                        <span className="text-yellow-600 font-medium">
                          ⚠️ Please update status to SUBMITTED first to upload documents
                        </span>
                      ) : (
                        "Upload MBR document (allowed at SUBMITTED status or later)"
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mbr-file" className="text-sm font-semibold">Select File</Label>
                      <div className="relative">
                        <Input
                          id="mbr-file"
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          className="border-2 border-dashed hover:border-primary transition-colors"
                          disabled={mbr.currentStatus === MBRStatusEnum.PENDING}
                        />
                      </div>
                      {selectedFile && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-700 font-medium">
                            📄 {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                      {mbr.currentStatus === MBRStatusEnum.PENDING && (
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            💡 Tip: Update status to "SUBMITTED" above to enable document upload
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading || mbr.currentStatus === MBRStatusEnum.PENDING}
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
                          Upload Document
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
                  {mbr.statusHistory && mbr.statusHistory.length > 0 ? (
                    mbr.statusHistory.map((entry: any, index: number) => {
                      const isLatest = index === mbr.statusHistory.length - 1;
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
                          {index < mbr.statusHistory.length - 1 && (
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
            <p className="text-lg text-gray-600">MBR record not found for this engagement</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


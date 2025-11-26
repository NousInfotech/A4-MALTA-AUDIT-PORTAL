// @ts-nocheck
import { useState, useEffect } from "react"
import { useLocation, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Shield, Mail, Smartphone, Loader2, CheckCircle2, XCircle, ArrowLeft, Library } from "lucide-react"
import { getFolders, enable2FA, disable2FA, generate2FASecret } from "@/lib/api/global-library"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"
import { AdminComprehensiveNavigation } from "@/components/ui/admin-comprehensive-navigation"

type GlobalFolder = {
  _id: string
  name: string
  path: string
  createdAt: string
  permissions?: {
    require2FA?: boolean
    twoFactorMethod?: "email" | "totp"
    [key: string]: any // Allow other permission fields
  } | null
}

export function Folder2FAManagement() {
  const location = useLocation()
  const isAdminPortal = location.pathname.startsWith("/admin")
  const [folders, setFolders] = useState<GlobalFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [totpSecrets, setTotpSecrets] = useState<Record<string, { secret: string; qrCode: string }>>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    try {
      setLoading(true)
      const foldersList = await getFolders()
      setFolders(foldersList)
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to load folders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEnable2FA = async (folderName: string, method: "email" | "totp") => {
    try {
      setActionLoading(`${folderName}-enable`)
      let secret: string | undefined
      let token: string | undefined

      if (method === "totp") {
        // Generate TOTP secret first
        const totpResult = await generate2FASecret(folderName)
        secret = totpResult.secret
        setTotpSecrets((prev) => ({
          ...prev,
          [folderName]: { secret: totpResult.secret, qrCode: totpResult.qrCode },
        }))
        
        // For TOTP, we need to verify with a token to enable
        toast({
          title: "QR Code Generated",
          description: "Please scan the QR code and enter the verification code to enable 2FA",
        })
        return // User needs to verify before enabling
      }

      // For email, enable directly
      await enable2FA(folderName, secret, token, method)
      toast({
        title: "2FA Enabled",
        description: `Two-factor authentication enabled for folder "${folderName}" using ${method}`,
      })
      await fetchFolders()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to enable 2FA",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisable2FA = async (folderName: string) => {
    try {
      setActionLoading(`${folderName}-disable`)
      await disable2FA(folderName)
      toast({
        title: "2FA Disabled",
        description: `Two-factor authentication disabled for folder "${folderName}"`,
      })
      // Clear TOTP secret if exists
      setTotpSecrets((prev) => {
        const newSecrets = { ...prev }
        delete newSecrets[folderName]
        return newSecrets
      })
      await fetchFolders()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to disable 2FA",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleMethodChange = async (folderName: string, method: "email" | "totp") => {
    try {
      // First disable, then enable with new method
      const folder = folders.find((f) => f.name === folderName)
      if (folder?.permissions?.require2FA) {
        await disable2FA(folderName)
      }
      await handleEnable2FA(folderName, method)
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to change 2FA method",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-body flex items-center justify-center">
        <EnhancedLoader size="lg" text="Loading folders..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-semibold text-brand-body">Folder 2FA Management</h1>
            </div>
            <Link
              to={isAdminPortal ? "/admin" : "/employee/library"}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-brand-body" />
              <span>Back to {isAdminPortal ? "Admin" : "Library"}</span>
            </Link>
          </div>
          <p className="text-brand-body">
            Manage two-factor authentication settings for library folders
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Folders List */}
            <Card className="bg-white/80 border border-white/50 shadow-lg">
              <CardHeader>
                <CardTitle>Library Folders</CardTitle>
                <CardDescription>
                  Enable or disable 2FA for each folder to enhance security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {folders.length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No folders found</p>
                    </div>
                  ) : (
                    folders.map((folder) => {
                      const has2FA = folder.permissions?.require2FA === true
                      const method = (folder.permissions?.twoFactorMethod || "email") as "email" | "totp"
                      const isLoading = actionLoading?.startsWith(folder.name) || false
                      const totpData = totpSecrets[folder.name]

                      return (
                        <div
                          key={folder._id}
                          className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-all bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                                {has2FA ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    2FA Enabled
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    2FA Disabled
                                  </Badge>
                                )}
                              </div>
                              {has2FA && (
                                <div className="flex items-center gap-2 mt-2">
                                  {method === "email" ? (
                                    <Badge variant="outline" className="border-blue-200 text-blue-700">
                                      <Mail className="h-3 w-3 mr-1" />
                                      Email OTP
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-purple-200 text-purple-700">
                                      <Smartphone className="h-3 w-3 mr-1" />
                                      Authenticator App
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              {has2FA ? (
                                <>
                                  <Select
                                    value={method}
                                    onValueChange={(value: "email" | "totp") =>
                                      handleMethodChange(folder.name, value)
                                    }
                                    disabled={isLoading}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="email">Email OTP</SelectItem>
                                      <SelectItem value="totp">Authenticator</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDisable2FA(folder.name)}
                                    disabled={isLoading}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Disable"
                                    )}
                                  </Button>
                                </>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEnable2FA(folder.name, "email")}
                                    disabled={isLoading}
                                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Mail className="h-4 w-4 mr-1" />
                                        Email
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEnable2FA(folder.name, "totp")}
                                    disabled={isLoading}
                                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Smartphone className="h-4 w-4 mr-1" />
                                        TOTP
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* TOTP QR Code Display */}
                          {totpData && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <Label className="text-sm font-medium mb-2 block">
                                Scan this QR code with your authenticator app:
                              </Label>
                              <div className="flex justify-center mb-2">
                                <img
                                  src={totpData.qrCode}
                                  alt="QR Code"
                                  className="w-48 h-48 border rounded-lg bg-white p-2"
                                  onError={(e) => {
                                    console.error("QR Code image failed to load:", totpData.qrCode.substring(0, 50))
                                    e.currentTarget.style.display = "none"
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-600 text-center mb-2">
                                After scanning, enter a verification code to complete setup
                              </p>
                              <p className="text-xs text-gray-500 text-center">
                                Manual entry key: <code className="bg-white px-2 py-1 rounded">{totpData.secret}</code>
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <Card className="bg-white/80 border border-white/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  2FA Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Email OTP</h4>
                  <p className="text-sm text-gray-600">
                    Users receive a 6-digit code via email when accessing protected folders.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Authenticator App (TOTP)</h4>
                  <p className="text-sm text-gray-600">
                    Users scan a QR code with apps like Google Authenticator or Authy to generate time-based codes.
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <strong>Note:</strong> Once 2FA is enabled, users must verify their identity before accessing files in that folder.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Admin Navigation - Only show in admin portal */}
            {isAdminPortal && <AdminComprehensiveNavigation />}
            
            {/* Employee Portal - Library Link */}
            {!isAdminPortal && (
              <Card className="bg-white/80 border border-white/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Library className="h-5 w-5 text-primary" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to="/employee/library">
                    <Button variant="outline" className="w-full justify-start">
                      <Library className="h-4 w-4 mr-2" />
                      Back to Library
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


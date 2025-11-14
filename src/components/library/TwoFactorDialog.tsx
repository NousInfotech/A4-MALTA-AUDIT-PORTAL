// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Shield, Mail, Smartphone } from "lucide-react"
import { verify2FA, sendEmailOTP, generate2FASecret, enable2FA } from "@/lib/api/global-library"

interface TwoFactorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  method?: "email" | "totp"
  onVerified: () => void
}

export function TwoFactorDialog({ open, onOpenChange, folderName, method = "email", onVerified }: TwoFactorDialogProps) {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingOTP, setSendingOTP] = useState(false)
  const [currentMethod, setCurrentMethod] = useState<"email" | "totp">(method)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSendOTP = async () => {
    setSendingOTP(true)
    try {
      const result = await sendEmailOTP(folderName)
      toast({
        title: "OTP Sent",
        description: result.message || "Check your email for the verification code",
      })
      if (result.otp && process.env.NODE_ENV === "development") {
        toast({
          title: "Development Mode",
          description: `OTP: ${result.otp}`,
        })
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to send OTP",
        variant: "destructive",
      })
    } finally {
      setSendingOTP(false)
    }
  }

  const handleGenerateTOTP = async () => {
    setLoading(true)
    try {
      const result = await generate2FASecret(folderName)
      setTotpSecret(result.secret)
      setQrCode(result.qrCode)
      toast({
        title: "TOTP Secret Generated",
        description: "Scan the QR code with your authenticator app",
      })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to generate TOTP secret",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!token.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter the verification token",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await verify2FA(folderName, token, currentMethod)
      toast({
        title: "Verified",
        description: "2FA verification successful",
      })
      setToken("")
      onVerified()
      onOpenChange(false)
    } catch (e: any) {
      toast({
        title: "Verification Failed",
        description: e.message || "Invalid token",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Two-Factor Authentication Required</DialogTitle>
          </div>
          <DialogDescription>
            Folder "{folderName}" requires 2FA verification to access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Method Selection */}
          <div className="flex gap-2">
            <Button
              variant={currentMethod === "email" ? "default" : "outline"}
              onClick={() => setCurrentMethod("email")}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button
              variant={currentMethod === "totp" ? "default" : "outline"}
              onClick={() => setCurrentMethod("totp")}
              className="flex-1"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Authenticator App
            </Button>
          </div>

          {/* Email OTP */}
          {currentMethod === "email" && (
            <div className="space-y-4">
              <div>
                <Label>Verification Code</Label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A verification code has been sent to your email
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSendOTP}
                disabled={sendingOTP}
                className="w-full"
              >
                {sendingOTP ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Resend Code
              </Button>
            </div>
          )}

          {/* TOTP */}
          {currentMethod === "totp" && (
            <div className="space-y-4">
              {!qrCode ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Generate a QR code to set up your authenticator app
                  </p>
                  <Button onClick={handleGenerateTOTP} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Smartphone className="h-4 w-4 mr-2" />
                    )}
                    Generate QR Code
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48 border rounded-lg" />
                  </div>
                  <div>
                    <Label>Verification Code</Label>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code from app"
                      value={token}
                      onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={loading || !token.trim() || token.length !== 6}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Verify
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


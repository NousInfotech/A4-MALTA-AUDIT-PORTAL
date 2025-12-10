import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");
    const { branding } = useBranding();

    const logoUrl = branding?.logo_url || "/logo.png";
    const orgName = branding?.organization_name || "Audit Portal";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                throw error;
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to send password reset email");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded object-cover" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {!isSuccess ? (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <Alert variant="destructive">
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div>
                                <Label htmlFor="email">Email address</Label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="pl-10"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Button
                                    type="submit"
                                    className="w-full flex justify-center"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    ) : null}
                                    Send reset link
                                </Button>
                            </div>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="font-medium text-primary hover:text-primary/90 flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to sign in
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    We've sent a password reset link to <strong>{email}</strong>.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsSuccess(false)}
                            >
                                Try another email
                            </Button>
                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="font-medium text-primary hover:text-primary/90"
                                >
                                    Back to sign in
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

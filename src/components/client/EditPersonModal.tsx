import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, X } from "lucide-react";

interface EditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  clientId: string;
  companyId: string;
  onSuccess: () => void;
}

const ROLES = [
  "ShareHolder",
  "Director",
  "Judicial",
  "Representative",
  "LegalRepresentative",
  "Secretary",
];

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  isOpen,
  onClose,
  person,
  clientId,
  companyId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    roles: [] as string[],
    email: "",
    phoneNumber: "",
    sharePercentage: "",
    nationality: "",
  });
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `persons/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("engagement-documents")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("engagement-documents")
        .getPublicUrl(fileName);

      setSupportingDocuments([...supportingDocuments, publicUrl]);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDocument = (index: number) => {
    const updated = supportingDocuments.filter((_, i) => i !== index);
    setSupportingDocuments(updated);
  };

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || "",
        address: person.address || "",
        roles: person.roles || [],
        email: person.email || "",
        phoneNumber: person.phoneNumber || "",
        sharePercentage: person.sharePercentage?.toString() || "",
        nationality: person.nationality || "",
      });
      setSupportingDocuments(person.supportingDocuments || []);
    }
  }, [person]);

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        roles: [...formData.roles, role],
      });
    } else {
      setFormData({
        ...formData,
        roles: formData.roles.filter((r) => r !== role),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const payload = {
        name: formData.name,
        address: formData.address,
        roles: formData.roles,
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        sharePercentage: formData.sharePercentage
          ? parseFloat(formData.sharePercentage)
          : undefined,
        nationality: formData.nationality || undefined,
        supportingDocuments,
      };

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person/${person._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update person");
      }

      toast({
        title: "Success",
        description: "Person updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error updating person:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update person",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">
            Edit Person
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 font-semibold">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter person name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="rounded-xl border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700 font-semibold">
              Address
            </Label>
            <Textarea
              id="address"
              placeholder="Enter person address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="rounded-xl border-gray-200"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Roles</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={formData.roles.includes(role)}
                    onCheckedChange={(checked) =>
                      handleRoleChange(role, checked as boolean)
                    }
                    className="rounded"
                  />
                  <Label
                    htmlFor={`role-${role}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {role.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="rounded-xl border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phoneNumber"
                className="text-gray-700 font-semibold"
              >
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                className="rounded-xl border-gray-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="sharePercentage"
                className="text-gray-700 font-semibold"
              >
                Share Percentage
              </Label>
              <Input
                id="sharePercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Enter share percentage"
                value={formData.sharePercentage}
                onChange={(e) =>
                  setFormData({ ...formData, sharePercentage: e.target.value })
                }
                className="rounded-xl border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality" className="text-gray-700 font-semibold">
                Nationality
              </Label>
              <Input
                id="nationality"
                placeholder="Enter nationality"
                value={formData.nationality}
                onChange={(e) =>
                  setFormData({ ...formData, nationality: e.target.value })
                }
                className="rounded-xl border-gray-200"
              />
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Supporting Documents</Label>
            <input
              type="file"
              onChange={handleUploadFile}
              className="hidden"
              id="edit-person-doc-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            <label htmlFor="edit-person-doc-upload">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload documents</p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
              </div>
            </label>

            {supportingDocuments.length > 0 && (
              <div className="space-y-2 mt-3">
                {supportingDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    <p className="text-sm text-gray-700 flex-1 truncate">
                      Document {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDocument(index)}
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name}
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Person"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


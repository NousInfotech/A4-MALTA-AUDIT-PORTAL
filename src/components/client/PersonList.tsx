import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit, Trash2, Mail, Phone, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreatePersonModal } from "./CreatePersonModal";
import { EditPersonModal } from "./EditPersonModal";
import { DeletePersonConfirmation } from "./DeletePersonConfirmation";

interface Person {
  _id: string;
  name: string;
  roles: string[];
  email?: string;
  phoneNumber?: string;
  sharePercentage?: number;
  nationality?: string;
  address?: string;
  supportingDocuments?: string[];
}

interface PersonListProps {
  companyId: string;
  clientId: string;
  company: any;
  onUpdate: () => void;
}

export const PersonList: React.FC<PersonListProps> = ({
  companyId,
  clientId,
  company,
  onUpdate,
}) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchPersons = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch persons");

      const result = await response.json();
      const next = result.data || [];
      setPersons(next);
      try {
        window.dispatchEvent(new CustomEvent('persons-updated', { detail: next }));
      } catch (_) {}
    } catch (error) {
      console.error("Error fetching persons:", error);
      toast({
        title: "Error",
        description: "Failed to load persons",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && clientId) {
      fetchPersons();
    }
  }, [companyId, clientId]);

  const handleDeleteClick = (person: Person) => {
    setPersonToDelete(person);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!personToDelete) return;

    try {
      setIsDeleting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person/${personToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete person");

      toast({
        title: "Success",
        description: "Person deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setPersonToDelete(null);
      fetchPersons();
      try {
        const next = persons.filter(p => p._id !== personToDelete._id);
        window.dispatchEvent(new CustomEvent('persons-updated', { detail: next }));
      } catch (_) {}
      onUpdate();
    } catch (error) {
      console.error("Error deleting person:", error);
      toast({
        title: "Error",
        description: "Failed to delete person",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPerson = (person: Person) => {
    setSelectedPerson(person);
    setIsEditModalOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "ShareHolder") return "bg-blue-100 text-blue-700 border-blue-200";
    if (role === "Director") return "bg-green-100 text-green-700 border-green-200";
    if (role === "Judicial") return "bg-purple-100 text-purple-700 border-purple-200";
    if (role === "Representative") return "bg-amber-100 text-amber-700 border-amber-200";
    if (role === "LegalRepresentative") return "bg-red-100 text-red-700 border-red-200";
    if (role === "Secretary") return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading persons...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-hover rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Representatives</h3>
              <p className="text-sm text-gray-600">
                Individuals associated with this company
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          {persons.length > 0 && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
             className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Person
            </Button>
          )}
          <Button size="sm" className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
             Company
          </Button>
          </div>
        </div>

        {/* Persons Grid */}
        {persons.length > 0 ? (
          <div className="space-y-4">
            {persons.map((person) => (
              <Card
                key={person._id}
                className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {person.name}
                        </h4>
                        {person.sharePercentage &&
                          person.sharePercentage > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-blue-100 text-blue-700 border-blue-200 rounded-xl px-3 py-1 text-sm font-semibold"
                            >
                              {person.sharePercentage}% Shareholder
                            </Badge>
                          )}
                      </div>

                      {/* Roles */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {person.roles?.map((role, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className={`rounded-xl px-2 py-1 text-xs font-semibold ${getRoleBadgeVariant(role)}`}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2">
                        {person.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span>{person.email}</span>
                          </div>
                        )}
                        {person.phoneNumber && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{person.phoneNumber}</span>
                          </div>
                        )}
                        {person.nationality && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Globe className="h-4 w-4" />
                            <span>{person.nationality}</span>
                          </div>
                        )}
                        {person.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-xs">{person.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPerson(person)}
                        className="rounded-xl hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(person)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No persons yet</p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Person
            </Button>
          </div>
        )}
      </div>

      {/* Create Person Modal */}
      <CreatePersonModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchPersons();
          onUpdate();
        }}
        clientId={clientId}
        companyId={companyId}
        existingShareTotal={(persons || []).reduce((acc, p) => {
          const hasShare = Array.isArray(p?.roles) && p.roles.includes("ShareHolder");
          const pct = typeof p?.sharePercentage === "number" ? p.sharePercentage : 0;
          return acc + (hasShare ? pct : 0);
        }, 0)}
      />

      {/* Edit Person Modal */}
      <EditPersonModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPerson(null);
        }}
        person={selectedPerson}
        clientId={clientId}
        companyId={companyId}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setSelectedPerson(null);
          fetchPersons();
          onUpdate();
        }}
      />

      {/* Delete Person Confirmation Dialog */}
      <DeletePersonConfirmation
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setPersonToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        personName={personToDelete?.name || ""}
        isLoading={isDeleting}
      />
    </>
  );
};


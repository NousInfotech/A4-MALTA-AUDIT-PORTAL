import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Users, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Person {
  _id: string;
  name: string;
  roles: string[];
  email?: string;
  phoneNumber?: string;
  nationality?: string;
  address?: string;
}

interface ShareholdingCompany {
  companyId: string | { _id: string; name: string; registrationNumber?: string };
  companyName: string;
}

interface PersonWithCompany extends Person {
  companyId: string;
  companyName: string;
}

interface AddPersonFromShareholdingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  companyId: string;
  shareholdingCompanies: ShareholdingCompany[];
}

const ROLES = [
  "Director",
  "Judicial Representative",
  "Legal Representative",
  "Secretary",
];

export const AddPersonFromShareholdingModal: React.FC<AddPersonFromShareholdingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  companyId,
  shareholdingCompanies,
}) => {
  const [personsByCompany, setPersonsByCompany] = useState<Record<string, PersonWithCompany[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersons, setSelectedPersons] = useState<Set<string>>(new Set());
  const [personRoles, setPersonRoles] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch persons from shareholding companies
  useEffect(() => {
    if (isOpen && shareholdingCompanies.length > 0) {
      fetchPersonsFromShareholdingCompanies();
    }
  }, [isOpen, shareholdingCompanies]);

  const fetchPersonsFromShareholdingCompanies = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const personsByCompanyMap: Record<string, PersonWithCompany[]> = {};

      // Fetch all shareholders from each shareholding company
      for (const shareCompany of shareholdingCompanies) {
        const shareCompanyId = typeof shareCompany.companyId === 'object' 
          ? shareCompany.companyId._id 
          : shareCompany.companyId;

        try {
          // Fetch the shareholding company directly to get all shareholders
          const companyResponse = await fetch(
            `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${shareCompanyId}`,
            {
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            }
          );

          if (!companyResponse.ok) continue;

          const companyResult = await companyResponse.json();
          const shareholdingCompany = companyResult.data;

          // Get all shareholders from shareHolders array
          const shareHolders = shareholdingCompany?.shareHolders || [];
          
          // Map shareholders to person objects
          const shareholders: PersonWithCompany[] = shareHolders
            .map((shareHolder: any) => {
              const personData = shareHolder.personId;
              if (!personData || !personData._id) return null;

              // All persons in shareHolders are shareholders by definition
              return {
                _id: personData._id,
                name: personData.name || '',
                roles: ['Shareholder'], // They are shareholders
                email: personData.email,
                phoneNumber: personData.phoneNumber,
                nationality: personData.nationality,
                address: personData.address,
                companyId: shareCompanyId,
                companyName: shareCompany.companyName,
              };
            })
            .filter((person: PersonWithCompany | null) => person !== null) as PersonWithCompany[];

          if (shareholders.length > 0) {
            personsByCompanyMap[shareCompany.companyName] = shareholders;
          }
        } catch (error) {
          console.error(`Error fetching shareholders from company ${shareCompany.companyName}:`, error);
        }
      }

      setPersonsByCompany(personsByCompanyMap);
    } catch (error) {
      console.error("Error fetching persons from shareholding companies:", error);
      toast({
        title: "Error",
        description: "Failed to load persons from shareholding companies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonToggle = (personId: string) => {
    const newSelected = new Set(selectedPersons);
    if (newSelected.has(personId)) {
      newSelected.delete(personId);
      // Remove roles when deselecting
      const newRoles = { ...personRoles };
      delete newRoles[personId];
      setPersonRoles(newRoles);
    } else {
      newSelected.add(personId);
      // Initialize with empty roles
      setPersonRoles({ ...personRoles, [personId]: [] });
    }
    setSelectedPersons(newSelected);
  };

  const handleRoleToggle = (personId: string, role: string) => {
    const currentRoles = personRoles[personId] || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    
    setPersonRoles({ ...personRoles, [personId]: newRoles });
  };

  const handleSubmit = async () => {
    // Validate that all selected persons have at least one role
    const personsWithoutRoles = Array.from(selectedPersons).filter(
      (personId) => !personRoles[personId] || personRoles[personId].length === 0
    );

    if (personsWithoutRoles.length > 0) {
      toast({
        title: "Error",
        description: "Please assign at least one role to each selected person",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // Fetch current company data
      const companyResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!companyResponse.ok) throw new Error("Failed to fetch company data");
      const companyData = await companyResponse.json();
      const company = companyData.data;

      // Get existing representationalSchema
      const existingSchema = company.representationalSchema || [];

      // Create new entries for selected persons
      const newEntries = Array.from(selectedPersons).map((personId) => {
        const person = Object.values(personsByCompany)
          .flat()
          .find((p) => p._id === personId);
        
        if (!person) throw new Error(`Person ${personId} not found`);

        // Check if person is from the same company (don't store companyId)
        // or from a different company (store companyId)
        const isFromSameCompany = person.companyId === companyId;
        const companyIdToStore = isFromSameCompany ? undefined : person.companyId;

        return {
          personId: personId,
          role: personRoles[personId],
          ...(companyIdToStore && { companyId: companyIdToStore }),
        };
      });

      // Remove existing entries for selected persons (to avoid duplicates)
      const filteredSchema = existingSchema.filter(
        (entry: any) => !selectedPersons.has(entry.personId?._id || entry.personId)
      );

      // Combine filtered schema with new entries
      const updatedSchema = [...filteredSchema, ...newEntries];

      // Update company
      const updateResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            ...company,
            representationalSchema: updatedSchema,
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || "Failed to update company");
      }

      toast({
        title: "Success",
        description: "Persons added to representatives successfully",
      });

      // Reset state
      setSelectedPersons(new Set());
      setPersonRoles({});
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error adding persons from shareholding companies:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add persons",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPersons(new Set());
    setPersonRoles({});
    onClose();
  };

  const totalPersons = Object.values(personsByCompany).reduce(
    (sum, persons) => sum + persons.length,
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Persons from Shareholding Companies
          </DialogTitle>
          <DialogDescription>
            Select persons from shareholding companies who have "Shareholder" role and assign them additional roles.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading persons...</span>
          </div>
        ) : totalPersons === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No persons with "Shareholder" role found in shareholding companies
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(personsByCompany).map(([companyName, persons]) => (
              <div key={companyName} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">{companyName}</h3>
                  <Badge variant="outline" className="ml-auto">
                    {persons.length} {persons.length === 1 ? "person" : "persons"}
                  </Badge>
                </div>

                <div className="space-y-3 pl-4">
                  {persons.map((person) => {
                    const isSelected = selectedPersons.has(person._id);
                    const personRolesList = personRoles[person._id] || [];

                    return (
                      <Card
                        key={person._id}
                        className={`border-2 transition-all ${
                          isSelected
                            ? "border-brand-hover bg-brand-hover/5"
                            : "border-gray-200"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handlePersonToggle(person._id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 capitalize">
                                  {person.name}
                                </h4>
                                {person.nationality && (
                                  <Badge variant="outline" className="text-xs">
                                    {person.nationality}
                                  </Badge>
                                )}
                              </div>
                              {person.email && (
                                <p className="text-sm text-gray-600 mb-1">{person.email}</p>
                              )}
                              {person.address && (
                                <p className="text-xs text-gray-500 mb-2">{person.address}</p>
                              )}

                              {isSelected && (
                                <div className="mt-3 pt-3 border-t">
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Assign Roles (excluding Shareholder):
                                  </Label>
                                  <div className="flex flex-wrap gap-2">
                                    {ROLES.map((role) => {
                                      const isRoleSelected = personRolesList.includes(role);
                                      return (
                                        <Button
                                          key={role}
                                          type="button"
                                          variant={isRoleSelected ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => handleRoleToggle(person._id, role)}
                                          className={`text-xs ${
                                            isRoleSelected
                                              ? "bg-brand-hover hover:bg-brand-sidebar text-white"
                                              : ""
                                          }`}
                                        >
                                          {role}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                  {personRolesList.length === 0 && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Please select at least one role
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedPersons.size === 0}
            className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedPersons.size} ${selectedPersons.size === 1 ? "Person" : "Persons"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


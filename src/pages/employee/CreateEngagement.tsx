import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEngagements } from '@/hooks/useEngagements';
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const CreateEngagement = () => {
  const {user} = useAuth();
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    yearEndDate: '',
    trialBalanceUrl: '',
    createdBy:user.name
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createEngagement } = useEngagements();
  const navigate = useNavigate();
  const { toast } = useToast();

  interface User {
  summary: string;
  id: string
  name: string
  email: string
  role: "admin" | "employee" | "client"
  status: "pending" | "approved" | "rejected"
  createdAt: string
  companyName?: string
  companyNumber?: string
  industry?: string
}
  const [loading, setLoading] = useState(true)

const [clients, setClients] = useState<User[]>([])
    useEffect(() => {
      fetchClients()
    }, [])
  
    const fetchClients = async () => {
      try {
        setLoading(true)

        const user = await supabase.auth.getUser();
  
        // Simple query - only profiles table, no joins
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            user_id,
            name,
            role,
            status,
            created_at,
            updated_at,
            company_name,
            company_number,
            industry,
            company_summary
          `)
          .order("created_at", { ascending: false })
  
        if (error) {
          console.error("Supabase error:", error)
          throw error
        }
  
  
        // Transform profiles to User format
        const transformedClients: User[] =
          data?.map((profile) => ({
            id: profile.user_id,
            name: profile.name || "Unknown User",
            email: user.data.user.email,// We'll handle email separately
            role: profile.role as "admin" | "employee" | "client",
            status: profile.status as "pending" | "approved" | "rejected",
            createdAt: profile.created_at,
            companyName: profile.company_name || undefined,
            companyNumber: profile.company_number || undefined,
            industry: profile.industry || undefined,
            summary: profile.company_summary || undefined,
          })) || []
  
        setClients(transformedClients.filter(client=>client.role==='client'))
      } catch (error) {
        console.error("Error fetching clients:", error)
        toast({
          title: "Error",
          description: `Failed to fetch clients: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newEngagement = await createEngagement(formData);
      
      toast({
        title: "Engagement created successfully",
        description: "You can now start uploading trial balance and managing this engagement.",
      });

      navigate(`/employee/engagements/${newEngagement._id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create engagement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Engagement</h1>
          <p className="text-muted-foreground mt-2">
            Set up a new audit engagement for a client
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle>Engagement Details</CardTitle>
                <CardDescription>
                  Enter the basic information for the new audit engagement
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientId">Select Client *</Label>
                <Select value={formData.clientId} onValueChange={(value) => handleChange('clientId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client for this engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div>
                          <div className="font-medium">{client.companyName}</div>
                          <div className="text-sm text-muted-foreground">{client.industry}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No clients available. Please add a client first.
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Engagement Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Annual Audit 2024, Interim Review Q3 2024"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="yearEndDate">Year End Date *</Label>
                <Input
                  id="yearEndDate"
                  type="date"
                  value={formData.yearEndDate}
                  onChange={(e) => handleChange('yearEndDate', e.target.value)}
                  required
                />
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="trialBalanceUrl">Trial Balance URL</Label>
                <Input
                  id="trialBalanceUrl"
                  value={formData.trialBalanceUrl}
                  onChange={(e) => handleChange('trialBalanceUrl', e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <p className="text-sm text-muted-foreground">
                  Optional: You can add this later from the engagement details page
                </p>
              </div> */}
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Next Steps</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Upload trial balance data via Google Sheets link</li>
                  <li>• Send document requests to the client</li>
                  <li>• Generate and complete audit procedures</li>
                  <li>• Export final reports</li>
                </ul>
              </div>
              
              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting || clients.length === 0}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Engagement
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// @ts-nocheck
import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEngagements, Engagement } from '@/hooks/useEngagements';
import { engagementApi } from '@/services/api';
import { ArrowLeft, Briefcase, Loader2, Users, Calendar, FileText, Sparkles, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { fetchCompanies } from '@/lib/api/company';

export const CreateEngagement = () => {
  const {user} = useAuth();
  const [formData, setFormData] = useState({
    clientId: '',
    companyId: '',
    title: '',
    yearEndDate: '',
    trialBalanceUrl: '',
    createdBy:user.name
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createEngagement } = useEngagements();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCreateEngagement } = useActivityLogger();
  
  // State to store existing engagements for validation
  const [existingEngagements, setExistingEngagements] = useState<Engagement[]>([]);
  const [yearError, setYearError] = useState<string>('');
  const [titleError, setTitleError] = useState<string>('');

  interface User {
  summary: string;
  id: string
  name: string
  email: string
  role: "admin" | "employee" | "client"
  status: "pending" | "approved" | "rejected"
  createdAt: string
  companyName?: string
  name?: string
  companyNumber?: string
  industry?: string
}
  interface Company {
    _id: string;
    name: string;
    registrationNumber?: string;
    address?: string;
  }
  const [loading, setLoading] = useState(true)

const [clients, setClients] = useState<User[]>([])
const [clientCompanies, setClientCompanies] = useState<Company[]>([])
const [isCompanyLoading, setIsCompanyLoading] = useState(false)
const [companyError, setCompanyError] = useState<string>('')

  const extractYear = (dateString: string) => {
    if (!dateString) return ''
    const [year] = dateString.split('-')
    return year || ''
  }

  const buildTitleFromCompany = (companyName: string, yearEndDate: string) => {
    if (!companyName) return ''
    const year = extractYear(yearEndDate)
    return year ? `${companyName} AUDIT-${year}` : companyName
  }

  const getCompanyNameById = (companyId: string) => {
    const company = clientCompanies.find((c) => c._id === companyId)
    return company?.name || ''
  }
    
    useEffect(() => {
      fetchClients();
      fetchExistingEngagements();
    }, [])
    
    // Fetch existing engagements for validation
    const fetchExistingEngagements = async () => {
      try {
        const engagements = await engagementApi.getAll();
        setExistingEngagements(engagements);
      } catch (error) {
        console.error("Error fetching existing engagements:", error);
      }
    };
  
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
            name: profile.name || undefined,
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

  const loadCompaniesForClient = async (clientId: string) => {
    if (!clientId) {
      setClientCompanies([])
      setCompanyError('')
      setIsCompanyLoading(false)
      setFormData(prev => ({ ...prev, companyId: '' }))
      return
    }

    setIsCompanyLoading(true)
    setCompanyError('')
    setClientCompanies([])

    try {
      const response = await fetchCompanies(clientId)
      const companiesData = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const normalizedCompanies = companiesData || []

      setClientCompanies(normalizedCompanies)

      setFormData(prev => {
        if (normalizedCompanies.length === 1) {
          const singleCompany = normalizedCompanies[0]
          const companyId = singleCompany?._id ?? ''
          const companyName = singleCompany?.name || ''
          const newTitle = buildTitleFromCompany(companyName, prev.yearEndDate)
          return { ...prev, companyId, title: newTitle }
        }
        const validId = normalizedCompanies.some(company => company._id === prev.companyId)
          ? prev.companyId
          : ''
        const companyName = normalizedCompanies.find((company) => company._id === validId)?.name || ''
        const newTitle = buildTitleFromCompany(companyName, prev.yearEndDate)
        return { ...prev, companyId: validId, title: newTitle }
      })
    } catch (error: any) {
      console.error("Error fetching companies for client:", error)
      setCompanyError(error?.message || "Failed to load companies for this client.")
      setClientCompanies([])
      setFormData(prev => ({ ...prev, companyId: '' }))
    } finally {
      setIsCompanyLoading(false)
    }
  }

  // Validation function to check for duplicate year
  const validateYear = (yearEndDate: string, clientId: string): { isValid: boolean; errorMessage: string; duplicateYear?: number } => {
    if (!yearEndDate || !clientId) {
      return { isValid: true, errorMessage: '' };
    }

    const inputYear = new Date(yearEndDate).getFullYear();
    const duplicateEngagement = existingEngagements.find((eng) => {
      if (eng.clientId === clientId && eng.yearEndDate) {
        const existingYear = new Date(eng.yearEndDate).getFullYear();
        return existingYear === inputYear;
      }
      return false;
    });

    if (duplicateEngagement) {
      return {
        isValid: false,
        errorMessage: `An engagement already exists for ${inputYear} for this client. Please choose next or previous year.`,
        duplicateYear: inputYear
      };
    }

    return { isValid: true, errorMessage: '' };
  };

  // Validation function to check for duplicate title
  const validateTitle = (title: string, clientId: string): { isValid: boolean; errorMessage: string } => {
    if (!title || !clientId) {
      return { isValid: true, errorMessage: '' };
    }

    const duplicateTitle = existingEngagements.find(
      (eng) => eng.clientId === clientId && eng.title === title
    );

    if (duplicateTitle) {
      return {
        isValid: false,
        errorMessage: 'An engagement with this title already exists for this client. Please choose a different title.'
      };
    }

    return { isValid: true, errorMessage: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation: Check for duplicate title
      const titleValidation = validateTitle(formData.title, formData.clientId);
      if (!titleValidation.isValid) {
        toast({
          title: "Duplicate Engagement Title",
          description: titleValidation.errorMessage,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Validation: Check for duplicate year
      const yearValidation = validateYear(formData.yearEndDate, formData.clientId);
      if (!yearValidation.isValid) {
        toast({
          title: "Duplicate Year",
          description: yearValidation.errorMessage,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const newEngagement = await createEngagement(formData);
      
      // Log engagement creation
      logCreateEngagement(`Created new engagement: ${formData.title}`);
      
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
    if (field === 'clientId') {
      // When client is selected, update the title with company name
      setYearError(''); // Clear year error when client changes
      setTitleError(''); // Clear title error when client changes
      const selectedClient = clients.find(client => client.id === value);
      if (selectedClient && selectedClient.name) {
        setFormData(prev => ({ 
          ...prev, 
          clientId: value,
          companyId: '',
          title: '' 
        }));
      } else {
        setFormData(prev => ({ ...prev, clientId: value, companyId: '', title: '' }));
      }
      loadCompaniesForClient(value);
    } else if (field === 'companyId') {
      const companyName = getCompanyNameById(value);
      const newTitle = buildTitleFromCompany(companyName, formData.yearEndDate);
      setFormData(prev => ({
        ...prev,
        companyId: value,
        title: newTitle
      }));
      if (formData.clientId && newTitle) {
        const titleValidation = validateTitle(newTitle, formData.clientId);
        if (!titleValidation.isValid) {
          setTitleError(titleValidation.errorMessage);
        } else {
          setTitleError('');
        }
      } else {
        setTitleError('');
      }
    } else if (field === 'title') {
      // Validate title when it changes
      setFormData(prev => ({ ...prev, [field]: value }));
      if (formData.clientId) {
        const titleValidation = validateTitle(value, formData.clientId);
        if (!titleValidation.isValid) {
          setTitleError(titleValidation.errorMessage);
        } else {
          setTitleError('');
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleYearEndDateChange = (value: string) => {
    // Get the selected company's name
    const companyName = getCompanyNameById(formData.companyId);
    
    // Validate the year before proceeding
    if (formData.clientId) {
      const yearValidation = validateYear(value, formData.clientId);
      if (!yearValidation.isValid) {
        setYearError(yearValidation.errorMessage);
      } else {
        setYearError('');
      }
    }
    
    // If we have a company name, build the title based on company and year
    if (companyName) {
      const newTitle = buildTitleFromCompany(companyName, value);
      
      // Validate the new title if client is selected
      if (formData.clientId) {
        const titleValidation = validateTitle(newTitle, formData.clientId);
        if (!titleValidation.isValid) {
          setTitleError(titleValidation.errorMessage);
        } else {
          setTitleError('');
        }
      }
      
      setFormData(prev => ({ 
        ...prev, 
        yearEndDate: value,
        title: newTitle
      }));
    } else {
      setFormData(prev => ({ ...prev, yearEndDate: value }));
    }
  };

  return (
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="rounded-xl bg-white border border-gray-200 text-brand-body hover:bg-gray-100 hover:text-brand-body shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-brand-body">Create New Engagement</h1>
                <p className="text-brand-body">Set up a new audit engagement for your client</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Engagement Details</h2>
                <p className="text-gray-600">
                  Enter the basic information for the new audit engagement
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Client Selection */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Client Selection</h3>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="clientId" className="text-sm font-medium text-gray-700">Select Client *</Label>
                <Select value={formData.clientId} onValueChange={(value) => handleChange('clientId', value)}>
                    <SelectTrigger className="h-auto min-h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg py-3">
                    {formData.clientId ? (
                      <div className="flex flex-col items-start text-left w-full pr-8">
                        <div className="font-semibold text-gray-900">
                          {clients.find(c => c.id === formData.clientId)?.name || ''}
                        </div>
                        {isCompanyLoading ? (
                          <div className="text-xs text-gray-500 mt-1">Loading company...</div>
                        ) : clientCompanies.length > 0 ? (
                          <div className="text-xs text-gray-600 mt-1">
                            <div>{clientCompanies[0].name}</div>
                            {clientCompanies[0].registrationNumber && (
                              <div className="mt-0.5">Reg No: {clientCompanies[0].registrationNumber}</div>
                            )}
                          </div>
                        ) : !companyError ? (
                          <div className="text-xs text-gray-500 mt-1">No company found</div>
                        ) : null}
                        {companyError && (
                          <div className="text-xs text-red-600 mt-1">{companyError}</div>
                        )}
                      </div>
                    ) : (
                      <SelectValue placeholder="Choose a client for this engagement" />
                    )}
                  </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 rounded-xl">
                    {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="rounded-lg">
                          <div className="py-1">
                            <div className="font-semibold text-gray-900">{client.name}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-700 font-medium">
                    No clients available. Please add a client first.
                  </p>
                    </div>
                )}
                </div>
              </div>
              
              {/* Engagement Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Engagement Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
              
                  <div className="space-y-3">
                    <Label htmlFor="yearEndDate" className="text-sm font-medium text-gray-700">Year End Date *</Label>
                <Input
                  id="yearEndDate"
                  type="date"
                  value={formData.yearEndDate}
                  onChange={(e) => handleYearEndDateChange(e.target.value)}
                      className={`h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg ${yearError ? 'border-red-500' : ''}`}
                  required
                />
                {yearError && (
                  <p className="text-sm text-red-600 mt-1">{yearError}</p>
                )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">Engagement Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Annual Audit-2024, Interim Review Q3 2024"
                      className={`h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg ${titleError ? 'border-red-500' : ''}`}
                  required
                />
                {titleError && (
                  <p className="text-sm text-red-600 mt-1">{titleError}</p>
                )}
              </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Next Steps</h3>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">After creating this engagement:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <span className="text-sm text-gray-700">Upload trial balance data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <span className="text-sm text-gray-700">Send document requests</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <span className="text-sm text-gray-700">Generate audit procedures</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <span className="text-sm text-gray-700">Export final reports</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || clients.length === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl px-8 py-3 h-auto text-lg font-semibold"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Create Engagement
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 transition-all duration-300 rounded-xl px-8 py-3 h-auto text-lg font-semibold"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

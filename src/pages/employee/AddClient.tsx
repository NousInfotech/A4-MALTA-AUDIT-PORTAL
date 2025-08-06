import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Energy',
  'Construction',
  'Education',
  'Transportation',
  'Real Estate',
  'Consulting',
  'Other'
];

export const AddClient = () => {
  const [formData, setFormData] = useState({
  name: '',
  email: '',
  password: '',
  role: 'client' as UserRole,
  companyName: '',
  companyNumber: '',
  industry: '',
  summary: '',
  customValue: '',          // ← new field
});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Handle submit")
    setError('');

    // Front-end validation
    const { name, email, password, companyName, companyNumber, summary } =
      formData;
    if (!name || !email || !password || !companyName || !companyNumber || !summary) {
      setError('Please fill in all the required fields');
      return;
    }

    const industry =
      formData.industry === 'Other' ? formData.customValue : formData.industry;
    
    //API Call

    // const success = await signup({
    //   name,
    //   email,
    //   password,
    //   role: 'client' as UserRole,
    //   companyName,
    //   companyNumber,
    //   industry,
    //   summary,
    // });
    // if (success) {
    // console.log("success")
    //   toast({
    //     title: 'Client created',
    //     description: 'The client account is pending admin approval.',
    //   });
    //   navigate('/employee/clients');
    // } else {
    // console.log("Error")
    //   setError('Email already exists or signup failed. Please try again.');
    // }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Client</h1>
          <p className="text-muted-foreground mt-2">
            Create a new client company profile
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Client Information</CardTitle>
                <CardDescription>
                  Enter the basic information for the new client company
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyNumber">Company Number *</Label>
                  <Input
                    id="companyNumber"
                    value={formData.companyNumber}
                    onChange={(e) => handleChange('companyNumber', e.target.value)}
                    placeholder="Enter company registration number"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Company Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@company.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select value={formData.industry} onValueChange={(value) => handleChange('industry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
{formData.industry==='Other'&&(
                <div className="space-y-2">
  <Label htmlFor="customValue">Please Specify The Industry</Label>
  <Input
    id="customValue"
    value={formData.customValue}
    onChange={e => handleChange('customValue', e.target.value)}
    placeholder="Enter your custom value"
  />
</div>
)}

              </div>
              
              <div className="space-y-2">
                <Label htmlFor="summary">Company Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  placeholder="Brief description of what the company does..."
                  rows={4}
                />
              </div>
              
              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Client
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
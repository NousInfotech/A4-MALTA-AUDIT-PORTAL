// src/pages/ClientSubmission.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useProgress } from '@/contexts/ProgressContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// shadcn/ui components
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, UploadCloud, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // PopTrigger is likely PopoverTrigger
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // For conditional classNames

// Zod schema for form validation
const formSchema = z.object({
  annualRevenue: z.string().min(1, { message: "Annual Revenue is required." }),
  revenuePendingLitigations: z.boolean().default(false).optional(),
  yearEndDate: z.date({
    required_error: "A year-end date is required.",
  }),
  datePendingLitigations: z.boolean().default(false).optional(),
});

interface FileWithProgress extends File {
  id: string;
  progress: number;
}

const ClientSubmission: React.FC = () => {
  const { setCurrentStep } = useProgress();
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      annualRevenue: "",
      revenuePendingLitigations: false,
      yearEndDate: undefined,
      datePendingLitigations: false,
    },
  });

  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Form submitted:", values);
    console.log("Uploaded files:", uploadedFiles);
    // Simulate API call
    setTimeout(() => {
      alert("Client Submission Saved!");
      navigate('/generation'); // Navigate to the next step
    }, 1000);
  };

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    addFiles(files);
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addFiles(files);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const filesToAdd: FileWithProgress[] = newFiles.map(file => ({
      ...file,
      id: `${file.name}-${Date.now()}`, // Unique ID for each file
      progress: 0,
    }));
    setUploadedFiles(prev => [...prev, ...filesToAdd]);

    // Simulate upload progress
    filesToAdd.forEach(file => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { ...f, progress: Math.min(progress, 100) } : f
          )
        );
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100);
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const fileCount = uploadedFiles.length;
  const minRequiredFiles = 3;
  const filesMissing = minRequiredFiles - fileCount;
  const filesRequirementMet = fileCount >= minRequiredFiles;

  return (
    <div className="flex">
      {/* Document Categories Sidebar */}
      <Card className="w-1/4 p-4 mr-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg">Document Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <nav className="space-y-1">
            {["Financial Statements", "Tax Documents", "Legal Agreements", "Operational Data"].map((category, index) => (
              <Button
                key={category}
                variant="ghost"
                className={cn(
                  "w-full justify-start px-3 py-2 text-sm",
                  category === "Operational Data" ? "bg-gray-100 text-blue-600" : "" // Active category styling
                )}
              >
                {category}
              </Button>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl">Step 1: Submission</CardTitle>
            <p className="text-gray-500">Upload Required Documents & Data</p>
          </CardHeader>
          <CardContent className="p-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* File Upload Area */}
                <div
                  onDrop={handleFileDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={cn(
                    "border-2 border-dashed rounded-md p-6 text-center transition-colors",
                    isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
                  )}
                >
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drag & Drop files here or{" "}
                    <Label htmlFor="file-upload" className="text-blue-600 cursor-pointer hover:underline">
                      Browse
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      multiple
                      onChange={handleFileInputChange}
                    />
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploaded Files: {fileCount}/{minRequiredFiles} (Minimum required)
                  </p>
                  {!filesRequirementMet && fileCount > 0 && (
                    <p className="text-red-500 text-xs mt-1">
                      Please upload {filesMissing} more file(s) to meet the minimum requirement.
                    </p>
                  )}
                  {fileCount === 0 && (
                     <p className="text-gray-400 text-xs mt-1">
                      No files uploaded yet.
                    </p>
                  )}
                </div>

                {/* Display Uploaded Files */}
                <div className="space-y-2">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="text-sm truncate mr-2">{file.name}</span>
                      <div className="flex items-center space-x-2">
                        {file.progress < 100 ? (
                          <span className="text-xs text-gray-500">{file.progress}%</span>
                        ) : (
                          <span className="text-xs text-green-600">Uploaded</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pre-Determined Auditor Questions */}
                <h3 className="text-lg font-semibold mt-6">Pre-Determined Auditor Questions</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="annualRevenue"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="flex-1">
                          <FormLabel>Annual Revenue (USD)</FormLabel>
                          <FormDescription>
                            Enter your company's annual revenue in USD.
                          </FormDescription>
                        </div>
                        <FormControl className="flex-grow max-w-[200px]">
                          <Input placeholder="e.g., 1,000,000" {...field} />
                        </FormControl>
                        <div className="flex items-center space-x-2 ml-4">
                          <FormLabel className="!mt-0">Are there any pending litigations?</FormLabel>
                          <FormField
                            control={form.control}
                            name="revenuePendingLitigations"
                            render={({ field: switchField }) => (
                              <FormControl>
                                <Switch
                                  checked={switchField.value}
                                  onCheckedChange={switchField.onChange}
                                />
                              </FormControl>
                            )}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="yearEndDate"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="flex-1">
                          <FormLabel>Year-End Date</FormLabel>
                          <FormDescription>
                            Select your fiscal year-end date.
                          </FormDescription>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl className="flex-grow max-w-[200px]">
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[200px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="flex items-center space-x-2 ml-4">
                          <FormLabel className="!mt-0">Are there any pending litigations?</FormLabel>
                          <FormField
                            control={form.control}
                            name="datePendingLitigations"
                            render={({ field: switchField }) => (
                              <FormControl>
                                <Switch
                                  checked={switchField.value}
                                  onCheckedChange={switchField.onChange}
                                />
                              </FormControl>
                            )}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
                  <Button variant="outline" type="button" onClick={() => console.log("Save Draft")}>
                    Save Draft
                  </Button>
                  <Button type="submit">
                    Submit for Review
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientSubmission;
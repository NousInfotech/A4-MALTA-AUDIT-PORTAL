"use client";

import { useState } from "react";
import { FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import FinancialStatusReport from "./FinancialStatusReport";
import fsMix from "@/data/fs/fs.json";
import { Button } from "../ui/button";

export default function FSUploadFlow() {
  const [step, setStep] = useState<"upload" | "confirm" | "loading" | "report">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    
    // Validate file type
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);
    setStep("confirm");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0] || null;
    handleFileUpload(file);
  };

  const generateReport = async () => {
    setStep("loading");

    setTimeout(() => {
      setReportData(fsMix);
      setStep("report");
    }, 10000);
  };

  const backToUpload = () => {
    setUploadedFile(null);
    setReportData(null);
    setStep("upload");
  };

  return (
    <div className="min-h-screen px-4">
      <div className="mx-auto">
        
        {/* Header */}
        {/* <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Financial Statement Analyzer
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your audited financial statements for comprehensive analysis and insights
          </p>
        </div> */}

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step !== "upload" ? "text-primary" : "text-gray-900"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 ${
                step !== "upload" ? "bg-primary border-primary text-white" : "bg-white border-gray-300"
              }`}>
                {step !== "upload" ? <CheckCircle className="w-5 h-5" /> : "1"}
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Upload</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className={`flex items-center ${
              step === "loading" || step === "report" ? "text-primary" : 
              step === "confirm" ? "text-gray-900" : "text-gray-400"
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 ${
                step === "loading" || step === "report" ? "bg-primary border-primary text-white" :
                step === "confirm" ? "bg-white border-gray-300" : "bg-gray-100 border-gray-300"
              }`}>
                {step === "loading" || step === "report" ? <CheckCircle className="w-5 h-5" /> : "2"}
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Confirm</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className={`flex items-center ${step === "report" ? "text-primary" : "text-gray-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 ${
                step === "report" ? "bg-primary border-primary text-white" : "bg-gray-100 border-gray-300"
              }`}>
                {step === "report" ? <CheckCircle className="w-5 h-5" /> : "3"}
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Report</span>
            </div>
          </div>
        </div>

        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-8 sm:p-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Upload Financial Statements
              </h2>
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  dragActive 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleInputChange}
                />
                
                <div className="pointer-events-none">
                  <div className="mx-auto w-16 h-16 mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Drop your PDF here or click to browse
                  </p>
                  
                  <p className="text-sm text-gray-500">
                    Supports PDF files up to 10MB
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>File must be in PDF format</li>
                      <li>Must contain audited financial statements</li>
                      <li>Maximum file size: 10MB</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIRM */}
        {step === "confirm" && uploadedFile && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="mx-auto w-16 h-16 mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                File Ready for Analysis
              </h2>
              
              <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-gray-600" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 truncate max-w-xs">
                        {uploadedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={generateReport}
                className="w-full px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl mb-4"
              >
                Generate Analysis Report
              </button>

              <button
                onClick={backToUpload}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                ← Choose Different File
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOADING */}
        {step === "loading" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="relative mb-8">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Analyzing Financial Statements
              </h2>
              
              <p className="text-gray-600 mb-2">
                Our AI is processing your documents and extracting key insights...
              </p>
              
              <p className="text-sm text-gray-500">
                This typically takes 5-10 seconds
              </p>
              
              <div className="mt-8 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: "60%" }}></div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: REPORT */}
        {step === "report" && reportData && (
          <div className="space-y-6">
            <FinancialStatusReport data={reportData} onUploadAgain={backToUpload} />
          </div>
        )}
      </div>
    </div>
  );
}
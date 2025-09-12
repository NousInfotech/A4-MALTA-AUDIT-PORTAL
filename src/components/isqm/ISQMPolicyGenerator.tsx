import React, { useState, useMemo, useEffect } from "react";
import { FileText, Download, Sparkles, Loader2, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { isqmApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabaseStorage, StorageFile } from '@/services/supabaseStorage';

// Type definitions for the questionnaire data structure
interface QuestionAnswer {
  question: string;
  answer: string;
  state: boolean;
  questionId?: string;
  isMandatory?: boolean;
  questionType?: string;
}

interface ISQMDocumentUrl {
  _id?: string;
  name: string;
  url: string;
  version?: string;
  uploadedBy: string;
  description?: string;
  updatedAt?: string;
}

interface Section {
  heading: string;
  qna: QuestionAnswer[];
  sectionId?: string;
  order?: number;
}

interface Questionnaire {
  _id: string;
  key: string;
  heading: string;
  description?: string;
  sections: Section[];
  policyUrls?: ISQMDocumentUrl[];
  procedureUrls?: ISQMDocumentUrl[];
  stats: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
  };
}

interface Metadata {
  title: string;
  version: string;
  jurisdiction_note: string;
  sources: string[];
  generated: string;
}

interface QuestionnaireData {
  metadata: Metadata;
  ISQM_1: Questionnaire;
  ISQM_2: Questionnaire;
  ISA_220_Revised: Questionnaire;
}

interface GenerationOptions {
  useAnswersInPolicy: boolean;
  includeUnanswered: boolean;
  includeStatesInProcedures: boolean;
  includeAppendixQA: boolean;
  generatePDF: boolean;
}

interface GeneratedDocument {
  id: string;
  name: string;
  type: 'policy' | 'procedure';
  questionnaireId: string;
  sectionIndex: number;
  url: string;
  content: string;
  generatedAt: string;
  storageFile?: StorageFile;
  isUploaded?: boolean;
}

interface ISQMPolicyGeneratorProps {
  questionnaireData?: QuestionnaireData;
  parentId?: string;
  questionnaires?: Questionnaire[];
}

export default function ISQMPolicyGenerator({ 
  questionnaireData, 
  parentId, 
  questionnaires = [] 
}: ISQMPolicyGeneratorProps): JSX.Element {
  const { user } = useAuth();
  const [activeDoc, setActiveDoc] = useState<GeneratedDocument | null>(null);
  const [options, setOptions] = useState<GenerationOptions>({
    useAnswersInPolicy: true,
    includeUnanswered: true,
    includeStatesInProcedures: true,
    includeAppendixQA: false,
    generatePDF: true,
  });
  const [uploadingToStorage, setUploadingToStorage] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);

  // Check if user has permission to generate documents
  const canGenerateDocuments = user?.role === 'employee' || user?.role === 'admin';
  const userRole = user?.role || 'unknown';

  // Debug logging
  console.log('Policy Generator Data:', questionnaireData);
  console.log('Questionnaires:', questionnaires);
  console.log('User role:', userRole, 'Can generate:', canGenerateDocuments);

  // Load existing URLs when component mounts
  useEffect(() => {
    const loadExistingUrls = async () => {
      if (questionnaires && questionnaires.length > 0) {
        try {
          console.log('🔄 Loading existing URLs for questionnaires');
          
          // Fetch URLs for each questionnaire
          const updatedQuestionnaires = await Promise.all(
            questionnaires.map(async (questionnaire) => {
              try {
                const urlsResult = await isqmApi.getQuestionnaireUrls(questionnaire._id);
                return {
                  ...questionnaire,
                  policyUrls: urlsResult.policyUrls || questionnaire.policyUrls || [],
                  procedureUrls: urlsResult.procedureUrls || questionnaire.procedureUrls || []
                };
              } catch (error) {
                console.error(`Failed to fetch URLs for questionnaire ${questionnaire._id}:`, error);
                return questionnaire;
              }
            })
          );
          
          console.log('✅ Existing URLs loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load existing URLs:', error);
        }
      }
    };

    loadExistingUrls();
  }, [questionnaires?.length]);

  const sanitize = (s: string | undefined): string => (s || "").toString().replace(/\s+/g, " ").trim();
  
  // Process questionnaires data
  const processedQuestionnaires = useMemo(() => {
    if (!questionnaires || questionnaires.length === 0) {
      return [];
    }

    return questionnaires.map(q => ({
      ...q,
      sections: q.sections.map(section => ({
        ...section,
        qna: section.qna.map(qna => ({
          ...qna,
          answer: sanitize(qna.answer),
          question: sanitize(qna.question)
        }))
      }))
    }));
  }, [questionnaires]);

  // Generate policy content for a specific section
  const generatePolicyContent = (questionnaire: Questionnaire, sectionIndex: number): string => {
    const section = questionnaire.sections[sectionIndex];
    if (!section) return '';

    const qna = section.qna.filter(q => options.includeUnanswered || q.answer.length > 0);
    const now = new Date().toISOString().split("T")[0];
    const title = `${questionnaire.heading} — ${section.heading}`;

    // Generate policy statements based on actual Q&A data
    const policyStatements = qna.map((q, i) => {
      const question = q.question;
      const answer = q.answer || "Requirement to be defined based on questionnaire response.";
      const status = typeof q.state === "boolean" ? (q.state ? "Implemented" : "Not Implemented") : "Under Review";
      
      return `### ${i + 1}. ${question}

**Policy Requirement:** ${answer}
**Implementation Status:** ${status}
**Compliance Level:** ${q.state === true ? "Fully Compliant" : q.state === false ? "Non-Compliant" : "Under Review"}

`;
    }).join("");

    const appendix = options.includeAppendixQA
      ? `\n\n## Appendix — Q&A\n` + qna.map((q, i) => `**Q${i + 1}. ${q.question}**\n\nA: ${q.answer || "(no answer)"}\n`).join("\n")
      : "";

    return `# ${title}

**Document type:** Policy  
**Version:** 1.0  
**Effective date:** ${now}  
**Owner:** Quality Leader / Compliance Principal  
**Related Standards:** ${questionnaire.heading}  
**Category:** ${section.heading}

## Purpose
To establish comprehensive policy requirements for "${section.heading}" based on ${questionnaire.heading} questionnaire responses and current implementation status.

## Scope
- Applies to all engagements and firm-level activities related to ${section.heading}
- Covers all personnel involved in quality management processes
- Aligns with international standards and regulatory requirements
- Based on ${qna.length} questionnaire items in this category

## Implementation Status Summary
- **Total Requirements:** ${qna.length}
- **Implemented:** ${qna.filter(q => q.state === true).length}
- **Not Implemented:** ${qna.filter(q => q.state === false).length}
- **Under Review:** ${qna.filter(q => typeof q.state !== "boolean").length}
- **Completion Rate:** ${Math.round((qna.filter(q => q.state === true).length / qna.length) * 100)}%

## Policy Requirements
${policyStatements}

## Implementation Guidelines
- **Leadership:** Ensure adequate resources, training, and support for policy implementation
- **Quality Team:** Monitor compliance, provide guidance, and maintain documentation
- **All Personnel:** Comply with established procedures and report any issues
- **Regular Review:** Quarterly assessment of policy effectiveness and compliance

## Roles & Responsibilities
- **Leadership:** Set tone, allocate resources, approve this policy
- **Quality Leader:** Maintain SOQM documentation, monitor operation
- **Engagement Partners:** Implement requirements within engagements
- **Compliance Team:** Ensure adherence to policy requirements

## Monitoring & Review
- Include this policy in ongoing/periodic monitoring
- Perform root-cause analysis for deficiencies and update accordingly
- Regular review of implementation status and effectiveness
- Quarterly assessment of policy compliance

## Records
- Maintain documentation linking risks, responses, monitoring, consultations, and EQR conclusions as applicable
- Document all policy implementation activities and outcomes
- Track progress against established requirements${appendix}`;
  };

  // Generate procedure content for a specific section
  const generateProcedureContent = (questionnaire: Questionnaire, sectionIndex: number): string => {
    const section = questionnaire.sections[sectionIndex];
    if (!section) return '';

    const qna = section.qna.filter(q => options.includeUnanswered || q.answer.length > 0);
    const now = new Date().toISOString().split("T")[0];
    const title = `${questionnaire.heading} — ${section.heading}`;

    // Generate procedure steps based on actual Q&A data
    const procedureSteps = qna.map((q, i) => {
      const question = q.question;
      const answer = q.answer || "Procedure step to be defined based on questionnaire response.";
      const status = typeof q.state === "boolean" ? (q.state ? "Implemented" : "Not Implemented") : "Under Review";
      
      return `### Step ${i + 1}: ${question}

**Procedure:** ${answer}
**Implementation Status:** ${status}
**Compliance Level:** ${q.state === true ? "Fully Compliant" : q.state === false ? "Non-Compliant" : "Under Review"}

**Action Required:** ${q.state === true ? "Maintain current implementation" : q.state === false ? "Implement required procedures" : "Review and define implementation approach"}

`;
    }).join("");

    const appendix = options.includeAppendixQA
      ? `\n\n## Appendix — Q&A\n` + qna.map((q, i) => `**Q${i + 1}. ${q.question}**\n\nA: ${q.answer || "(no answer)"}\n`).join("\n")
      : "";

    return `# ${title}

**Document type:** Procedures  
**Version:** 1.0  
**Effective date:** ${now}  
**Owner:** Quality Leader / Compliance Principal  
**Related Standards:** ${questionnaire.heading}  
**Category:** ${section.heading}

## Overview
This procedure translates ${questionnaire.heading} requirements into actionable steps for "${section.heading}" based on questionnaire responses and current implementation status.

## Implementation Status Summary
- **Total Procedure Steps:** ${qna.length}
- **Implemented:** ${qna.filter(q => q.state === true).length}
- **Not Implemented:** ${qna.filter(q => q.state === false).length}
- **Under Review:** ${qna.filter(q => typeof q.state !== "boolean").length}
- **Completion Rate:** ${Math.round((qna.filter(q => q.state === true).length / qna.length) * 100)}%

## Procedure Steps
${procedureSteps}

## Implementation Guidelines
- **Leadership:** Ensure adequate resources, training, and support for procedure implementation
- **Quality Team:** Monitor compliance, provide guidance, and maintain documentation
- **All Personnel:** Follow established procedures and report any issues
- **Regular Review:** Quarterly assessment of procedure effectiveness and compliance

## Evidence & Records
- Retain approvals, training logs, independence confirmations, consultations, and EQR documentation as applicable
- Document all procedure implementation activities and outcomes
- Track progress against established requirements
- Maintain audit trail of compliance activities

## Review Frequency
- Review at least annually or upon regulatory/firm changes
- Quarterly assessment of procedure effectiveness
- Regular monitoring of implementation status
- Update procedures based on lessons learned and best practices${appendix}`;
  };

  // Generate and store document
  const generateDocument = async (questionnaire: Questionnaire, sectionIndex: number, type: 'policy' | 'procedure') => {
    const section = questionnaire.sections[sectionIndex];
    if (!section) {
      alert('Section not found. Please try again.');
      return;
    }
    
    const generatingId = `${questionnaire._id}-${sectionIndex}-${type}`;
    setGenerating(generatingId);

    try {
      console.log(`🔄 Generating ${type} for:`, { questionnaireId: questionnaire._id, sectionIndex, type });

      // Generate content
      const content = type === 'policy' 
        ? generatePolicyContent(questionnaire, sectionIndex)
        : generateProcedureContent(questionnaire, sectionIndex);

      // Create document name
      const safeName = `${sanitize(section.heading).replace(/[^a-z0-9\-\s]/gi, "").slice(0, 80)} — ${type}`;
      
      // Upload document to Supabase storage
      const storageFile = await uploadDocumentToStorage(content, safeName, questionnaire._id, type);
      
      // Create document with actual Q&A content and storage info
      const newDoc: GeneratedDocument = {
        id: `${questionnaire._id}-${sectionIndex}-${type}-${Date.now()}`,
        name: safeName,
        type,
        questionnaireId: questionnaire._id,
        sectionIndex,
        url: storageFile?.url || `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
        content: content, // Use the actual generated content from Q&A data
        generatedAt: new Date().toISOString(),
        storageFile: storageFile || undefined,
        isUploaded: !!storageFile
      };
      
      console.log('✅ Document generated successfully with Q&A content:', newDoc);

      setGeneratedDocuments(prev => [...prev.filter(d => d.id !== newDoc.id), newDoc]);

      // Show preview and download popup
      setActiveDoc(newDoc);
      
      console.log(`✅ ${type} document generated successfully for ${section.heading}`);

    } catch (error) {
      console.error(`❌ Failed to generate ${type}:`, error);
      alert(`Failed to generate ${type}. Please try again.`);
    } finally {
      setGenerating(null);
    }
  };

  // Generate comprehensive policy content for entire questionnaire
  const generateComprehensivePolicyContent = (questionnaire: Questionnaire): string => {
    const now = new Date().toISOString().split("T")[0];
    const title = `${questionnaire.heading} — Comprehensive Policy`;

    // Collect all Q&A from all sections
    const allQna = questionnaire.sections.flatMap(section => 
      section.qna.filter(q => options.includeUnanswered || q.answer.length > 0)
        .map(q => ({ ...q, sectionName: section.heading }))
    );

    // Calculate overall statistics
    const totalRequirements = allQna.length;
    const implemented = allQna.filter(q => q.state === true).length;
    const notImplemented = allQna.filter(q => q.state === false).length;
    const underReview = allQna.filter(q => typeof q.state !== "boolean").length;
    const completionRate = Math.round((implemented / totalRequirements) * 100);

    // Generate policy requirements by section
    const policyRequirementsBySection = questionnaire.sections.map((section, sectionIndex) => {
      const sectionQna = section.qna.filter(q => options.includeUnanswered || q.answer.length > 0);
      if (sectionQna.length === 0) return '';

      const sectionRequirements = sectionQna.map((q, i) => {
        const question = q.question;
        const answer = q.answer || "Requirement to be defined based on questionnaire response.";
        const status = typeof q.state === "boolean" ? (q.state ? "Implemented" : "Not Implemented") : "Under Review";
        
        return `### ${i + 1}. ${question}
**Requirement:** ${answer}
**Status:** ${status}
`;
      }).join("");

      return `## ${section.heading}
${sectionRequirements}`;
    }).join("\n\n");

    // Disable appendix by default to reduce file size
    const appendix = "";

    return `# ${title}

**Document type:** Comprehensive Policy  
**Version:** 1.0  
**Effective date:** ${now}  
**Owner:** Quality Leader / Compliance Principal  
**Related Standards:** ${questionnaire.heading}  
**Scope:** All sections and requirements

## Purpose
To establish comprehensive policy requirements for "${questionnaire.heading}" based on questionnaire responses and current implementation status across all sections.

## Scope
- Applies to all engagements and firm-level activities related to ${questionnaire.heading}
- Covers all personnel involved in quality management processes
- Aligns with international standards and regulatory requirements
- Based on ${totalRequirements} questionnaire items across ${questionnaire.sections.length} sections

## Overall Implementation Status Summary
- **Total Requirements:** ${totalRequirements}
- **Implemented:** ${implemented}
- **Not Implemented:** ${notImplemented}
- **Under Review:** ${underReview}
- **Completion Rate:** ${completionRate}%

## Policy Requirements by Section
${policyRequirementsBySection}

## Implementation Guidelines
- **Leadership:** Ensure adequate resources, training, and support for policy implementation
- **Quality Team:** Monitor compliance, provide guidance, and maintain documentation
- **All Personnel:** Comply with established procedures and report any issues
- **Regular Review:** Quarterly assessment of policy effectiveness and compliance

## Roles & Responsibilities
- **Leadership:** Set tone, allocate resources, approve this policy
- **Quality Leader:** Maintain SOQM documentation, monitor operation
- **Engagement Partners:** Implement requirements within engagements
- **Compliance Team:** Ensure adherence to policy requirements

## Monitoring & Review
- Include this policy in ongoing/periodic monitoring
- Perform root-cause analysis for deficiencies and update accordingly
- Regular review of implementation status and effectiveness
- Quarterly assessment of policy compliance

## Records
- Maintain documentation linking risks, responses, monitoring, consultations, and EQR conclusions as applicable
- Document all policy implementation activities and outcomes
- Track progress against established requirements${appendix}`;
  };

  // Generate comprehensive procedure content for entire questionnaire
  const generateComprehensiveProcedureContent = (questionnaire: Questionnaire): string => {
    const now = new Date().toISOString().split("T")[0];
    const title = `${questionnaire.heading} — Comprehensive Procedures`;

    // Collect all Q&A from all sections
    const allQna = questionnaire.sections.flatMap(section => 
      section.qna.filter(q => options.includeUnanswered || q.answer.length > 0)
        .map(q => ({ ...q, sectionName: section.heading }))
    );

    // Calculate overall statistics
    const totalSteps = allQna.length;
    const implemented = allQna.filter(q => q.state === true).length;
    const notImplemented = allQna.filter(q => q.state === false).length;
    const underReview = allQna.filter(q => typeof q.state !== "boolean").length;
    const completionRate = Math.round((implemented / totalSteps) * 100);

    // Generate procedure steps by section
    const procedureStepsBySection = questionnaire.sections.map((section, sectionIndex) => {
      const sectionQna = section.qna.filter(q => options.includeUnanswered || q.answer.length > 0);
      if (sectionQna.length === 0) return '';

      const sectionSteps = sectionQna.map((q, i) => {
        const question = q.question;
        const answer = q.answer || "Procedure step to be defined based on questionnaire response.";
        const status = typeof q.state === "boolean" ? (q.state ? "Implemented" : "Not Implemented") : "Under Review";
        
        return `### Step ${i + 1}: ${question}
**Procedure:** ${answer}
**Status:** ${status}
**Action:** ${q.state === true ? "Maintain" : q.state === false ? "Implement" : "Review"}
`;
      }).join("");

      return `## ${section.heading}

${sectionSteps}`;
    }).join("\n\n");

    // Disable appendix by default to reduce file size
    const appendix = "";

    return `# ${title}

**Document type:** Comprehensive Procedures  
**Version:** 1.0  
**Effective date:** ${now}  
**Owner:** Quality Leader / Compliance Principal  
**Related Standards:** ${questionnaire.heading}  
**Scope:** All sections and procedures

## Overview
This procedure translates ${questionnaire.heading} requirements into actionable steps across all sections based on questionnaire responses and current implementation status.

## Overall Implementation Status Summary
- **Total Procedure Steps:** ${totalSteps}
- **Implemented:** ${implemented}
- **Not Implemented:** ${notImplemented}
- **Under Review:** ${underReview}
- **Completion Rate:** ${completionRate}%

## Procedure Steps by Section
${procedureStepsBySection}

## Implementation Guidelines
- **Leadership:** Ensure adequate resources, training, and support for procedure implementation
- **Quality Team:** Monitor compliance, provide guidance, and maintain documentation
- **All Personnel:** Follow established procedures and report any issues
- **Regular Review:** Quarterly assessment of procedure effectiveness and compliance

## Evidence & Records
- Retain approvals, training logs, independence confirmations, consultations, and EQR documentation as applicable
- Document all procedure implementation activities and outcomes
- Track progress against established requirements
- Maintain audit trail of compliance activities

## Review Frequency
- Review at least annually or upon regulatory/firm changes
- Quarterly assessment of procedure effectiveness
- Regular monitoring of implementation status
- Update procedures based on lessons learned and best practices${appendix}`;
  };

  // Generate comprehensive documents for a questionnaire (one policy + one procedure per category)
  const generateAllDocuments = async (questionnaire: Questionnaire) => {
    setGenerating(`all-${questionnaire._id}`);

    try {
      console.log('🔄 Generating comprehensive documents for questionnaire:', questionnaire._id);

      const generatedDocs: GeneratedDocument[] = [];

      // Generate comprehensive policy document for entire questionnaire
      const comprehensivePolicyContent = generateComprehensivePolicyContent(questionnaire);
      const policyStorageFile = await uploadDocumentToStorage(
        comprehensivePolicyContent, 
        `${questionnaire.heading} — Comprehensive Policy`, 
        questionnaire._id, 
        'policy'
      );
      
      const policyDoc: GeneratedDocument = {
        id: `policy-${questionnaire._id}-comprehensive-${Date.now()}`,
        name: `${questionnaire.heading} — Comprehensive Policy`,
        type: 'policy',
        questionnaireId: questionnaire._id,
        sectionIndex: -1, // -1 indicates comprehensive document
        url: policyStorageFile?.url || `data:text/plain;charset=utf-8,${encodeURIComponent(comprehensivePolicyContent)}`,
        content: comprehensivePolicyContent,
        generatedAt: new Date().toISOString(),
        storageFile: policyStorageFile || undefined,
        isUploaded: !!policyStorageFile
      };
      generatedDocs.push(policyDoc);

      // Generate comprehensive procedure document for entire questionnaire
      const comprehensiveProcedureContent = generateComprehensiveProcedureContent(questionnaire);
      const procedureStorageFile = await uploadDocumentToStorage(
        comprehensiveProcedureContent, 
        `${questionnaire.heading} — Comprehensive Procedures`, 
        questionnaire._id, 
        'procedure'
      );
      
      const procedureDoc: GeneratedDocument = {
        id: `procedure-${questionnaire._id}-comprehensive-${Date.now()}`,
        name: `${questionnaire.heading} — Comprehensive Procedures`,
        type: 'procedure',
        questionnaireId: questionnaire._id,
        sectionIndex: -1, // -1 indicates comprehensive document
        url: procedureStorageFile?.url || `data:text/plain;charset=utf-8,${encodeURIComponent(comprehensiveProcedureContent)}`,
        content: comprehensiveProcedureContent,
        generatedAt: new Date().toISOString(),
        storageFile: procedureStorageFile || undefined,
        isUploaded: !!procedureStorageFile
      };
      generatedDocs.push(procedureDoc);

      // Add all generated documents to state
      setGeneratedDocuments(prev => [...prev.filter(d => !generatedDocs.some(newDoc => newDoc.id === d.id)), ...generatedDocs]);

      console.log(`✅ Generated 2 comprehensive documents for questionnaire:`, questionnaire._id);
      console.log('📄 Generated documents:', generatedDocs.map(d => d.name));

    } catch (error) {
      console.error('❌ Failed to generate all documents:', error);
      alert('Failed to generate all documents. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  // Generate PDF blob from content
  const generatePDFBlob = async (content: string, filename: string): Promise<Blob> => {
    try {
      // Create a temporary div to render the HTML content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.padding = '20mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12pt';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.color = '#333';
      tempDiv.style.backgroundColor = 'white';
      
      // Convert markdown-like content to HTML
      const htmlContent = convertToHTML(content);
      
      // Create the document structure
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 8px;">
          <h1 style="color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 30px; font-size: 24pt;">${filename.replace('.pdf', '')}</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Document Type:</strong> ISQM Policy/Procedure Document</p>
        </div>
        
        <div style="margin-bottom: 40px;">
          ${htmlContent}
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10pt; color: #6b7280; text-align: center;">
          <p>This document was generated by AuditPortal ISQM Policy Generator</p>
          <p>© ${new Date().getFullYear()} AuditPortal. All rights reserved.</p>
        </div>
      `;
      
      // Add to DOM temporarily
      document.body.appendChild(tempDiv);
      
      // Convert to canvas with optimized settings for smaller file size
      const canvas = await html2canvas(tempDiv, {
        scale: 1, // Reduced from 2 to 1 for smaller file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800, // Limit width to reduce canvas size
        height: tempDiv.scrollHeight // Use actual content height
      });
      
      // Remove temporary div
      document.body.removeChild(tempDiv);
      
      // Create PDF with JPEG compression for smaller file size
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG with 80% quality
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      
      // Check file size and compress if needed (Supabase free plan limit is 50MB)
      const maxSize = 45 * 1024 * 1024; // 45MB to be safe
      if (pdfBlob.size > maxSize) {
        console.log(`⚠️ PDF size (${Math.round(pdfBlob.size / 1024 / 1024)}MB) exceeds limit, regenerating with higher compression...`);
        
        // Regenerate with higher compression
        const compressedImgData = canvas.toDataURL('image/jpeg', 0.6); // Lower quality
        const compressedPdf = new jsPDF('p', 'mm', 'a4');
        
        const compressedImgHeight = (canvas.height * imgWidth) / canvas.width;
        let compressedHeightLeft = compressedImgHeight;
        let compressedPosition = 0;
        
        compressedPdf.addImage(compressedImgData, 'JPEG', 0, compressedPosition, imgWidth, compressedImgHeight);
        compressedHeightLeft -= pageHeight;
        
        while (compressedHeightLeft >= 0) {
          compressedPosition = compressedHeightLeft - compressedImgHeight;
          compressedPdf.addPage();
          compressedPdf.addImage(compressedImgData, 'JPEG', 0, compressedPosition, imgWidth, compressedImgHeight);
          compressedHeightLeft -= pageHeight;
        }
        
        const compressedBlob = compressedPdf.output('blob');
        console.log(`✅ Compressed PDF size: ${Math.round(compressedBlob.size / 1024 / 1024)}MB`);
        return compressedBlob;
      }
      
      console.log(`✅ PDF blob generated successfully: ${filename} (${Math.round(pdfBlob.size / 1024 / 1024)}MB)`);
      return pdfBlob;
      
    } catch (error) {
      console.error('❌ Failed to generate PDF blob:', error);
      throw error;
    }
  };

  // Save document URL to backend
  const saveDocumentUrl = async (questionnaireId: string, storageFile: StorageFile, type: 'policy' | 'procedure') => {
    try {
      console.log('💾 Saving document URL to backend:', { questionnaireId, storageFile, type });
      
      const urlData = {
        name: storageFile.name,
        url: storageFile.url,
        version: '1.0',
        description: `Generated ${type} document stored in Supabase`,
        uploadedBy: user?.id || 'system'
      };

      if (type === 'policy') {
        await isqmApi.addPolicyUrl(questionnaireId, urlData);
      } else {
        await isqmApi.addProcedureUrl(questionnaireId, urlData);
      }

      console.log('✅ Document URL saved to backend successfully');
    } catch (error) {
      console.error('❌ Failed to save document URL to backend:', error);
      // Don't throw error - this is not critical for the main functionality
    }
  };

  // Upload document to Supabase storage
  const uploadDocumentToStorage = async (content: string, filename: string, questionnaireId: string, type: 'policy' | 'procedure'): Promise<StorageFile | null> => {
    const uploadKey = `${questionnaireId}-${type}-${filename}`;
    
    try {
      console.log('📤 Uploading document to Supabase storage:', { filename, type });
      setUploadingToStorage(prev => new Set(prev).add(uploadKey));
      
      // Generate PDF blob
      const pdfBlob = await generatePDFBlob(content, filename);
      
      // Create folder structure: isqm-documents/questionnaireId/type/
      const folder = `questionnaires/${questionnaireId}/${type}`;
      const fileName = `${filename}.pdf`;
      
      // Upload to Supabase storage
      const uploadResult = await supabaseStorage.uploadFile(pdfBlob, fileName, folder);
      
      if (uploadResult.success && uploadResult.file) {
        console.log('✅ Document uploaded to Supabase:', uploadResult.file);
        
        // Save URL to backend
        await saveDocumentUrl(questionnaireId, uploadResult.file, type);
        
        return uploadResult.file;
      } else {
        console.error('❌ Upload failed:', uploadResult.error);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Upload to storage failed:', error);
      return null;
    } finally {
      setUploadingToStorage(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadKey);
        return newSet;
      });
    }
  };

  // Download document as PDF using jsPDF
  const downloadDocument = async (content: string, filename: string) => {
    try {
      // Generate PDF blob
      const pdfBlob = await generatePDFBlob(content, filename);
      
      // Download the blob as file
      await supabaseStorage.downloadBlobAsFile(pdfBlob, `${filename}.pdf`);
      
      console.log('✅ PDF download completed:', filename);
    } catch (error) {
      console.error('❌ Failed to download PDF:', error);
      // Fallback to HTML download
      try {
        const htmlContent = convertToHTML(content);
        const htmlDocument = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filename.replace('.pdf', '')}</title>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 40px;
                color: #333;
                background: white;
                font-size: 12pt;
              }
              h1 {
                color: #2563eb;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 10px;
                margin-bottom: 30px;
                font-size: 24pt;
              }
              h2 {
                color: #1e40af;
                margin-top: 30px;
                margin-bottom: 15px;
                font-size: 18pt;
              }
              h3 {
                color: #3730a3;
                margin-top: 25px;
                margin-bottom: 10px;
                font-size: 14pt;
              }
              h4 {
                color: #4c1d95;
                margin-top: 20px;
                margin-bottom: 8px;
                font-size: 12pt;
              }
              p {
                margin-bottom: 12px;
                text-align: justify;
              }
              ul, ol {
                margin-bottom: 15px;
                padding-left: 25px;
              }
              li {
                margin-bottom: 5px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 10pt;
                color: #6b7280;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${filename.replace('.pdf', '')}</h1>
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Document Type:</strong> ISQM Policy/Procedure Document</p>
            </div>
            
            <div class="content">
              ${htmlContent}
            </div>
            
            <div class="footer">
              <p>This document was generated by AuditPortal ISQM Policy Generator</p>
              <p>© ${new Date().getFullYear()} AuditPortal. All rights reserved.</p>
            </div>
          </body>
          </html>
        `;
        
        const blob = new Blob([htmlDocument], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      } catch (fallbackError) {
        console.error('❌ Fallback download failed:', fallbackError);
        // Final fallback to text download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace('.pdf', '.txt');
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
      }
    }
  };

  // Convert markdown-like content to HTML
  const convertToHTML = (content: string): string => {
    return content
      // Convert headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Wrap in paragraphs
      .replace(/^(?!<[h1-4]|<p|<ul|<ol|<li)(.*)$/gm, '<p>$1</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p><br><\/p>/g, '');
  };

  // Refresh documents
  const refreshDocuments = async () => {
    try {
      if (parentId) {
        console.log('🔄 Refreshing documents for parent:', parentId);
        
        // Fetch URLs for each questionnaire
        const updatedQuestionnaires = await Promise.all(
          processedQuestionnaires.map(async (questionnaire) => {
            try {
              const urlsResult = await isqmApi.getQuestionnaireUrls(questionnaire._id);
              return {
                ...questionnaire,
                policyUrls: urlsResult.policyUrls || [],
                procedureUrls: urlsResult.procedureUrls || []
              };
            } catch (error) {
              console.error(`Failed to fetch URLs for questionnaire ${questionnaire._id}:`, error);
              return questionnaire;
            }
          })
        );
        
        // Update the questionnaires with fresh URL data
        setGeneratedDocuments([]);
        console.log('✅ Documents refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to refresh documents:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ISQM Policy Generator
            </h1>
            <p className="text-gray-600 text-lg">
              Generate comprehensive policies and procedures from questionnaire responses
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              className="px-4 py-2 rounded-xl bg-gray-500 hover:bg-gray-600 text-white transition-colors duration-300" 
              onClick={refreshDocuments}
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Refresh
            </button>
          </div>
        </header>

        {/* Permission Status */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${canGenerateDocuments ? 'bg-green-100' : 'bg-red-100'}`}>
              <AlertCircle className={`w-5 h-5 ${canGenerateDocuments ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Permission Status</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg ${canGenerateDocuments ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <span className="font-medium">Role: {userRole}</span>
            </div>
            <div className={`px-4 py-2 rounded-lg ${canGenerateDocuments ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <span className="font-medium">
                {canGenerateDocuments ? '✅ Can Generate Documents' : '❌ Cannot Generate Documents'}
              </span>
            </div>
          </div>
          {!canGenerateDocuments && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                You need 'employee' or 'admin' role to generate documents. Current role: {userRole}
              </p>
            </div>
          )}
        </div>
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Document Generation Summary</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {processedQuestionnaires.reduce((sum, q) => sum + (q.policyUrls?.length || 0), 0)}
              </div>
              <div className="text-sm text-blue-700">Policy Documents</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                {processedQuestionnaires.reduce((sum, q) => sum + (q.procedureUrls?.length || 0), 0)}
              </div>
              <div className="text-sm text-green-700">Procedure Documents</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">
                {processedQuestionnaires.length}
              </div>
              <div className="text-sm text-purple-700">Questionnaires</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Generation Options</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors duration-300 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={options.useAnswersInPolicy} 
                onChange={e => setOptions(o => ({...o, useAnswersInPolicy: e.target.checked}))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-800 group-hover:text-blue-600">Include Answers</div>
                <div className="text-xs text-gray-500">Use auditor answers in policies</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 transition-colors duration-300 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={options.includeUnanswered} 
                onChange={e => setOptions(o => ({...o, includeUnanswered: e.target.checked}))}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <div>
                <div className="font-medium text-gray-800 group-hover:text-green-600">Include Unanswered</div>
                <div className="text-xs text-gray-500">Show unanswered questions</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-colors duration-300 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={options.includeStatesInProcedures} 
                onChange={e => setOptions(o => ({...o, includeStatesInProcedures: e.target.checked}))}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div>
                <div className="font-medium text-gray-800 group-hover:text-purple-600">Show Status</div>
                <div className="text-xs text-gray-500">Display implementation status</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-colors duration-300 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={options.includeAppendixQA} 
                onChange={e => setOptions(o => ({...o, includeAppendixQA: e.target.checked}))}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <div>
                <div className="font-medium text-gray-800 group-hover:text-orange-600">Q&A Appendix</div>
                <div className="text-xs text-gray-500">Include question appendix</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 transition-colors duration-300 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={options.generatePDF} 
                onChange={e => setOptions(o => ({...o, generatePDF: e.target.checked}))}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <div>
                <div className="font-medium text-gray-800 group-hover:text-red-600">Generate PDF</div>
                <div className="text-xs text-gray-500">Create PDF versions</div>
              </div>
            </label>
          </div>
        </div>

        {/* Generated Documents Section */}
        {generatedDocuments.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-xl">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Recently Generated Documents</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {generatedDocuments.map((doc) => (
                <div key={doc.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className={`w-4 h-4 ${doc.type === 'policy' ? 'text-blue-600' : 'text-green-600'}`} />
                        <span className={`text-sm font-medium ${doc.type === 'policy' ? 'text-blue-700' : 'text-green-700'}`}>
                          {doc.type === 'policy' ? 'Policy' : 'Procedure'}
                        </span>
                        {doc.isUploaded && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Supabase
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-800 mb-1">{doc.name}</h4>
                      <p className="text-xs text-gray-500">
                        Generated: {new Date(doc.generatedAt).toLocaleString()}
                      </p>
                    </div>
                        <div className="flex gap-2">
                          {/* <button
                            onClick={() => setActiveDoc(doc)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-300"
                            title="Preview Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button> */}
                          <button
                            onClick={() => downloadDocument(doc.content, `${doc.name}.pdf`)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-300"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-8">
          {processedQuestionnaires.map((questionnaire) => (
            <section key={questionnaire._id} className="space-y-6">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {questionnaire.key.charAt(questionnaire.key.length - 1)}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{questionnaire.heading}</h2>
                    <p className="text-gray-600">
                      {questionnaire.sections.length} sections • {questionnaire.stats.totalQuestions} questions • {questionnaire.stats.answeredQuestions} answered ({questionnaire.stats.completionPercentage}%)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    className="px-6 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
                    onClick={() => generateAllDocuments(questionnaire)}
                    disabled={generating === `all-${questionnaire._id}` || !canGenerateDocuments}
                  >
                    {generating === `all-${questionnaire._id}` ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 inline animate-spin" />
                        Generating All...
                      </>
                    ) : uploadingToStorage.has(`${questionnaire._id}-comprehensive`) ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 inline animate-spin text-green-500" />
                        Uploading to Supabase...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2 inline" />
                        Generate All Documents
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {questionnaire.sections.map((section, sectionIdx) => (
                  <div key={sectionIdx} className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-300">
                          {section.heading}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{section.qna.length} questions</span>
                          <span>•</span>
                          <span>{section.qna.filter(q => q.answer.trim() !== "").length} answered</span>
                          <span>•</span>
                          <span>{section.qna.filter(q => q.state).length} implemented</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sample Questions */}
                    <div className="space-y-3 mb-6">
                      {section.qna.slice(0, 2).map((q, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-blue-600 text-sm">Q{i + 1}:</span>
                            <p className="text-sm text-gray-700 flex-1">{q.question}</p>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 ${
                                q.state ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {q.state ? "✓ Implemented" : "✗ Not implemented"}
                              </span>
                          {q.answer && (
                              <span className="text-xs text-gray-500">
                                {q.answer.length} chars
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {section.qna.length > 2 && (
                        <div className="text-center text-gray-400 text-sm py-2">
                          + {section.qna.length - 2} more questions
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        className="flex-1 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => generateDocument(questionnaire, sectionIdx, 'procedure')}
                        disabled={generating === `${questionnaire._id}-${sectionIdx}-procedures` || !canGenerateDocuments}
                        title={!canGenerateDocuments ? "Insufficient permissions" : "Generate Procedures"}
                      >
                        {generating === `${questionnaire._id}-${sectionIdx}-procedures` ? (
                          <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                        ) : uploadingToStorage.has(`${questionnaire._id}-procedure-${section.heading}`) ? (
                          <Loader2 className="w-4 h-4 mr-2 inline animate-spin text-green-500" />
                        ) : null}
                        Generate Procedures
                        {uploadingToStorage.has(`${questionnaire._id}-procedure-${section.heading}`) && (
                          <span className="ml-2 text-xs">Uploading to Supabase...</span>
                        )}
                      </button>
                      <button
                        className="flex-1 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => generateDocument(questionnaire, sectionIdx, 'policy')}
                        disabled={generating === `${questionnaire._id}-${sectionIdx}-policy` || !canGenerateDocuments}
                        title={!canGenerateDocuments ? "Insufficient permissions" : "Generate Policy"}
                      >
                        {generating === `${questionnaire._id}-${sectionIdx}-policy` ? (
                          <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                        ) : uploadingToStorage.has(`${questionnaire._id}-policy-${section.heading}`) ? (
                          <Loader2 className="w-4 h-4 mr-2 inline animate-spin text-green-500" />
                        ) : null}
                        Generate Policy
                        {uploadingToStorage.has(`${questionnaire._id}-policy-${section.heading}`) && (
                          <span className="ml-2 text-xs">Uploading to Supabase...</span>
                        )}
                      </button>
                    </div>

                    {/* Existing Documents */}
                    {((questionnaire.policyUrls?.length || 0) > 0 || (questionnaire.procedureUrls?.length || 0) > 0) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Generated Documents:</h4>
                        <div className="space-y-2">
                          {(questionnaire.policyUrls || []).map((docUrl, idx) => (
                            <div key={`policy-${idx}`} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-blue-700">{docUrl.name}</span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Supabase
                                </span>
                              </div>
                                <div className="flex gap-1">
                                  {/* <button
                                    onClick={() => window.open(docUrl.url, '_blank')}
                                    className="p-1 text-blue-600 hover:text-blue-800 rounded"
                                    title="View Document"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button> */}
                                  <button
                                    onClick={() => window.open(docUrl.url, '_blank')}
                                    className="p-1 text-blue-600 hover:text-blue-800 rounded"
                                    title="Open Document"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => downloadDocument(`Policy Document ${idx + 1}`, `policy-${idx + 1}.pdf`)}
                                    className="p-1 text-blue-600 hover:text-blue-800 rounded"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4" />
                      </button>
                    </div>
                            </div>
                          ))}
                          {(questionnaire.procedureUrls || []).map((docUrl, idx) => (
                            <div key={`procedure-${idx}`} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700">{docUrl.name}</span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Supabase
                                </span>
                              </div>
                                <div className="flex gap-1">
                                  {/* <button
                                    onClick={() => window.open(docUrl.url, '_blank')}
                                    className="p-1 text-green-600 hover:text-green-800 rounded"
                                    title="View Document"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button> */}
                                  <button
                                    onClick={() => window.open(docUrl.url, '_blank')}
                                    className="p-1 text-green-600 hover:text-green-800 rounded"
                                    title="Open Document"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => downloadDocument(`Procedure Document ${idx + 1}`, `procedure-${idx + 1}.pdf`)}
                                    className="p-1 text-green-600 hover:text-green-800 rounded"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4" />
                      </button>
                    </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Document Preview Modal */}
        {activeDoc && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border-0 overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">PDF Document Generated Successfully!</h3>
                      <p className="text-blue-100 text-sm">{activeDoc.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors duration-300" 
                      onClick={() => setActiveDoc(null)}
                    >
                      Close
                    </button>
                    <button 
                      className="px-6 py-2 rounded-xl bg-white text-blue-600 hover:bg-blue-50 shadow-lg transition-all duration-300 font-medium" 
                      onClick={() => downloadDocument(activeDoc.content, `${activeDoc.name}.pdf`)}
                    >
                      <Download className="w-4 h-4 mr-2 inline" />
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">Document ready for download</span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">
                    Your {activeDoc.type} document has been generated successfully. Click the download button above to save it as a PDF file.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 max-h-96 overflow-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{activeDoc.content}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

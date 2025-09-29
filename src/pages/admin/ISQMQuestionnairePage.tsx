import React, { useState, useMemo, useEffect, useRef } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ISQMPolicyGenerator, ISQMDocumentManager, ISQMAnalytics } from '@/components/isqm';

import { 

  Send, 

  Play,

  Sparkles,

  FileText,
  TrendingUp,

  AlertCircle,
  Plus
} from 'lucide-react';

import { useISQM, ISQMParent, ISQMQuestionnaire } from '@/hooks/useISQM';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { EnhancedLoader } from '@/components/ui/enhanced-loader';


// Import extracted components
import { ISQMHeader } from '@/components/isqm/ISQMHeader';
import { ParentSelection } from '@/components/isqm/ParentSelection';
import { ProgressSection } from '@/components/isqm/ProgressSection';
import { WorkflowProgress } from '@/components/isqm/WorkflowProgress';
import { QuestionnaireTab } from '@/components/isqm/QuestionnaireTab';
import {
  CreateParentDialog,
  EditParentDialog,
  EditQuestionnaireDialog,
  EditSectionDialog,
  AddSectionNoteDialog,
  EditQuestionDialog,
  AddQuestionNoteDialog,
  DeleteConfirmDialog
} from '@/components/isqm/dialogs';


// Type definitions

interface QuestionAnswer {

  question: string;

  answer: string;

  state: boolean;

}



interface Section {

  heading: string;

  qna: QuestionAnswer[];

}



interface ISQMPack {

  heading: string;

  sections: Section[];

}



interface Metadata {

  title: string;

  version: string;

  jurisdiction_note: string;

  sources: string[];

  generated: string;

}



interface ISQMData {

  metadata: Metadata;

  ISQM_1: ISQMPack;

  ISQM_2: ISQMPack;

  ISA_220_Revised: ISQMPack;

}



// Updated ISQM data with the new structure

const ISQM_DATA: ISQMData = {

  "metadata": {

    "title": "ISQM Questionnaire Pack",

    "version": "2025-09-06-EU-MLT",

    "jurisdiction_note": "Built on IAASB ISQM 1 & ISQM 2 and ISA 220 (Revised). Adaptable to local adoption (e.g., Malta Accountancy Board). Includes EU Regulation 537/2014 and Malta Accountancy Board overlays.",

    "sources": [

      "IAASB 2023–2024 Handbook; ISQM 1; ISQM 2; ISA 220 (Revised)",

      "Accountancy Board Malta guidance on ISQM 1 (effective 15 Dec 2022)"

    ],

    "generated": "2025-09-06"

  },

  "ISQM_1": {

    "heading": "ISQM 1 — Firm-Level System of Quality Management",

    "sections": [

      {

        "heading": "Governance & Leadership (Ultimate and Operational Responsibility)",

        "qna": [

          {

            "question": "Has the firm designated individual(s) with ultimate responsibility and accountability for the SOQM?",

            "answer": "",

            "state": false

          },

          {

            "question": "Has the firm designated individual(s) with operational responsibility for the SOQM?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are roles, responsibilities, and authority of these individuals defined, documented, and communicated?",

            "answer": "",

            "state": false

          },

          {

            "question": "Does leadership promote a culture that recognizes and reinforces quality as a fundamental value?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are financial and operational objectives balanced with quality objectives (e.g., no incentives that undermine quality)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is there a periodic leadership evaluation of the SOQM's design, implementation and operating effectiveness, with a documented conclusion?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are governance arrangements in place for oversight (e.g., management/quality committee, reporting lines, KPIs)?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Firm's Risk Assessment Process (Quality Objectives, Risks, Responses)",

        "qna": [

          {

            "question": "Has the firm established quality objectives covering all ISQM 1 components?",

            "answer": "",

            "state": false

          },

          {

            "question": "Has the firm identified and assessed quality risks that could adversely affect the achievement of the quality objectives?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are quality risks tailored to the firm's nature and circumstances (size, complexity, industries, PIEs/LCEs, technologies, shared service centers, networks)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Have responses (policies, procedures, controls) been designed and implemented to address each assessed quality risk?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are responses integrated with firm workflows and technology (e.g., methodology, audit tools, templates, data governance)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are triggers defined for updating objectives/risks/responses (e.g., regulatory changes, new services, incidents, monitoring findings)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is there documentation linking each response to the quality risks it addresses?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Relevant Ethical Requirements (Including Independence)",

        "qna": [

          {

            "question": "Are quality objectives established for compliance with relevant ethical requirements (incl. IESBA Code or local equivalent) and independence?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are processes in place to identify, evaluate, address and document threats to independence?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are independence confirmations obtained at least annually from personnel and relevant external parties?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are systems in place to track financial interests, relationships, employment, and long association/cooling-off requirements?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are potential/actual breaches captured, evaluated for impact, remediated, and subjected to root-cause analysis?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is there timely communication of independence matters to engagement teams and those charged with governance when required?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Acceptance & Continuance of Client Relationships and Specific Engagements",

        "qna": [

          {

            "question": "Do acceptance/continuance procedures address client integrity, applicable ethical requirements, and the firm's ability to perform (competence, time, resources)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are risks specific to the engagement type (audit, review, other assurance, related services) considered?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are considerations documented when using component auditors, experts, service providers, or network resources?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are conflicting or unusual terms assessed (e.g., scope limitations, restrictions on access to records, unrealistic deadlines/fees)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are decisions, including declinations and withdrawals, documented with rationale and approvals?",

            "answer": "",

            "state": false

          },

          {

            "question": "Where information arises post-acceptance that would have led to decline, are procedures in place to reassess continuance, consider reporting obligations, and possible withdrawal?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Engagement Performance (Methodology, Direction, Supervision, Review, Consultation)",

        "qna": [

          {

            "question": "Does the firm maintain and update methodologies, tools, templates, and guides aligned with professional standards and law/regulation?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are requirements established for engagement planning, supervision, review, and resolving differences of opinion?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are criteria and protocols defined for consultation on difficult or contentious matters, including documentation of nature, scope, conclusions and implementation?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are policies established for engagement quality reviews in accordance with ISQM 2 (criteria, timing before report date, scope)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are policies in place for timely assembly of final engagement files and for addressing subsequent facts discovered after the report date?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Resources — Human",

        "qna": [

          {

            "question": "Does the firm have sufficient and appropriate personnel to perform engagements (skills, time, experience, specialization)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are recruitment, assignment, workload management, and retention processes defined and monitored?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are training and development programs in place (technical, ethics/independence, methodology, technology, EQCR training)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are performance appraisal and remediation processes implemented (including addressing recurring deficiencies)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are roles of engagement partners, EQ reviewers, specialists, and supervisors described and communicated?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Resources — Technological, Intellectual, and External",

        "qna": [

          {

            "question": "Are technology resources (audit software, data analytics, AI/OCR tools, cloud platforms) fit for purpose, secured, and governed (change control, access, logs)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are intellectual resources (manuals, templates, checklists) current, controlled, and versioned?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are arrangements with network firms or service providers evaluated and integrated without undermining the firm's SOQM?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are data protection, confidentiality, and business continuity (backup, disaster recovery) addressed for all resources?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is there periodic evaluation of resource effectiveness and user feedback loops?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Information & Communication",

        "qna": [

          {

            "question": "Does the firm identify, capture, and use quality-relevant information from internal and external sources?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are roles, responsibilities, policies, and changes communicated timely to engagement teams and leadership?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are secure channels in place for personnel to raise quality concerns without fear of retaliation, with tracking and response?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are communications to external parties (e.g., governance, regulators, networks) defined where appropriate?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Monitoring & Remediation (Ongoing, Periodic, Deficiencies, RCA)",

        "qna": [

          {

            "question": "Are ongoing and periodic monitoring activities designed (e.g., in-flight monitoring, cold file reviews, thematic reviews, KPIs)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are findings evaluated to determine whether deficiencies exist, individually or in aggregate?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is root-cause analysis performed for deficiencies, with designed remedial actions and owners/due dates?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is the effectiveness of remedial actions tracked and re-tested?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are monitoring results fed back into the risk assessment process to update objectives, risks, and responses?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are reports provided to leadership and governance with trends and action plans?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Annual Evaluation of the SOQM",

        "qna": [

          {

            "question": "Has the individual with ultimate responsibility performed and documented an annual evaluation of the SOQM's design, implementation, and operating effectiveness?",

            "answer": "",

            "state": false

          },

          {

            "question": "Does the evaluation conclude whether the SOQM provides reasonable assurance of achieving quality objectives?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are significant matters, limitations, or required improvements documented and communicated with timelines?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Network Requirements/Services and Service Providers",

        "qna": [

          {

            "question": "Has the firm evaluated whether network requirements/services are appropriate and do not undermine the firm's SOQM?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are responsibilities defined for implementing network requirements/services and monitoring their effectiveness?",

            "answer": "",

            "state": false

          },

          {

            "question": "Where external service providers are used, has the firm evaluated competence, independence/confidentiality commitments, and controls over data?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Documentation",

        "qna": [

          {

            "question": "Is documentation sufficient to understand the SOQM, including quality objectives, risks, responses, monitoring, deficiencies, RCA, remediation, and evaluations?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are documentation controls (ownership, versioning, retention, security, accessibility) established and operating?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "EU/Malta Annex — Local Law & PIE Requirements",

        "qna": [

          {

            "question": "Confirm policies address EU Reg. 537/2014 PIE requirements: auditor rotation/maximum tenure, tendering (where applicable), long-association/cooling-off, prohibited non-audit services, and fee dependency thresholds (with monitoring and safeguards).",

            "answer": "",

            "state": false

          },

          {

            "question": "Confirm the firm evaluates and documents independence, long-association and NAS restrictions specifically for PIE engagements in Malta, and communicates required matters to TCWG.",

            "answer": "",

            "state": false

          },

          {

            "question": "Confirm Malta Accountancy Board quality assurance expectations are integrated: periodic external reviews, remediation tracking, and timely responses to findings (with root-cause analysis and evidence of implementation).",

            "answer": "",

            "state": false

          },

          {

            "question": "Confirm references to the Accountancy Profession Act and local regulations are included in ethical requirements, licensing/registration, and public oversight obligations, with designated responsible persons.",

            "answer": "",

            "state": false

          },

          {

            "question": "For group audits, confirm policies align with ISA 600 (Revised): component auditor instructions, competence/evaluations, communication, and review of significant judgements (and EQR impact when criteria met).",

            "answer": "",

            "state": false

          }

        ]

      }

    ]

  },

  "ISQM_2": {

    "heading": "ISQM 2 — Engagement Quality Reviews",

    "sections": [

      {

        "heading": "EQR Requirement and Criteria",

        "qna": [

          {

            "question": "Has the firm defined criteria to determine when an EQR is required (e.g., listed/PIE audits, high-risk engagements, first-year audits, significant judgements)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are criteria responsive to the firm's quality risks and regularly re-assessed?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are engagements meeting the criteria appropriately flagged and assigned an EQ reviewer before report dating?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Appointment and Eligibility of EQ Reviewer",

        "qna": [

          {

            "question": "Is the EQ reviewer independent of the engagement team with sufficient experience, authority, and technical competence?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are eligibility criteria established (including cooling-off for former engagement partners and restrictions on consultation that could impair objectivity)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is an alternate reviewer process defined for unavailability or independence conflicts?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Performance of the EQR",

        "qna": [

          {

            "question": "Is the EQR performed at appropriate stages to allow timely resolution of matters before the report is dated?",

            "answer": "",

            "state": false

          },

          {

            "question": "Does the EQR address significant judgements and conclusions, including going concern, fraud, complex estimates, group audits, and other key matters?",

            "answer": "",

            "state": false

          },

          {

            "question": "Does the EQR consider whether consultations were undertaken, conclusions documented, and differences of opinion resolved?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are communications between EQ reviewer and engagement partner documented, including required changes to the work or report?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Completion and Documentation",

        "qna": [

          {

            "question": "Is the EQR complete prior to the dating of the report, with confirmation that the reviewer is not aware of unresolved matters that would cause concern?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is EQR documentation sufficient to understand the procedures performed, matters reviewed, and conclusions reached, without including primary evidence?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are retention, confidentiality, and access controls defined for EQR documentation?",

            "answer": "",

            "state": false

          }

        ]

      }

    ]

  },

  "ISA_220_Revised": {

    "heading": "ISA 220 (Revised) — Engagement-Level Quality Management (Audit)",

    "sections": [

      {

        "heading": "Engagement Partner Responsibilities",

        "qna": [

          {

            "question": "Has the engagement partner assumed overall responsibility for managing and achieving quality on the engagement?",

            "answer": "",

            "state": false

          },

          {

            "question": "Has the engagement partner determined that sufficient and appropriate resources are assigned or made available?",

            "answer": "",

            "state": false

          },

          {

            "question": "Has the engagement partner reviewed critical areas (risk assessment, materiality, responses, significant judgements, conclusions) and taken responsibility for direction and supervision?",

            "answer": "",

            "state": false

          },

          {

            "question": "Has the engagement partner considered and responded to relevant ethical requirements, including independence, for themselves and the team?",

            "answer": "",

            "state": false

          },

          {

            "question": "Has the engagement partner taken responsibility for the engagement documentation (timely assembly, quality, and confidentiality)?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Resources and Use of Resources",

        "qna": [

          {

            "question": "Are engagement resources (personnel, specialists, component auditors, technology) appropriate and sufficient?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are roles and responsibilities assigned and communicated to team members and component auditors?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is the competence of team members evaluated and supervised, with remedial actions where needed?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Direction, Supervision and Review",

        "qna": [

          {

            "question": "Are team briefings and instructions performed timely, covering objectives, risks, responsibilities, ethics, and due dates?",

            "answer": "",

            "state": false

          },

          {

            "question": "Is the nature, timing and extent of supervision commensurate with team experience and risks?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are reviews performed of significant matters, including documentation of who reviewed what and when?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are differences of opinion addressed and resolved before report dating, in line with firm policy?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Consultation and Engagement Quality Review (where required)",

        "qna": [

          {

            "question": "Were consultations undertaken for difficult or contentious matters, with documentation of conclusions and implementation?",

            "answer": "",

            "state": false

          },

          {

            "question": "Where an EQR is required, was it completed prior to report date and were all issues addressed?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Communications",

        "qna": [

          {

            "question": "Are communications maintained with management and those charged with governance as required (scope, timing, significant findings, independence)?",

            "answer": "",

            "state": false

          },

          {

            "question": "Are inter-firm and component auditor communications clear, timely, and documented (group instructions, component findings)?",

            "answer": "",

            "state": false

          }

        ]

      },

      {

        "heading": "Engagement Documentation",

        "qna": [

          {

            "question": "Is documentation sufficient to enable an experienced auditor to understand the work performed and conclusions reached?",

            "answer": "",

            "state": false

          },

          {

            "question": "Was the final audit file assembled on time and changes after the report date controlled and documented?",

            "answer": "",

            "state": false

          }

        ]

      }

    ]

  }

};



const ISQMQuestionnairePage: React.FC = () => {

  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  
  
  const {

    parents,

    currentParent,

    questionnaires,

    loading,

    error,

    fetchParents,

    createParent,

    updateParent,

    deleteParent,

    setCurrentParent,

    fetchQuestionnaires,

    createQuestionnaire,

    updateQuestionnaire,

    deleteQuestionnaire,

    updateQuestionAnswer,

    bulkUpdateAnswers,

    getQuestionnaireStats,

    exportQuestionnaire,

    updateQuestionText,

    deleteQuestion,

    addQuestionNote,

    updateSectionHeading,

    deleteSection,

    addSectionNote,

    generatePolicy,

    generateProcedure,

    generateRiskAssessment,

    generateComplianceChecklist,

    generateAllDocuments,

    getGenerationTypes

  } = useISQM();



  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<string>("questionnaire");

  const [selectedAuditor, setSelectedAuditor] = useState<string>("");

  const [selectedParent, setSelectedParent] = useState<string>("");

  const [isCreatingParent, setIsCreatingParent] = useState(false);

  const [savingAnswers, setSavingAnswers] = useState<Set<string>>(new Set());

  const [newParent, setNewParent] = useState({

    title: "",

    version: "1.0",

    jurisdiction: "Built on IAASB ISQM 1 & ISQM 2 and ISA 220 (Revised)",

    sources: [] as string[]

  });

  const [editingQuestionnaire, setEditingQuestionnaire] = useState<ISQMQuestionnaire | null>(null);

  const [editingParent, setEditingParent] = useState<ISQMParent | null>(null);

  
  
  // Dialog states for CRUD operations

  const [editSectionDialog, setEditSectionDialog] = useState<{

    isOpen: boolean;

    questionnaireId: string;

    sectionIndex: number;

    currentHeading: string;

  }>({ isOpen: false, questionnaireId: '', sectionIndex: -1, currentHeading: '' });

  
  
  const [addSectionNoteDialog, setAddSectionNoteDialog] = useState<{

    isOpen: boolean;

    questionnaireId: string;

    sectionIndex: number;

    note: string;

  }>({ isOpen: false, questionnaireId: '', sectionIndex: -1, note: '' });

  
  
  const [editQuestionDialog, setEditQuestionDialog] = useState<{

    isOpen: boolean;

    questionnaireId: string;

    sectionIndex: number;

    questionIndex: number;

    currentQuestion: string;

  }>({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, currentQuestion: '' });

  
  
  const [addQuestionNoteDialog, setAddQuestionNoteDialog] = useState<{

    isOpen: boolean;

    questionnaireId: string;

    sectionIndex: number;

    questionIndex: number;

    note: string;

  }>({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, note: '' });

  
  
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{

    isOpen: boolean;

    type: 'parent' | 'questionnaire' | 'section' | 'question';

    title: string;

    message: string;

    onConfirm: () => void;

  }>({ isOpen: false, type: 'parent', title: '', message: '', onConfirm: () => {} });

  // Policy Analysis states
  const [policyAnalysisDialog, setPolicyAnalysisDialog] = useState<{
    isOpen: boolean;
    questionnaireId: string;
    sectionId: string;
    sectionHeading: string;
  }>({ isOpen: false, questionnaireId: '', sectionId: '', sectionHeading: '' });

  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [policyText, setPolicyText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);



  // Load parents on component mount

  useEffect(() => {

    console.log('🔄 ISQMQuestionnairePage: Loading parents...');

    fetchParents();

  }, [fetchParents]);



  // Load questionnaires when parent is selected

  useEffect(() => {

    if (selectedParent) {

      console.log('🔄 ISQMQuestionnairePage: Loading questionnaires for parent:', selectedParent);

      fetchQuestionnaires(selectedParent);

      setCurrentParent(parents.find(p => p._id === selectedParent) || null);

    }

  }, [selectedParent, parents, fetchQuestionnaires, setCurrentParent]);



  // Calculate progress from current questionnaires

  const progress = useMemo(() => {

    if (!questionnaires.length) return 0;

    
    
    const totalQuestions = questionnaires.reduce((acc, q) => acc + q.stats.totalQuestions, 0);

    const answeredQuestions = questionnaires.reduce((acc, q) => acc + q.stats.answeredQuestions, 0);

    
    
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  }, [questionnaires]);



  const toggleCategory = (categoryKey: string) => {

    const newExpanded = new Set(expandedCategories);

    if (newExpanded.has(categoryKey)) {

      newExpanded.delete(categoryKey);

    } else {

      newExpanded.add(categoryKey);

    }

    setExpandedCategories(newExpanded);

  };



  const toggleSection = (sectionKey: string) => {

    const newExpanded = new Set(expandedSections);

    if (newExpanded.has(sectionKey)) {

      newExpanded.delete(sectionKey);

    } else {

      newExpanded.add(sectionKey);

    }

    setExpandedSections(newExpanded);

  };



  // Local state for immediate UI updates

  const [localAnswers, setLocalAnswers] = useState<Map<string, string>>(new Map());

  const [localStates, setLocalStates] = useState<Map<string, boolean>>(new Map());

  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  
  
  // Debounce timer for API calls only

  const answerUpdateTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  
  
  // Initialize local state only when questionnaires first load or when local state is empty

  useEffect(() => {

    if (questionnaires.length > 0 && localAnswers.size === 0 && localStates.size === 0) {

      const newLocalAnswers = new Map<string, string>();

      const newLocalStates = new Map<string, boolean>();

      
      
      questionnaires.forEach(questionnaire => {

        questionnaire.sections.forEach((section, sectionIdx) => {

          section.qna.forEach((q, questionIdx) => {

            const key = `${questionnaire._id}-${sectionIdx}-${questionIdx}`;

            newLocalAnswers.set(key, q.answer);

            newLocalStates.set(key, q.state);

          });

        });

      });

      
      
      setLocalAnswers(newLocalAnswers);

      setLocalStates(newLocalStates);

    }

  }, [questionnaires, localAnswers.size, localStates.size]);



  const handleAnswerUpdate = async (

    questionnaireId: string,

    sectionIndex: number,

    questionIndex: number,

    answer: string

  ) => {

    const answerKey = `${questionnaireId}-${sectionIndex}-${questionIndex}`;

    
    
    // Update local state immediately for smooth typing

    setLocalAnswers(prev => {

      const newMap = new Map(prev);

      newMap.set(answerKey, answer);

      return newMap;

    });

    
    
    // Mark as pending save

    setPendingSaves(prev => new Set(prev).add(answerKey));

    
    
    // Clear existing timer for this answer

    const existingTimer = answerUpdateTimers.current.get(answerKey);

    if (existingTimer) {

      clearTimeout(existingTimer);

    }

    
    
    // Debounce the API call

    const timer = setTimeout(async () => {

      try {

        console.log('🔄 Updating answer:', { questionnaireId, sectionIndex, questionIndex, answer });

        await updateQuestionAnswer(questionnaireId, sectionIndex, questionIndex, answer);

        // Remove from pending saves on success

        setPendingSaves(prev => {

          const newSet = new Set(prev);

          newSet.delete(answerKey);

          return newSet;

        });

      } catch (error) {

        console.error('❌ Failed to update answer:', error);

        // Remove from pending saves even on error to avoid stuck state

        setPendingSaves(prev => {

          const newSet = new Set(prev);

          newSet.delete(answerKey);

          return newSet;

        });

      } finally {

        answerUpdateTimers.current.delete(answerKey);

      }

    }, 1000); // Increased to 1 second for better UX

    
    
    answerUpdateTimers.current.set(answerKey, timer);

  };



  const handleStateUpdate = async (

    questionnaireId: string,

    sectionIndex: number,

    questionIndex: number,

    state: boolean

  ) => {

    const stateKey = `${questionnaireId}-${sectionIndex}-${questionIndex}`;

    
    
    // Update local state immediately

    setLocalStates(prev => {

      const newMap = new Map(prev);

      newMap.set(stateKey, state);

      return newMap;

    });

    
    
    // Mark as pending save

    setPendingSaves(prev => new Set(prev).add(stateKey));

    
    
    try {

      console.log('🔄 Updating state:', { questionnaireId, sectionIndex, questionIndex, state });

      
      
      // Get current answer to preserve it

      const questionnaire = questionnaires.find(q => q._id === questionnaireId);

      const currentAnswer = questionnaire?.sections[sectionIndex]?.qna[questionIndex]?.answer || '';

      
      
      // Update the question with the new state - send state field to backend

      await updateQuestionAnswer(questionnaireId, sectionIndex, questionIndex, currentAnswer, '', state);

      
      
      // Remove from pending saves on success

      setPendingSaves(prev => {

        const newSet = new Set(prev);

        newSet.delete(stateKey);

        return newSet;

      });

    } catch (error) {

      console.error('❌ Failed to update state:', error);

      // Remove from pending saves even on error

      setPendingSaves(prev => {

        const newSet = new Set(prev);

        newSet.delete(stateKey);

        return newSet;

      });

    }

  };



  const createNewParent = async () => {

    try {

      console.log('🔄 Creating new ISQM Parent via API...');

      
      
      // Create the parent first (without questionnaires)

      const newParentData = {

        metadata: {

          title: newParent.title || "ISQM Quality Management Pack 2024",

          version: newParent.version || "1.0",

          jurisdiction_note: newParent.jurisdiction || "Built on IAASB ISQM 1 & ISQM 2 and ISA 220 (Revised)",

          sources: newParent.sources.length > 0 ? newParent.sources : [

            "IAASB 2023–2024 Handbook; ISQM 1; ISQM 2; ISA 220 (Revised)",

            "Accountancy Board Malta guidance on ISQM 1 (effective 15 Dec 2022)"

          ],

          generated: new Date().toISOString()

        },

        questionnaires: [], // Empty questionnaires array

        status: "draft"

      };



      console.log('📋 Creating Parent with Data:', newParentData);

      const createdParent = await createParent(newParentData);

      
      
      console.log('✅ Parent created successfully:', createdParent);

      
      
      // Now create questionnaires for the parent

      const questionnaireTemplates = [

        {

          key: "ISQM_1",

          heading: "ISQM 1 — Firm-Level System of Quality Management",

          description: "Quality management system requirements",

          version: "1.0",

          framework: "IFRS",

          sections: ISQM_DATA.ISQM_1.sections.map(section => ({

            heading: section.heading,

            sectionId: section.heading.toLowerCase().replace(/\s+/g, '-'),

            order: ISQM_DATA.ISQM_1.sections.indexOf(section) + 1,

            qna: section.qna.map(q => ({

              question: q.question,

              questionId: `q-${Math.random().toString(36).substr(2, 9)}`,

              isMandatory: true,

              questionType: "textarea"

            }))

          }))

        },

        {

          key: "ISQM_2",

          heading: "ISQM 2 — Engagement Quality Reviews",

          description: "Engagement quality review requirements",

          version: "1.0",

          framework: "IFRS",

          sections: ISQM_DATA.ISQM_2.sections.map(section => ({

            heading: section.heading,

            sectionId: section.heading.toLowerCase().replace(/\s+/g, '-'),

            order: ISQM_DATA.ISQM_2.sections.indexOf(section) + 1,

            qna: section.qna.map(q => ({

              question: q.question,

              questionId: `q-${Math.random().toString(36).substr(2, 9)}`,

              isMandatory: true,

              questionType: "textarea"

            }))

          }))

        },

        {

          key: "ISA_220_Revised",

          heading: "ISA 220 (Revised) — Engagement-Level Quality Management",

          description: "Engagement-level quality management requirements",

          version: "1.0",

          framework: "IFRS",

          sections: ISQM_DATA.ISA_220_Revised.sections.map(section => ({

            heading: section.heading,

            sectionId: section.heading.toLowerCase().replace(/\s+/g, '-'),

            order: ISQM_DATA.ISA_220_Revised.sections.indexOf(section) + 1,

            qna: section.qna.map(q => ({

              question: q.question,

              questionId: `q-${Math.random().toString(36).substr(2, 9)}`,

              isMandatory: true,

              questionType: "textarea"

            }))

          }))

        }

      ];



      // Create each questionnaire

      console.log('📝 Creating questionnaires for parent:', createdParent._id);

      for (const template of questionnaireTemplates) {

        try {

          await createQuestionnaire({

            parentId: createdParent._id,

            ...template

          });

          console.log('✅ Created questionnaire:', template.key);

        } catch (error) {

          console.error('❌ Failed to create questionnaire:', template.key, error);

        }

      }

      
      
      // Refresh the parents list and questionnaires

      await fetchParents();

      await fetchQuestionnaires(createdParent._id);

      
      
      // Set the newly created parent as selected

      if (createdParent && createdParent._id) {

        setSelectedParent(createdParent._id);

        console.log('🎯 Auto-selecting newly created parent:', createdParent._id);

        
        
        // Switch to Questionnaire tab to show the newly created questionnaires

        setActiveTab("questionnaire");

        console.log('📋 Switching to Questionnaire tab to show new questionnaires');

      }

      
      
      setIsCreatingParent(false);

      setNewParent({

        title: "",

        version: "1.0",

        jurisdiction: "Built on IAASB ISQM 1 & ISQM 2 and ISA 220 (Revised)",

        sources: []

      });

      
      
      console.log('🎉 New ISQM Pack created and selected successfully!');

    } catch (error) {

      console.error('❌ Failed to create ISQM Parent:', error);

    }

  };



  // CRUD Operations for Questionnaires

  const handleEditQuestionnaire = async (questionnaire: ISQMQuestionnaire) => {

    try {

      console.log('🔄 Opening edit dialog for questionnaire:', questionnaire._id);

      setEditingQuestionnaire(questionnaire);

    } catch (error) {

      console.error('❌ Failed to open edit dialog:', error);

    }

  };



  const handleSaveQuestionnaire = async () => {

    if (!editingQuestionnaire) return;

    
    
    try {

      console.log('🔄 Saving questionnaire:', editingQuestionnaire._id);

      await updateQuestionnaire(editingQuestionnaire._id, {

        heading: editingQuestionnaire.heading,

        description: editingQuestionnaire.description

      });

      setEditingQuestionnaire(null);

    } catch (error) {

      console.error('❌ Failed to save questionnaire:', error);

    }

  };



  const handleDeleteQuestionnaire = async (questionnaireId: string) => {

    if (!isAdmin) {

      alert('Only administrators can delete questionnaires.');

      return;

    }

    
    
    try {

      console.log('🔄 Deleting questionnaire:', questionnaireId);

      if (confirm('Are you sure you want to delete this questionnaire? This action cannot be undone.')) {

        await deleteQuestionnaire(questionnaireId);

      }

    } catch (error) {

      console.error('❌ Failed to delete questionnaire:', error);

    }

  };



  const handleExportQuestionnaire = async (questionnaireId: string) => {

    try {

      console.log('🔄 Exporting questionnaire:', questionnaireId);

      const exportData = await exportQuestionnaire(questionnaireId, 'json');

      
      
      // Create downloadable file

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `questionnaire-${questionnaireId}-${new Date().toISOString().split('T')[0]}.json`;

      a.click();

      URL.revokeObjectURL(url);

      
      
      console.log('✅ Questionnaire exported successfully');

    } catch (error) {

      console.error('❌ Failed to export questionnaire:', error);

    }

  };



  // CRUD Operations for ISQM Parents

  const handleEditParent = async (parentId: string) => {

    try {

      console.log('🔄 Opening edit dialog for parent:', parentId);

      const parent = parents.find(p => p._id === parentId);

      if (parent) {

        setEditingParent(parent);

      }

    } catch (error) {

      console.error('❌ Failed to open edit dialog:', error);

    }

  };



  const handleSaveParent = async () => {

    if (!editingParent) return;

    
    
    try {

      console.log('🔄 Saving parent:', editingParent._id);

      await updateParent(editingParent._id, {

        metadata: editingParent.metadata

      });

      setEditingParent(null);

      await fetchParents(); // Refresh the list

    } catch (error) {

      console.error('❌ Failed to save parent:', error);

    }

  };



  const handleDeleteParent = async (parentId: string) => {

    if (!isAdmin) {

      alert('Only administrators can delete ISQM packs.');

      return;

    }

    
    
    try {

      console.log('🔄 Deleting parent:', parentId);

      const parent = parents.find(p => p._id === parentId);

      if (!parent) return;

      
      
      if (confirm(`Are you sure you want to delete "${parent.metadata.title}"? This will also delete all associated questionnaires and documents. This action cannot be undone.`)) {

        await deleteParent(parentId);

        setSelectedParent(""); // Clear selection

        await fetchParents(); // Refresh the list

      }

    } catch (error) {

      console.error('❌ Failed to delete parent:', error);

    }

  };



  const handleGeneratePolicy = async () => {

    if (!currentParent) {

      alert("Please select an ISQM pack first.");

      return;

    }

    
    
    // Check if there are any answers before generating policy

    const hasAnswers = questionnaires.some(q => 

      q.sections.some(section => 

        section.qna.some(q => q.answer.trim() !== "")

      )

    );

    
    
    if (!hasAnswers) {

      alert("Please answer some questions before generating policies.");

      return;

    }

    
    
    try {

      console.log('🤖 Generating all documents for parent:', currentParent._id);

      
      
      // Generate all documents (policies and procedures) for the parent

      const result = await generateAllDocuments(currentParent._id, {

        firmDetails: {

          size: "mid-sized",

          specializations: ["audit", "tax", "advisory"],

          jurisdiction: currentParent.metadata.jurisdiction_note || "UK",

          additionalInfo: "Generated from ISQM questionnaire responses"

        }

      });

      
      
      console.log('✅ Documents generated successfully:', result);

      
      
      // Download the generated files

      if (result.policies && result.policies.length > 0) {

        result.policies.forEach((policy: any) => {

          downloadGeneratedDocument(policy.document, policy.pdfFilename || `${policy.componentKey}_policy.pdf`);

        });

      }

      
      
      if (result.procedures && result.procedures.length > 0) {

        result.procedures.forEach((procedure: any) => {

          downloadGeneratedDocument(procedure.document, procedure.pdfFilename || `${procedure.componentKey}_procedure.pdf`);

        });

    }

    
    
    setActiveTab("policy-generator");

    } catch (error) {

      console.error('❌ Failed to generate documents:', error);

    }

  };



  const downloadGeneratedDocument = (content: string, filename: string) => {

    try {

      // Create a blob with the content

      const blob = new Blob([content], { type: 'text/markdown' });

      const url = URL.createObjectURL(blob);

      
      
      // Create download link

      const a = document.createElement('a');

      a.href = url;

      a.download = filename;

      a.style.display = 'none';

      
      
      // Trigger download

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      
      
      // Clean up

      URL.revokeObjectURL(url);

      
      
      console.log('✅ Document downloaded:', filename);

    } catch (error) {

      console.error('❌ Failed to download document:', error);

    }

  };



  // Dialog handler functions

  const handleEditSectionHeading = (questionnaireId: string, sectionIndex: number, currentHeading: string) => {

    setEditSectionDialog({

      isOpen: true,

      questionnaireId,

      sectionIndex,

      currentHeading

    });

  };



  const handleSaveSectionHeading = async () => {

    if (!editSectionDialog.currentHeading.trim()) return;

    
    
    try {

      await updateSectionHeading(editSectionDialog.questionnaireId, editSectionDialog.sectionIndex, editSectionDialog.currentHeading);

      setEditSectionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, currentHeading: '' });

    } catch (error) {

      console.error('❌ Failed to update section heading:', error);

    }

  };



  const handleAddSectionNote = (questionnaireId: string, sectionIndex: number) => {

    setAddSectionNoteDialog({

      isOpen: true,

      questionnaireId,

      sectionIndex,

      note: ''

    });

  };



  const handleSaveSectionNote = async () => {

    if (!addSectionNoteDialog.note.trim()) return;

    
    
    try {

      await addSectionNote(addSectionNoteDialog.questionnaireId, addSectionNoteDialog.sectionIndex, addSectionNoteDialog.note);

      setAddSectionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, note: '' });

    } catch (error) {

      console.error('❌ Failed to add section note:', error);

    }

  };



  const handleEditQuestion = (questionnaireId: string, sectionIndex: number, questionIndex: number, currentQuestion: string) => {

    setEditQuestionDialog({

      isOpen: true,

      questionnaireId,

      sectionIndex,

      questionIndex,

      currentQuestion

    });

  };



  const handleSaveQuestion = async () => {

    if (!editQuestionDialog.currentQuestion.trim()) return;

    
    
    try {

      await updateQuestionText(

        editQuestionDialog.questionnaireId, 

        editQuestionDialog.sectionIndex, 

        editQuestionDialog.questionIndex, 

        editQuestionDialog.currentQuestion

      );

      setEditQuestionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, currentQuestion: '' });

    } catch (error) {

      console.error('❌ Failed to update question:', error);

    }

  };



  const handleAddQuestionNote = (questionnaireId: string, sectionIndex: number, questionIndex: number) => {

    setAddQuestionNoteDialog({

      isOpen: true,

      questionnaireId,

      sectionIndex,

      questionIndex,

      note: ''

    });

  };



  const handleSaveQuestionNote = async () => {

    if (!addQuestionNoteDialog.note.trim()) return;

    
    
    try {

      await addQuestionNote(

        addQuestionNoteDialog.questionnaireId, 

        addQuestionNoteDialog.sectionIndex, 

        addQuestionNoteDialog.questionIndex, 

        addQuestionNoteDialog.note

      );

      setAddQuestionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, note: '' });

    } catch (error) {

      console.error('❌ Failed to add question note:', error);

    }

  };



  const handleDeleteSection = (questionnaireId: string, sectionIndex: number, sectionHeading: string) => {

    if (!isAdmin) {

      alert('Only administrators can delete sections.');

      return;

    }

    
    
    setDeleteConfirmDialog({

      isOpen: true,

      type: 'section',

      title: 'Delete Section',

      message: `Are you sure you want to delete "${sectionHeading}"? This will delete all questions in this section. This action cannot be undone.`,

      onConfirm: async () => {

        try {

          await deleteSection(questionnaireId, sectionIndex);

        } catch (error) {

          console.error('❌ Failed to delete section:', error);

        }

        setDeleteConfirmDialog({ isOpen: false, type: 'parent', title: '', message: '', onConfirm: () => {} });

      }

    });

  };



  const handleDeleteQuestion = (questionnaireId: string, sectionIndex: number, questionIndex: number, questionText: string) => {

    if (!isAdmin) {

      alert('Only administrators can delete questions.');

      return;

    }

    
    
    setDeleteConfirmDialog({

      isOpen: true,

      type: 'question',

      title: 'Delete Question',

      message: `Are you sure you want to delete this question? This action cannot be undone.`,

      onConfirm: async () => {

        try {

          await deleteQuestion(questionnaireId, sectionIndex, questionIndex);

        } catch (error) {

          console.error('❌ Failed to delete question:', error);

        }

        setDeleteConfirmDialog({ isOpen: false, type: 'parent', title: '', message: '', onConfirm: () => {} });

      }

    });

  };

  // Policy Analysis Functions
  const handleOpenPolicyAnalysis = (questionnaireId: string, sectionId: string, sectionHeading: string) => {
    setPolicyAnalysisDialog({
      isOpen: true,
      questionnaireId,
      sectionId,
      sectionHeading
    });
    setPolicyFile(null);
    setPolicyText('');
    setAnalysisResults(null);
  };

  const handlePolicyFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPolicyFile(file);
      setPolicyText(''); // Clear text when file is selected
    } else {
      alert('Please select a PDF file.');
    }
  };

  const handleAnalyzePolicy = async () => {
    if (!policyFile && !policyText.trim()) {
      alert('Please upload a PDF file or enter policy text.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Get Supabase session token
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Auth error:', error);
        alert('Authentication error. Please log in again.');
        setIsAnalyzing(false);
        return;
      }

      const token = data.session?.access_token;
      if (!token) {
        alert('No authentication token found. Please log in again.');
        setIsAnalyzing(false);
        return;
      }

      let policyData: any = {};
      
      if (policyFile) {
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          policyData.policyFile = base64;
          
          // Call the API
          const response = await fetch(
            `${import.meta.env.VITE_APIURL}/api/isqm/questionnaires/${policyAnalysisDialog.questionnaireId}/sections/${policyAnalysisDialog.sectionId}/generate-category-answers`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(policyData)
            }
          );

          const result = await response.json();
          if (result.success) {
            setAnalysisResults(result);
            
            // Refresh questionnaires to get updated answers from backend
            if (selectedParent) {
              await fetchQuestionnaires(selectedParent);
              // Clear local state to force re-initialization with fresh data
              setLocalAnswers(new Map());
              setLocalStates(new Map());
            }
          } else {
            alert('Failed to analyze policy: ' + result.message);
          }
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(policyFile);
      } else {
        policyData.policyText = policyText;
        
        const response = await fetch(
          `${import.meta.env.VITE_APIURL}/api/isqm/questionnaires/${policyAnalysisDialog.questionnaireId}/sections/${policyAnalysisDialog.sectionId}/generate-category-answers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(policyData)
          }
        );

        const result = await response.json();
        if (result.success) {
          setAnalysisResults(result);
          
          // Refresh questionnaires to get updated answers from backend
          if (selectedParent) {
            await fetchQuestionnaires(selectedParent);
            // Clear local state to force re-initialization with fresh data
            setLocalAnswers(new Map());
            setLocalStates(new Map());
          }
        } else {
          alert('Failed to analyze policy: ' + result.message);
        }
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('❌ Policy analysis error:', error);
      alert('Failed to analyze policy. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const handleClosePolicyAnalysis = async () => {
    setPolicyAnalysisDialog({ isOpen: false, questionnaireId: '', sectionId: '', sectionHeading: '' });
    setPolicyFile(null);
    setPolicyText('');
    setAnalysisResults(null);
    
    // Refresh questionnaires to ensure latest data is displayed
    if (selectedParent) {
      await fetchQuestionnaires(selectedParent);
      // Clear local state to force re-initialization with fresh data
      setLocalAnswers(new Map());
      setLocalStates(new Map());
    }
  };



  const sendToAuditor = () => {

    console.log("Sending questionnaire to auditor:", selectedAuditor);

    // Add actual implementation here

  };

  
  
  // Save all pending changes for a section

  const handleSaveSection = async (questionnaireId: string, sectionIndex: number) => {

    const questionnaire = questionnaires.find(q => q._id === questionnaireId);

    if (!questionnaire) return;

    
    
    const section = questionnaire.sections[sectionIndex];

    if (!section) return;

    
    
    try {

      console.log('💾 Saving section:', { questionnaireId, sectionIndex });

      
      
      // Save all questions in the section

      const savePromises = section.qna.map(async (q, questionIndex) => {

        const answerKey = `${questionnaireId}-${sectionIndex}-${questionIndex}`;

        const localAnswer = localAnswers.get(answerKey);

        const localState = localStates.get(answerKey);

        
        
        // Only save if there are changes

        if (localAnswer !== undefined || localState !== undefined) {

          return updateQuestionAnswer(

            questionnaireId, 

            sectionIndex, 

            questionIndex, 

            localAnswer ?? q.answer,

            '',

            localState ?? q.state

          );

        }

      });

      
      
      await Promise.all(savePromises);

      
      
      // Clear pending saves for this section

      const sectionKeys = section.qna.map((_, questionIndex) => `${questionnaireId}-${sectionIndex}-${questionIndex}`);

      setPendingSaves(prev => {

        const newSet = new Set(prev);

        sectionKeys.forEach(key => newSet.delete(key));

        return newSet;

      });

      
      
      console.log('✅ Section saved successfully');

    } catch (error) {

      console.error('❌ Failed to save section:', error);

    }

  };



  const downloadQuestionnaire = () => {

    if (!currentParent) {

      alert("Please select an ISQM pack first.");

      return;

    }

    
    
    const dataToExport = {

      parent: currentParent,

      questionnaires: questionnaires,

      exportedAt: new Date().toISOString()

    };

    
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `isqm-questionnaire-${currentParent.metadata.title.replace(/\s+/g, '-')}.json`;

    a.click();

    URL.revokeObjectURL(url);

  };



  if (loading && parents.length === 0) {

    return (

      <div className="flex items-center justify-center h-64 sm:h-[40vh]">

        <EnhancedLoader size="lg" text="Loading ISQM packs..." />

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-amber-50">

      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Enhanced Header */}

        <ISQMHeader
          onCreateNewPack={() => setIsCreatingParent(true)}
          onDownloadQuestionnaire={downloadQuestionnaire}
          onGeneratePolicy={handleGeneratePolicy}
          hasCurrentParent={!!currentParent}
        />


        {/* Parent Selection */}

        <ParentSelection
          parents={parents}
          selectedParent={selectedParent}
          onParentChange={setSelectedParent}
          onCreateNewPack={() => setIsCreatingParent(true)}
          onEditParent={handleEditParent}
          onDeleteParent={handleDeleteParent}
          isAdmin={isAdmin}
        />




        {/* Enhanced Progress Section */}

        <ProgressSection progress={progress} />


        {/* Enhanced Workflow Progress */}

        <WorkflowProgress activeTab={activeTab} />


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-md border border-white/30 shadow-lg shadow-gray-300/30 rounded-2xl p-1">

            <TabsTrigger 

              value="questionnaire" 

              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 hover:bg-white/70"

            >

              <div className="flex items-center gap-2">

                <Play className="w-4 h-4" />

                <span>Questionnaire</span>

              </div>

            </TabsTrigger>

            <TabsTrigger 

              value="policy-generator"

              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 hover:bg-white/70"

            >

              <div className="flex items-center gap-2">

                <Sparkles className="w-4 h-4" />

                <span>Policy Generator</span>

              </div>

            </TabsTrigger>

            <TabsTrigger 

              value="documents"

              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 hover:bg-white/70"

            >

              <div className="flex items-center gap-2">

                <FileText className="w-4 h-4" />

                <span>Documents</span>

              </div>

            </TabsTrigger>

            <TabsTrigger 

              value="analytics"

              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 hover:bg-white/70"

            >

              <div className="flex items-center gap-2">

                <TrendingUp className="w-4 h-4" />

                <span>Analytics</span>

              </div>

            </TabsTrigger>

          </TabsList>



          <TabsContent value="questionnaire" className="space-y-6 mt-6">

            <QuestionnaireTab
              selectedParent={selectedParent}
              questionnaires={questionnaires}
              loading={loading}
              expandedSections={expandedSections}
              expandedCategories={expandedCategories}
              localAnswers={localAnswers}
              localStates={localStates}
              pendingSaves={pendingSaves}
              savingAnswers={savingAnswers}
              isAdmin={isAdmin}
              onToggleCategory={toggleCategory}
              onToggleSection={toggleSection}
              onAnswerUpdate={handleAnswerUpdate}
              onStateUpdate={handleStateUpdate}
              onEditQuestionnaire={handleEditQuestionnaire}
              onDeleteQuestionnaire={handleDeleteQuestionnaire}
              onExportQuestionnaire={handleExportQuestionnaire}
              onEditSectionHeading={handleEditSectionHeading}
              onDeleteSection={handleDeleteSection}
              onAddSectionNote={handleAddSectionNote}
              onSaveSection={handleSaveSection}
              onCreateNewPack={() => setIsCreatingParent(true)}
              onOpenPolicyAnalysis={handleOpenPolicyAnalysis}
            />
        </TabsContent>



          <TabsContent value="policy-generator" className="space-y-6 mt-6">

            <div className="space-y-6">

              <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">

                <CardHeader>

                  <CardTitle className="flex items-center gap-3">

                    <div className="p-2 bg-gray-100 rounded-xl">

                      <Send className="w-6 h-6 text-gray-800" />

                    </div>

                    <div>

                      <h3 className="text-xl font-semibold">Send to Auditor</h3>

                      <p className="text-sm text-muted-foreground mt-1">Share the completed questionnaire with auditors</p>

                    </div>

                  </CardTitle>

                </CardHeader>

                <CardContent className="space-y-4">

                  <div className="flex gap-4">

                    <Input

                      placeholder="Enter auditor email address..."

                      value={selectedAuditor}

                      onChange={(e) => setSelectedAuditor(e.target.value)}

                      className="flex-1 border-2 border-gray-200 focus:border-gray-400 rounded-xl"

                    />

                    <Button 

                      onClick={sendToAuditor} 

                      disabled={!selectedAuditor}

                      className="bg-gray-800 hover:bg-gray-900 text-white px-6 rounded-xl shadow-lg disabled:opacity-50"

                    >

                      <Send className="w-4 h-4 mr-2" />

                      Send

                    </Button>

                  </div>

                  <div className="text-sm text-muted-foreground">

                    The questionnaire data will be sent to the specified auditor for review and feedback.

                  </div>

                </CardContent>

              </Card>
              
              

              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">

                {currentParent && questionnaires.length > 0 ? (

                  <ISQMPolicyGenerator 

                    questionnaireData={{

                      metadata: currentParent.metadata,

                      ISQM_1: questionnaires.find(q => q.key === 'ISQM_1') || { 

                        _id: 'fallback-isqm1', 

                        key: 'ISQM_1', 

                        heading: 'ISQM 1', 

                        sections: [], 

                        stats: { totalQuestions: 0, answeredQuestions: 0, completionPercentage: 0 }

                      },

                      ISQM_2: questionnaires.find(q => q.key === 'ISQM_2') || { 

                        _id: 'fallback-isqm2', 

                        key: 'ISQM_2', 

                        heading: 'ISQM 2', 

                        sections: [], 

                        stats: { totalQuestions: 0, answeredQuestions: 0, completionPercentage: 0 }

                      },

                      ISA_220_Revised: questionnaires.find(q => q.key === 'ISA_220_Revised') || { 

                        _id: 'fallback-isa220', 

                        key: 'ISA_220_Revised', 

                        heading: 'ISA 220 Revised', 

                        sections: [], 

                        stats: { totalQuestions: 0, answeredQuestions: 0, completionPercentage: 0 }

                      }

                    }} 

                    parentId={currentParent._id}

                    questionnaires={questionnaires}

                  />

                ) : (

                  <div className="p-12 text-center">

                    <div className="flex flex-col items-center gap-4">

                      <div className="p-4 bg-gray-100 rounded-full">

                        <AlertCircle className="w-8 h-8 text-gray-600" />

                      </div>

                      <div>

                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Data Available</h3>

                        <p className="text-gray-600">Please select an ISQM pack and answer some questions before generating policies.</p>

                      </div>

                    </div>

                  </div>

                )}

              </div>

            </div>

          </TabsContent>



          <TabsContent value="documents" className="space-y-6 mt-6">

            {!selectedParent ? (

              <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">

                <CardContent className="p-12 text-center">

                  <div className="flex flex-col items-center gap-4">

                    <div className="p-4 bg-gray-100 rounded-full">

                      <FileText className="w-8 h-8 text-gray-600" />

                    </div>

                    <div>

                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No ISQM Pack Selected</h3>

                      <p className="text-gray-600 mb-4">Please select an ISQM pack to manage supporting documents.</p>

                      <Button 

                        onClick={() => setIsCreatingParent(true)}

                        className="bg-gray-800 hover:bg-gray-900 text-white"

                      >

                        <Plus className="w-4 h-4 mr-2" />

                        Create New Pack

                      </Button>

                    </div>

                  </div>

                </CardContent>

              </Card>

            ) : (

              <ISQMDocumentManager parentId={selectedParent} />

            )}

          </TabsContent>



          <TabsContent value="analytics" className="space-y-6 mt-6">

            {!selectedParent ? (

              <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">

                <CardContent className="p-12 text-center">

                  <div className="flex flex-col items-center gap-4">

                    <div className="p-4 bg-gray-100 rounded-full">

                      <TrendingUp className="w-8 h-8 text-gray-600" />

                    </div>

                    <div>

                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No ISQM Pack Selected</h3>

                      <p className="text-gray-600 mb-4">Please select an ISQM pack to view analytics and reports.</p>

                      <Button 

                        onClick={() => setIsCreatingParent(true)}

                        className="bg-gray-800 hover:bg-gray-900 text-white"

                      >

                        <Plus className="w-4 h-4 mr-2" />

                        Create New Pack

                      </Button>

                    </div>

                  </div>

                </CardContent>

              </Card>

            ) : (

              <ISQMAnalytics parentId={selectedParent} />

            )}

          </TabsContent>

        </Tabs>

              </div>
              


      {/* Dialogs */}
      <CreateParentDialog
        isOpen={isCreatingParent}
        onClose={() => setIsCreatingParent(false)}
        onCreate={createNewParent}
        newParent={newParent}
        onUpdateParent={(updates) => setNewParent(prev => ({ ...prev, ...updates }))}
      />

      <EditParentDialog
        editingParent={editingParent}
        onClose={() => setEditingParent(null)}
        onSave={handleSaveParent}
        onUpdateParent={(updates) => setEditingParent(prev => prev ? { ...prev, ...updates } : null)}
      />

      <EditQuestionnaireDialog
        editingQuestionnaire={editingQuestionnaire}
        onClose={() => setEditingQuestionnaire(null)}
        onSave={handleSaveQuestionnaire}
        onUpdateQuestionnaire={(updates) => setEditingQuestionnaire(prev => prev ? { ...prev, ...updates } : null)}
      />

      <EditSectionDialog
        isOpen={editSectionDialog.isOpen}
        questionnaireId={editSectionDialog.questionnaireId}
        sectionIndex={editSectionDialog.sectionIndex}
        currentHeading={editSectionDialog.currentHeading}
        onClose={() => setEditSectionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, currentHeading: '' })}
        onSave={handleSaveSectionHeading}
        onUpdateHeading={(heading) => setEditSectionDialog(prev => ({ ...prev, currentHeading: heading }))}
      />

      <AddSectionNoteDialog
        isOpen={addSectionNoteDialog.isOpen}
        questionnaireId={addSectionNoteDialog.questionnaireId}
        sectionIndex={addSectionNoteDialog.sectionIndex}
        note={addSectionNoteDialog.note}
        onClose={() => setAddSectionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, note: '' })}
        onSave={handleSaveSectionNote}
        onUpdateNote={(note) => setAddSectionNoteDialog(prev => ({ ...prev, note }))}
      />

      <EditQuestionDialog
        isOpen={editQuestionDialog.isOpen}
        questionnaireId={editQuestionDialog.questionnaireId}
        sectionIndex={editQuestionDialog.sectionIndex}
        questionIndex={editQuestionDialog.questionIndex}
        currentQuestion={editQuestionDialog.currentQuestion}
        onClose={() => setEditQuestionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, currentQuestion: '' })}
        onSave={handleSaveQuestion}
        onUpdateQuestion={(question) => setEditQuestionDialog(prev => ({ ...prev, currentQuestion: question }))}
      />

      <AddQuestionNoteDialog
        isOpen={addQuestionNoteDialog.isOpen}
        questionnaireId={addQuestionNoteDialog.questionnaireId}
        sectionIndex={addQuestionNoteDialog.sectionIndex}
        questionIndex={addQuestionNoteDialog.questionIndex}
        note={addQuestionNoteDialog.note}
        onClose={() => setAddQuestionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, note: '' })}
        onSave={handleSaveQuestionNote}
        onUpdateNote={(note) => setAddQuestionNoteDialog(prev => ({ ...prev, note }))}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        type={deleteConfirmDialog.type}
        title={deleteConfirmDialog.title}
        message={deleteConfirmDialog.message}
        onClose={() => setDeleteConfirmDialog({ isOpen: false, type: 'parent', title: '', message: '', onConfirm: () => {} })}
        onConfirm={deleteConfirmDialog.onConfirm}
              />

      {/* Policy Analysis Dialog */}
      {policyAnalysisDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Policy Analysis - {policyAnalysisDialog.sectionHeading}</h2>
              <button
                onClick={handleClosePolicyAnalysis}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Policy Input Section */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Upload Policy Document or Enter Text</h3>
                
                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDF Policy Document
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePolicyFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {policyFile && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ Selected: {policyFile.name}
                    </p>
                  )}
                </div>

                {/* Text Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or Enter Policy Text
                  </label>
                  <textarea
                    value={policyText}
                    onChange={(e) => setPolicyText(e.target.value)}
                    placeholder="Paste your policy text here..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!policyFile}
                  />
                </div>

                <Button
                  onClick={handleAnalyzePolicy}
                  disabled={isAnalyzing || (!policyFile && !policyText.trim())}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing Policy...' : 'Analyze Policy & Generate Answers'}
                </Button>
              </div>

              {/* Analysis Results */}
              {analysisResults && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Analysis Results</h3>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{analysisResults.summary.implemented}</div>
                      <div className="text-sm text-green-700">Implemented</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{analysisResults.summary.partiallyImplemented}</div>
                      <div className="text-sm text-yellow-700">Partially Implemented</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{analysisResults.summary.notImplemented}</div>
                      <div className="text-sm text-red-700">Not Implemented</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{analysisResults.summary.errors}</div>
                      <div className="text-sm text-gray-700">Errors</div>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-4">
                    {analysisResults.generatedAnswers.map((result: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{result.question}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.status === 'Implemented' ? 'bg-green-100 text-green-800' :
                            result.status === 'Partially Implemented' ? 'bg-yellow-100 text-yellow-800' :
                            result.status === 'Not Implemented' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{result.answer}</p>
                        {result.policyReferences && result.policyReferences.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs font-medium text-gray-500">Policy References:</span>
                            <ul className="text-xs text-gray-600 list-disc list-inside">
                              {result.policyReferences.map((ref: string, i: number) => (
                                <li key={i}>{ref}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.gaps && result.gaps.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Gaps:</span>
                            <ul className="text-xs text-red-600 list-disc list-inside">
                              {result.gaps.map((gap: string, i: number) => (
                                <li key={i}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
            </div>

  );

};



export default ISQMQuestionnairePage;


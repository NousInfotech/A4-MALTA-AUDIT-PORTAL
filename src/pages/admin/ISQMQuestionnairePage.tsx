import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ISQMPolicyGenerator, ISQMDocumentManager, ISQMAnalytics } from '@/components/isqm';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Send, 
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  ArrowRight,
  Sparkles,
  Target,
  Shield,
  BookOpen,
  TrendingUp,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useISQM, ISQMParent, ISQMQuestionnaire, ISQMSection, ISQMQuestion } from '@/hooks/useISQM';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';

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
  
  // Debounce timer for answer updates
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
        <EnhancedLoader variant="pulse" size="lg" text="Loading ISQM packs..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold">ISQM Questionnaire</h1>
                    <p className="text-blue-100 text-lg">Quality Management Assessment System</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
                    <Target className="w-4 h-4" />
                    <span>Level 1: Categories</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>Level 2: Policy Generation</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
                    <Users className="w-4 h-4" />
                    <span>Level 3: Q&A</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => setIsCreatingParent(true)}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Pack
                </Button>
                <Button 
                  onClick={downloadQuestionnaire} 
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                  disabled={!currentParent}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button 
                  onClick={handleGeneratePolicy}
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                  disabled={!currentParent}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Policy
                </Button>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Parent Selection */}
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Select ISQM Pack</h3>
                <p className="text-sm text-muted-foreground">Choose an existing pack or create a new one</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <select
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
                className="flex-1 border-2 border-gray-200 focus:border-blue-400 rounded-xl px-4 py-2"
              >
                <option value="">Select an ISQM Pack...</option>
                {parents.map((parent) => (
                  <option key={parent._id} value={parent._id}>
                    {parent.metadata.title} ({parent.status}) - {parent.completionStats.completionPercentage.toFixed(1)}% Complete
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsCreatingParent(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
                
                {selectedParent && (
                  <>
                    <Button 
                      onClick={() => handleEditParent(selectedParent)}
                      variant="outline"
                      className="hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {isAdmin && (
                      <Button 
                        onClick={() => handleDeleteParent(selectedParent)}
                        variant="outline"
                        className="hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Enhanced Progress Section */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Assessment Progress</h3>
                  <p className="text-sm text-muted-foreground">Track your questionnaire completion</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Progress value={progress} className="h-3 bg-gray-200" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Started</span>
                <span>In Progress</span>
                <span>Completed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Workflow Progress */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-blue-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                  activeTab === "questionnaire" 
                    ? "bg-blue-500 text-white shadow-lg scale-105" 
                    : "bg-white text-gray-600 shadow-md hover:shadow-lg"
                  }`}>
                    <Play className={`w-4 h-4 ${activeTab === "questionnaire" ? "text-white" : "text-blue-600"}`} />
                  <div className="text-sm font-semibold">Questionnaire</div>
                </div>
                
                <ArrowRight className="w-4 h-4 text-gray-400" />
                
                <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                  activeTab === "policy-generator" 
                    ? "bg-green-500 text-white shadow-lg scale-105" 
                    : "bg-white text-gray-600 shadow-md hover:shadow-lg"
                  }`}>
                    <Sparkles className={`w-4 h-4 ${activeTab === "policy-generator" ? "text-white" : "text-green-600"}`} />
                  <div className="text-sm font-semibold">Policies</div>
                  </div>
                
                <ArrowRight className="w-4 h-4 text-gray-400" />
                
                <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                  activeTab === "documents" 
                    ? "bg-purple-500 text-white shadow-lg scale-105" 
                    : "bg-white text-gray-600 shadow-md hover:shadow-lg"
                }`}>
                  <FileText className={`w-4 h-4 ${activeTab === "documents" ? "text-white" : "text-purple-600"}`} />
                  <div className="text-sm font-semibold">Documents</div>
                  </div>
                
                <ArrowRight className="w-4 h-4 text-gray-400" />
                
                <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                  activeTab === "analytics" 
                    ? "bg-orange-500 text-white shadow-lg scale-105" 
                    : "bg-white text-gray-600 shadow-md hover:shadow-lg"
                }`}>
                  <TrendingUp className={`w-4 h-4 ${activeTab === "analytics" ? "text-white" : "text-orange-600"}`} />
                  <div className="text-sm font-semibold">Analytics</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">
                  {activeTab === "questionnaire" ? "Answer questions to proceed" : 
                   activeTab === "policy-generator" ? "Generate policies from answers" :
                   activeTab === "documents" ? "Manage supporting documents" :
                   "View analytics and reports"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Complete workflow: Questionnaire → Policies → Documents → Analytics
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-1">
            <TabsTrigger 
              value="questionnaire" 
              className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                <span>Questionnaire</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="policy-generator"
              className="rounded-xl data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Policy Generator</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="documents"
              className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Documents</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Analytics</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questionnaire" className="space-y-6 mt-6">
            {!selectedParent ? (
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-blue-100 rounded-full">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No ISQM Pack Selected</h3>
                      <p className="text-gray-600 mb-4">Please select an existing ISQM pack or create a new one to start working on questionnaires.</p>
                      <Button 
                        onClick={() => setIsCreatingParent(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Pack
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : loading ? (
              <div className="flex items-center justify-center h-64">
                <EnhancedLoader variant="pulse" size="lg" text="Loading questionnaires..." />
              </div>
            ) : questionnaires.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-yellow-100 rounded-full">
                      <AlertCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No Questionnaires Found</h3>
                      <p className="text-gray-600">This ISQM pack doesn't have any questionnaires yet.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              questionnaires.map((questionnaire) => (
                <Card key={questionnaire._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle 
                    className="flex items-center justify-between cursor-pointer group hover:bg-blue-50/50 p-4 rounded-2xl transition-all duration-300"
                      onClick={() => toggleCategory(questionnaire._id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg">
                        L1
                      </div>
                      <div>
                          <span className="text-xl font-semibold">{questionnaire.heading}</span>
                        <div className="text-sm text-muted-foreground mt-1">
                            {questionnaire.sections.length} sections • {questionnaire.stats.totalQuestions} questions
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {questionnaire.stats.answeredQuestions} answered
                      </Badge>
                        <Badge variant="outline" className={`${
                          questionnaire.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                          questionnaire.status === 'in-progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {questionnaire.status}
                        </Badge>
                        
                        {/* CRUD Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditQuestionnaire(questionnaire);
                            }}
                            className="h-8 w-8 p-0 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestionnaire(questionnaire._id);
                              }}
                              className="h-8 w-8 p-0 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportQuestionnaire(questionnaire._id);
                            }}
                            className="h-8 w-8 p-0 hover:bg-green-50"
                          >
                            <Download className="w-4 h-4 text-green-600" />
                          </Button>
                        </div>
                        
                        {expandedCategories.has(questionnaire._id) ? (
                        <ChevronDown className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                  {expandedCategories.has(questionnaire._id) && (
                <CardContent className="space-y-4">
                      {questionnaire.sections.map((section, sectionIdx) => {
                        const sectionKey = `${questionnaire._id}-${sectionIdx}`;
                    return (
                      <Card key={sectionIdx} className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-green-50/30">
                        <CardHeader className="pb-3">
                          <CardTitle 
                            className="text-lg flex items-center justify-between cursor-pointer group hover:bg-green-50/50 p-3 rounded-xl transition-all duration-300"
                            onClick={() => toggleSection(sectionKey)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-md">
                                L2
                              </div>
                              <div>
                                <span className="font-semibold">{section.heading}</span>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {section.qna.filter(q => q.answer.trim() !== "").length} of {section.qna.length} answered
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {section.qna.length} Questions
                              </Badge>
                              {/* Section CRUD Actions */}
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSectionHeading(questionnaire._id, sectionIdx, section.heading);
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-blue-50"
                                >
                                  <Edit className="w-3 h-3 text-blue-600" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSection(questionnaire._id, sectionIdx, section.heading);
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddSectionNote(questionnaire._id, sectionIdx);
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-green-50"
                                >
                                  <Edit className="w-3 h-3 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Clear all answers in this section?')) {
                                      section.qna.forEach((q, qIdx) => {
                                        handleAnswerUpdate(questionnaire._id, sectionIdx, qIdx, '');
                                      });
                                    }
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-orange-50"
                                >
                                  <XCircle className="w-3 h-3 text-orange-600" />
                                </Button>
                                {/* Save Section Button */}
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveSection(questionnaire._id, sectionIdx);
                                  }}
                                  className="h-7 px-3 bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                              </div>
                              {expandedSections.has(sectionKey) ? (
                                <ChevronDown className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        {expandedSections.has(sectionKey) && (
                          <CardContent className="space-y-4">
                                {section.qna.map((q, questionIdx) => {
                                  const answerKey = `${questionnaire._id}-${sectionIdx}-${questionIdx}`;
                                  const isSaving = savingAnswers.has(answerKey);
                                  
                                  return (
                              <Card key={questionIdx} className="bg-gradient-to-r from-white to-purple-50/30 border-0 shadow-sm hover:shadow-md transition-all duration-300">
                                <CardContent className="p-6">
                                  <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                      <div className="flex-1 space-y-3">
                                        <div className="flex items-start gap-3">
                                          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-md flex-shrink-0 mt-1">
                                            L3
                                          </div>
                                          <div className="flex-1">
                                            <p className="font-semibold text-gray-800 leading-relaxed">
                                              Q{questionIdx + 1}: {q.question}
                                            </p>
                                            {/* Question CRUD Actions */}
                                            <div className="flex items-center gap-1 mt-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditQuestion(questionnaire._id, sectionIdx, questionIdx, q.question);
                                                }}
                                                className="h-6 w-6 p-0 hover:bg-blue-50"
                                              >
                                                <Edit className="w-3 h-3 text-blue-600" />
                                              </Button>
                                              {isAdmin && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteQuestion(questionnaire._id, sectionIdx, questionIdx, q.question);
                                                  }}
                                                  className="h-6 w-6 p-0 hover:bg-red-50"
                                                >
                                                  <Trash2 className="w-3 h-3 text-red-600" />
                                                </Button>
                                              )}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleAddQuestionNote(questionnaire._id, sectionIdx, questionIdx);
                                                }}
                                                className="h-6 w-6 p-0 hover:bg-green-50"
                                              >
                                                <Edit className="w-3 h-3 text-green-600" />
                                              </Button>
                                          </div>
                                        </div>
                                        </div>
                                              <div className="relative">
                                        <Textarea
                                          placeholder="Enter your detailed answer here..."
                                          value={localAnswers.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.answer}
                                                  onChange={(e) => handleAnswerUpdate(questionnaire._id, sectionIdx, questionIdx, e.target.value)}
                                          className="min-h-[100px] border-2 border-gray-200 focus:border-purple-400 rounded-xl resize-none transition-colors duration-300"
                                                  disabled={isSaving}
                                                />
                                                {(savingAnswers.has(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) || pendingSaves.has(`${questionnaire._id}-${sectionIdx}-${questionIdx}`)) && (
                                                  <div className="absolute top-2 right-2">
                                                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                                                  </div>
                                                )}
                                              </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-3 min-w-[200px]">
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                          <div className="flex items-center space-x-3 mb-3">
                                            <Checkbox
                                                    id={`implemented-${questionnaire._id}-${sectionIdx}-${questionIdx}`}
                                              checked={localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state}
                                                    onCheckedChange={(checked) => handleStateUpdate(questionnaire._id, sectionIdx, questionIdx, checked as boolean)}
                                              className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                                    disabled={isSaving}
                                            />
                                            <label 
                                                    htmlFor={`implemented-${questionnaire._id}-${sectionIdx}-${questionIdx}`}
                                              className="text-sm font-semibold text-gray-700 cursor-pointer"
                                            >
                                              Implementation Status
                                            </label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {(localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state) ? (
                                              <CheckCircle className="w-5 h-5 text-green-600" />
                                            ) : (
                                              <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                            <span className={`text-sm font-medium ${(localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state) ? "text-green-700" : "text-red-600"}`}>
                                              {(localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state) ? "Implemented" : "Not Implemented"}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {(localAnswers.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.answer).trim() !== "" && (
                                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                                            <div className="flex items-center gap-2 text-blue-700">
                                              <Clock className="w-4 h-4" />
                                              <span className="text-xs font-medium">Answer Length: {(localAnswers.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.answer).length} characters</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                                  );
                                })}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </CardContent>
              )}
            </Card>
              ))
            )}
        </TabsContent>

          <TabsContent value="policy-generator" className="space-y-6 mt-6">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-xl">
                      <Send className="w-6 h-6 text-green-600" />
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
                      className="flex-1 border-2 border-gray-200 focus:border-green-400 rounded-xl"
                    />
                    <Button 
                      onClick={sendToAuditor} 
                      disabled={!selectedAuditor}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 rounded-xl shadow-lg disabled:opacity-50"
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
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 overflow-hidden">
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
                      <div className="p-4 bg-yellow-100 rounded-full">
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
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
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-purple-100 rounded-full">
                      <FileText className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No ISQM Pack Selected</h3>
                      <p className="text-gray-600 mb-4">Please select an ISQM pack to manage supporting documents.</p>
                      <Button 
                        onClick={() => setIsCreatingParent(true)}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
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
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-orange-100 rounded-full">
                      <TrendingUp className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No ISQM Pack Selected</h3>
                      <p className="text-gray-600 mb-4">Please select an ISQM pack to view analytics and reports.</p>
                      <Button 
                        onClick={() => setIsCreatingParent(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
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

      {/* Global Create Parent Dialog - Available in all tabs */}
      {isCreatingParent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <Plus className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Create New ISQM Pack</h3>
                    <p className="text-sm text-muted-foreground">Create a new ISQM Quality Management Pack</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreatingParent(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Default Pack Configuration</span>
                </div>
                <p className="text-sm text-blue-600">
                  This will create a new ISQM pack with ISQM 1, ISQM 2, and ISA 220 (Revised) questionnaires 
                  containing all standard questions from the IAASB framework.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pack Title</label>
                  <Input
                    value={newParent.title}
                    onChange={(e) => setNewParent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter pack title..."
                    className="border-2 border-gray-200 focus:border-blue-400 rounded-xl"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                  <Input
                    value={newParent.version}
                    onChange={(e) => setNewParent(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="Enter version..."
                    className="border-2 border-gray-200 focus:border-blue-400 rounded-xl"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
                  <Textarea
                    value={newParent.jurisdiction}
                    onChange={(e) => setNewParent(prev => ({ ...prev, jurisdiction: e.target.value }))}
                    placeholder="Enter jurisdiction information..."
                    className="border-2 border-gray-200 focus:border-blue-400 rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={createNewParent}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pack
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreatingParent(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Parent Dialog */}
      {editingParent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit ISQM Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editingParent.metadata.title}
                  onChange={(e) => setEditingParent({
                    ...editingParent,
                    metadata: { ...editingParent.metadata, title: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Version</label>
                <Input
                  value={editingParent.metadata.version}
                  onChange={(e) => setEditingParent({
                    ...editingParent,
                    metadata: { ...editingParent.metadata, version: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Jurisdiction</label>
                <Textarea
                  value={editingParent.metadata.jurisdiction_note}
                  onChange={(e) => setEditingParent({
                    ...editingParent,
                    metadata: { ...editingParent.metadata, jurisdiction_note: e.target.value }
                  })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={handleSaveParent}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditingParent(null)}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Edit Questionnaire Dialog */}
      {editingQuestionnaire && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Questionnaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Heading</label>
                <Input
                  value={editingQuestionnaire.heading}
                  onChange={(e) => setEditingQuestionnaire({
                    ...editingQuestionnaire,
                    heading: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editingQuestionnaire.description}
                  onChange={(e) => setEditingQuestionnaire({
                    ...editingQuestionnaire,
                    description: e.target.value
                  })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={handleSaveQuestionnaire}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditingQuestionnaire(null)}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Edit Section Heading Dialog */}
      <Dialog open={editSectionDialog.isOpen} onOpenChange={(open) => !open && setEditSectionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, currentHeading: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section Heading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Section Heading</label>
              <Input
                value={editSectionDialog.currentHeading}
                onChange={(e) => setEditSectionDialog(prev => ({ ...prev, currentHeading: e.target.value }))}
                placeholder="Enter section heading..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSectionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, currentHeading: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveSectionHeading}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Section Note Dialog */}
      <Dialog open={addSectionNoteDialog.isOpen} onOpenChange={(open) => !open && setAddSectionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, note: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={addSectionNoteDialog.note}
                onChange={(e) => setAddSectionNoteDialog(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Enter section note..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSectionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, note: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveSectionNote}>
              <Save className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={editQuestionDialog.isOpen} onOpenChange={(open) => !open && setEditQuestionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, currentQuestion: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Question Text</label>
              <Textarea
                value={editQuestionDialog.currentQuestion}
                onChange={(e) => setEditQuestionDialog(prev => ({ ...prev, currentQuestion: e.target.value }))}
                placeholder="Enter question text..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditQuestionDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, currentQuestion: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Note Dialog */}
      <Dialog open={addQuestionNoteDialog.isOpen} onOpenChange={(open) => !open && setAddQuestionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, note: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={addQuestionNoteDialog.note}
                onChange={(e) => setAddQuestionNoteDialog(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Enter question note..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddQuestionNoteDialog({ isOpen: false, questionnaireId: '', sectionIndex: -1, questionIndex: -1, note: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestionNote}>
              <Save className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.isOpen} onOpenChange={(open) => !open && setDeleteConfirmDialog({ isOpen: false, type: 'parent', title: '', message: '', onConfirm: () => {} })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              {deleteConfirmDialog.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">{deleteConfirmDialog.message}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">This action cannot be undone.</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmDialog({ isOpen: false, type: 'parent', title: '', message: '', onConfirm: () => {} })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteConfirmDialog.onConfirm}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ISQMQuestionnairePage;

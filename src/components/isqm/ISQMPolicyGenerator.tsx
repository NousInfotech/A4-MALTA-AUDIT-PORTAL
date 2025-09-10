import React, { useState, useMemo } from "react";
import { FileText } from "lucide-react";

// Type definitions for the ISQM data structure
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
}

interface ISQMData {
  metadata: Metadata;
  ISQM_1: ISQMPack;
  ISQM_2: ISQMPack;
  ISA_220_Revised: ISQMPack;
}

interface GenerationOptions {
  useAnswersInPolicy: boolean;
  includeUnanswered: boolean;
  includeStatesInProcedures: boolean;
  includeAppendixQA: boolean;
}

interface ActiveDocument {
  name: string;
  content: string;
}

// Hard-coded ISQM questionnaire pack
const ISQM_DATA: ISQMData = {
  "metadata": {
    "title": "ISQM Questionnaire Pack (Hard-Coded)",
    "version": "2025-09-06-EU-MLT",
    "jurisdiction_note": "IAASB ISQM 1 & ISQM 2 and ISA 220 (Revised); includes EU Reg. 537/2014 and Malta Accountancy Board overlays."
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
            "question": "Are governance arrangements in place for oversight (e.g., quality committee, reporting lines, KPIs)?",
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
            "question": "Are quality risks tailored to the firm's nature and circumstances (size, complexity, industries, PIEs/LCEs, technologies, networks)?",
            "answer": "",
            "state": false
          },
          {
            "question": "Have responses (policies, procedures, controls) been designed and implemented to address each assessed quality risk?",
            "answer": "",
            "state": false
          },
          {
            "question": "Are responses integrated with firm workflows and technology (methodology, tools, templates, data governance)?",
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
            "question": "Are quality objectives established for compliance with relevant ethical requirements (incl. independence)?",
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
            "question": "Are systems in place to track financial interests, relationships, employment, and long association/cooling‑off requirements?",
            "answer": "",
            "state": false
          },
          {
            "question": "Are potential/actual breaches captured, evaluated, remediated, and subjected to root‑cause analysis?",
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
            "question": "Are conflicting or unusual terms assessed (scope limitations, restrictions on access to records, unrealistic deadlines/fees)?",
            "answer": "",
            "state": false
          },
          {
            "question": "Are decisions, including declinations and withdrawals, documented with rationale and approvals?",
            "answer": "",
            "state": false
          },
          {
            "question": "Where information arises post‑acceptance that would have led to decline, are procedures in place to reassess continuance, consider reporting obligations, and possible withdrawal?",
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
            "question": "Are criteria and protocols defined for consultation on difficult or contentious matters, with documentation and implementation of conclusions?",
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
            "question": "Does the firm identify, capture, and use quality‑relevant information from internal and external sources?",
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
            "question": "Are ongoing and periodic monitoring activities designed (e.g., in‑flight monitoring, cold file reviews, thematic reviews, KPIs)?",
            "answer": "",
            "state": false
          },
          {
            "question": "Are findings evaluated to determine whether deficiencies exist, individually or in aggregate?",
            "answer": "",
            "state": false
          },
          {
            "question": "Is root‑cause analysis performed for deficiencies, with designed remedial actions and owners/due dates?",
            "answer": "",
            "state": false
          },
          {
            "question": "Is the effectiveness of remedial actions tracked and re‑tested?",
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
            "question": "Confirm policies address EU Reg. 537/2014 PIE requirements: auditor rotation/maximum tenure, tendering (where applicable), long‑association/cooling‑off, prohibited non‑audit services, and fee dependency thresholds (with monitoring and safeguards).",
            "answer": "",
            "state": false
          },
          {
            "question": "Confirm the firm evaluates and documents independence, long‑association and NAS restrictions specifically for PIE engagements in Malta, and communicates required matters to TCWG.",
            "answer": "",
            "state": false
          },
          {
            "question": "Confirm Malta Accountancy Board quality assurance expectations are integrated: periodic external reviews, remediation tracking, and timely responses to findings (with root‑cause analysis and evidence of implementation).",
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
            "question": "Has the firm defined criteria to determine when an EQR is required (e.g., listed/PIE audits, high‑risk engagements, first‑year audits, significant judgements)?",
            "answer": "",
            "state": false
          },
          {
            "question": "Are criteria responsive to the firm's quality risks and regularly re‑assessed?",
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
            "question": "Are eligibility criteria established (including cooling‑off for former engagement partners and restrictions on consultation that could impair objectivity)?",
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
            "question": "Are inter‑firm and component auditor communications clear, timely, and documented (group instructions, component findings)?",
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
            "question": "Was the final audit file assembled on time and were changes after the report date controlled and documented?",
            "answer": "",
            "state": false
          }
        ]
      }
    ]
  }
};

interface ISQMPolicyGeneratorProps {
  questionnaireData?: ISQMData;
}

export default function ISQMPolicyGenerator({ questionnaireData }: ISQMPolicyGeneratorProps): JSX.Element {
  const [data] = useState<ISQMData>(questionnaireData || ISQM_DATA);
  const [activeDoc, setActiveDoc] = useState<ActiveDocument>({ name: "", content: "" });
  const [options, setOptions] = useState<GenerationOptions>({
    useAnswersInPolicy: true,
    includeUnanswered: true,
    includeStatesInProcedures: true,
    includeAppendixQA: false,
  });

  // Debug logging
  console.log('Policy Generator Data:', data);
  console.log('Questionnaire Data Passed:', questionnaireData);

  const sanitize = (s: string | undefined): string => (s || "").toString().replace(/\s+/g, " ").trim();
  
  const packs = useMemo(() => {
    console.log('Processing packs from data:', data);
    const entries = Object.entries(data).filter(([k, v]) => typeof v === "object" && v && "sections" in v);
    console.log('Filtered entries:', entries);
    
    const result = entries.map(([key, pack]) => ({ 
      key, 
      heading: (pack as ISQMPack).heading || key, 
      sections: (pack as ISQMPack).sections || [] 
    }));
    
    console.log('Processed packs:', result);
    return result;
  }, [data]);

  const buildSectionDoc = ({ type, packKey, sectionIdx }: { type: "policy" | "procedures"; packKey: string; sectionIdx: number }): void => {
    console.log('Building document:', { type, packKey, sectionIdx });
    
    const pack = data[packKey as keyof ISQMData] as ISQMPack;
    const section = pack?.sections?.[sectionIdx];
    
    console.log('Pack found:', pack);
    console.log('Section found:', section);
    
    if (!section) {
      console.error('Section not found:', { packKey, sectionIdx, availableSections: pack?.sections?.length });
      alert('Section not found. Please try again.');
      return;
    }
    
    const now = new Date().toISOString().split("T")[0];
    const title = `${pack.heading} — ${section.heading}`;

    const qna = (section.qna || []).filter(q => options.includeUnanswered || sanitize(q.answer).length > 0);
    
    console.log('Q&A data:', qna);

    const policyStatements = qna.map((q) => {
      const base = `- The firm shall ${sanitize(q.question).replace(/^(Has|Have|Are|Is|Do|Does)\s+/i, "").replace(/\?$/, "").replace(/^confirm\s+/i, "ensure ")}`;
      if (options.useAnswersInPolicy && sanitize(q.answer)) {
        return `${base} (Current implementation: ${sanitize(q.answer)}).`;
      }
      return `${base}.`;
    }).join("\n");

    const procedureSteps = qna.map((q, i) => {
      const parts: string[] = [];
      parts.push(`${i + 1}. Address: ${sanitize(q.question)}`);
      if (options.includeStatesInProcedures && typeof q.state === "boolean") {
        parts.push(`   - Status: ${q.state ? "✔ Implemented" : "✖ Not implemented"}`);
      }
      if (sanitize(q.answer)) {
        parts.push(`   - Evidence/Notes: ${sanitize(q.answer)}`);
      }
      return parts.join("\n");
    }).join("\n");

    const appendix = options.includeAppendixQA
      ? `\n\n## Appendix — Q&A\n` + qna.map((q, i) => `**Q${i + 1}. ${sanitize(q.question)}**\n\nA: ${sanitize(q.answer) || "(no answer)"}\n`).join("\n")
      : "";

    const baseHeader = `# ${title}\n\n`+
      `**Document type:** ${type === "policy" ? "Policy" : "Procedures"}  \n`+
      `**Version:** 1.0  \n`+
      `**Effective date:** ${now}  \n`+
      `**Owner:** Quality Leader / Compliance Principal  \n`+
      `**Related Standards:** ${sanitize(pack.heading)}  \n`;

    const body = type === "policy"
      ? `\n## Purpose\nTo set out the firm's policy for "${sanitize(section.heading)}" in line with ${sanitize(pack.heading)}.\n\n`+
        `## Scope\nAll engagements and personnel within scope of ${sanitize(pack.heading)}.\n\n`+
        `## Policy Statements\n${policyStatements}\n\n`+
        `## Roles & Responsibilities\n- Leadership: Set tone, allocate resources, approve this policy.\n- Quality Leader: Maintain SOQM documentation, monitor operation.\n- Engagement Partners: Implement requirements within engagements.\n\n`+
        `## Monitoring & Review\n- Include this policy in ongoing/periodic monitoring. Perform root-cause analysis for deficiencies and update accordingly.\n\n`+
        `## Records\n- Maintain documentation linking risks, responses, monitoring, consultations, and EQR conclusions as applicable.${appendix}\n`
      : `\n## Overview\nThis procedure translates ${sanitize(pack.heading)} requirements into actionable steps for "${sanitize(section.heading)}".\n\n`+
        `## Steps\n${procedureSteps}\n\n`+
        `## Evidence & Records\n- Retain approvals, training logs, independence confirmations, consultations, and EQR documentation as applicable.\n\n`+
        `## Review Frequency\n- Review at least annually or upon regulatory/firm changes.${appendix}\n`;

    const content = baseHeader + body;
    const safeName = `${sanitize(section.heading).replace(/[^a-z0-9\-\s]/gi, "").slice(0,80)} — ${type}.md`;
    
    console.log('Generated document:', { name: safeName, contentLength: content.length });
    setActiveDoc({ name: safeName, content });
  };

  const buildFullManual = (): void => {
    const now = new Date().toISOString().split("T")[0];
    const metaTitle = sanitize(data?.metadata?.title || "ISQM Questionnaire Pack");
    const metaVersion = sanitize(data?.metadata?.version || "1.0");

    let md = `# ${metaTitle} — Policies Manual\n\n`+
      `**Version:** ${metaVersion}  \n`+
      `**Generated:** ${now}  \n`+
      `**Includes:** Policies derived from completed procedures (ISQM 1, ISQM 2, ISA 220 (Revised)).\n\n`+
      `## Table of Contents\n`;

    packs.forEach((p) => {
      md += `- [${sanitize(p.heading)}](#${slug(p.heading)})\n`;
      p.sections.forEach((s) => {
        md += `  - [${sanitize(s.heading)}](#${slug(p.heading)}-${slug(s.heading)})\n`;
      });
    });

    packs.forEach((p) => {
      md += `\n\n---\n\n# ${sanitize(p.heading)}\n\n<a id="${slug(p.heading)}"></a>\n`;
      p.sections.forEach((s) => {
        const qna = (s.qna || []).filter(q => options.includeUnanswered || sanitize(q.answer).length > 0);
        const policies = qna.map((q) => {
          const base = `- The firm shall ${sanitize(q.question).replace(/^(Has|Have|Are|Is|Do|Does)\s+/i, "").replace(/\?$/, "").replace(/^confirm\s+/i, "ensure ")}`;
          if (options.useAnswersInPolicy && sanitize(q.answer)) {
            return `${base} (Current implementation: ${sanitize(q.answer)}).`;
          }
          return `${base}.`;
        }).join("\n");

        md += `\n\n## ${sanitize(s.heading)}\n\n<a id="${slug(p.heading)}-${slug(s.heading)}"></a>\n`+
              `### Policy Statements\n${policies}\n`;
      });
    });

    setActiveDoc({ name: `${metaTitle} — Policies Manual.md`, content: md });
  };

  const slug = (s: string): string => sanitize(s).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

  const download = (): void => {
    const blob = new Blob([activeDoc.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeDoc.name || "policy.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6" style={{ filter: 'none' }}>
      <div className="max-w-6xl mx-auto space-y-8" style={{ filter: 'none' }}>
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
              className="px-6 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105" 
              onClick={buildFullManual}
            >
              <FileText className="w-5 h-5 mr-2 inline" />
              Generate Full Manual
            </button>
            <button 
              className="px-6 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105" 
              onClick={() => {
                console.log('Test button clicked');
                console.log('Available packs:', packs);
                if (packs.length > 0 && packs[0].sections.length > 0) {
                  buildSectionDoc({ type: "policy", packKey: packs[0].key, sectionIdx: 0 });
                } else {
                  alert('No sections available to generate from');
                }
              }}
            >
              Test Policy Generation
            </button>
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Generation Options</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>
        </div>

        <div className="space-y-8">
          {packs.map((pack) => (
            <section key={pack.key} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {pack.key.charAt(pack.key.length - 1)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{pack.heading}</h2>
                  <p className="text-gray-600">{pack.sections.length} sections available</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {pack.sections.map((sec, idx) => (
                  <div key={idx} className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-300">
                          {sec.heading}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{sec.qna.length} questions</span>
                          <span>•</span>
                          <span>{sec.qna.filter(q => q.answer.trim() !== "").length} answered</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {(sec.qna || []).slice(0, 3).map((q, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-blue-600 text-sm">Q{i + 1}:</span>
                            <p className="text-sm text-gray-700 flex-1">{q.question}</p>
                          </div>
                          {typeof q.state === "boolean" && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 ${
                                q.state ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {q.state ? "✓ Implemented" : "✗ Not implemented"}
                              </span>
                            </div>
                          )}
                          {q.answer && (
                            <div className="mt-2 text-xs text-gray-500 bg-white p-2 rounded border">
                              <span className="font-medium">Answer:</span> {q.answer.substring(0, 100)}{q.answer.length > 100 ? "..." : ""}
                            </div>
                          )}
                        </div>
                      ))}
                      {(sec.qna || []).length > 3 && (
                        <div className="text-center text-gray-400 text-sm py-2">
                          + {(sec.qna || []).length - 3} more questions
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        className="flex-1 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                        onClick={() => {
                          console.log('Generate Procedures clicked for:', pack.key, idx);
                          alert(`Generating Procedures for: ${pack.key} - Section ${idx}`);
                          buildSectionDoc({ type: "procedures", packKey: pack.key, sectionIdx: idx });
                        }}
                        title="Generate Procedures (.md)"
                      >
                        Generate Procedures
                      </button>
                      <button
                        className="flex-1 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                        onClick={() => {
                          console.log('Generate Policy clicked for:', pack.key, idx);
                          alert(`Generating Policy for: ${pack.key} - Section ${idx}`);
                          buildSectionDoc({ type: "policy", packKey: pack.key, sectionIdx: idx });
                        }}
                        title="Generate Policy (.md)"
                      >
                        Generate Policy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {activeDoc.content && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border-0 overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Document Preview</h3>
                      <p className="text-blue-100 text-sm">{activeDoc.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors duration-300" 
                      onClick={() => setActiveDoc({ name: "", content: "" })}
                    >
                      Close
                    </button>
                    <button 
                      className="px-4 py-2 rounded-xl bg-white text-blue-600 hover:bg-blue-50 shadow-lg transition-all duration-300" 
                      onClick={download}
                    >
                      <FileText className="w-4 h-4 mr-2 inline" />
                      Download .md
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
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

// src/static/procedures.ts

type ProcItem = {
  id: string
  question: string
  isRequired?: boolean
  // you can add any other fields you want carried through (e.g., help, area, etc.)
}

type ProcMap = Record<string, ProcItem[]>

const procedures: ProcMap = {
  "Bank and Cash": [
    { id: "bc_1", question: "Obtain bank confirmations for all active accounts.", isRequired: true },
    { id: "bc_2", question: "Perform bank reconciliation testing for month-end and year-end balances." },
    { id: "bc_3", question: "Review unusual or large cash transfers near period end." },
  ],

  "Equity": [
    { id: "eq_1", question: "Agree share capital and reserves to the general ledger and supporting registers.", isRequired: true },
    { id: "eq_2", question: "Inspect minutes for approvals of dividends and capital changes." },
    { id: "eq_3", question: "Recompute EPS where applicable and verify disclosures." },
  ],

  "Borrowings and Loans": [
    { id: "bl_1", question: "Obtain loan confirmations and agree key terms to agreements.", isRequired: true },
    { id: "bl_2", question: "Test interest expense accruals and recompute effective interest." },
    { id: "bl_3", question: "Assess covenant compliance and evaluate classification impacts." },
  ],

  // fallback used when a classification doesn’t have entries yet
  default: [
    { id: "gen_1", question: "Document the objective and scope of the planned procedures." },
    { id: "gen_2", question: "Identify key assertions and relevant risks for this area." },
    { id: "gen_3", question: "Design tests responsive to identified risks, including sampling where relevant." },
  ],
}

export default procedures

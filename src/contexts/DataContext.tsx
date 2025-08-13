// @ts-nocheck
import React, { createContext, useContext, useState } from 'react';

export interface Client {
  id: string;
  companyName: string;
  companyNumber: string;
  email: string;
  industry: string;
  summary: string;
  createdAt: string;
  createdBy: string;
}

export interface Engagement {
  id: string;
  clientId: string;
  title: string;
  yearEndDate: string;
  status: 'draft' | 'active' | 'completed';
  trialBalanceUrl?: string;
  trialBalanceData?: TrialBalanceItem[];
  createdAt: string;
  createdBy: string;
}

export interface TrialBalanceItem {
  id: string;
  category: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
}

export interface DocumentRequest {
  id: string;
  engagementId: string;
  clientId: string;
  category: string;
  description: string;
  status: 'pending' | 'completed';
  requestedAt: string;
  completedAt?: string;
  documents?: Document[];
}

export interface Document {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface Procedure {
  id: string;
  engagementId: string;
  title: string;
  questions: ProcedureQuestion[];
  status: 'draft' | 'completed';
  createdAt: string;
}

export interface ProcedureQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface DataContextType {
  clients: Client[];
  engagements: Engagement[];
  documentRequests: DocumentRequest[];
  procedures: Procedure[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  addEngagement: (engagement: Omit<Engagement, 'id' | 'createdAt'>) => void;
  updateEngagement: (id: string, updates: Partial<Engagement>) => void;
  addDocumentRequest: (request: Omit<DocumentRequest, 'id' | 'requestedAt'>) => void;
  updateDocumentRequest: (id: string, updates: Partial<DocumentRequest>) => void;
  addProcedure: (procedure: Omit<Procedure, 'id' | 'createdAt'>) => void;
  getClientEngagements: (clientId: string) => Engagement[];
  getEngagementRequests: (engagementId: string) => DocumentRequest[];
  getEngagementProcedures: (engagementId: string) => Procedure[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data
const mockClients: Client[] = [
  {
    id: '1',
    companyName: 'Tech Solutions Ltd',
    companyNumber: 'TC123456',
    email: 'client@techsolutions.com',
    industry: 'Technology',
    summary: 'Software development and IT consulting company',
    createdAt: '2024-01-01',
    createdBy: '2'
  },
  {
    id: '2',
    companyName: 'Green Energy Corp',
    companyNumber: 'GE789012',
    email: 'contact@greenenergy.com',
    industry: 'Energy',
    summary: 'Renewable energy solutions provider',
    createdAt: '2024-01-02',
    createdBy: '2'
  }
];

const mockEngagements: Engagement[] = [
  {
    id: '1',
    clientId: '1',
    title: 'Annual Audit 2024',
    yearEndDate: '2024-12-31',
    status: 'active',
    trialBalanceUrl: 'https://docs.google.com/spreadsheets/d/example',
    trialBalanceData: [
      { id: '1', category: 'Assets', accountName: 'Cash and Bank', debitAmount: 150000, creditAmount: 0 },
      { id: '2', category: 'Assets', accountName: 'Accounts Receivable', debitAmount: 85000, creditAmount: 0 },
      { id: '3', category: 'Liabilities', accountName: 'Accounts Payable', debitAmount: 0, creditAmount: 45000 },
      { id: '4', category: 'Equity', accountName: 'Share Capital', debitAmount: 0, creditAmount: 100000 },
      { id: '5', category: 'Revenue', accountName: 'Sales Revenue', debitAmount: 0, creditAmount: 250000 },
      { id: '6', category: 'Expenses', accountName: 'Operating Expenses', debitAmount: 120000, creditAmount: 0 }
    ],
    createdAt: '2024-01-15',
    createdBy: '2'
  }
];

const mockDocumentRequests: DocumentRequest[] = [
  {
    id: '1',
    engagementId: '1',
    clientId: '1',
    category: 'Assets',
    description: 'Bank statements for all accounts',
    status: 'pending',
    requestedAt: '2024-01-20'
  },
  {
    id: '2',
    engagementId: '1',
    clientId: '1',
    category: 'Revenue',
    description: 'Sales invoices and contracts',
    status: 'completed',
    requestedAt: '2024-01-18',
    completedAt: '2024-01-22',
    documents: [
      { id: '1', name: 'Q1_Sales_Invoices.pdf', url: '#', uploadedAt: '2024-01-22' },
      { id: '2', name: 'Service_Contracts.pdf', url: '#', uploadedAt: '2024-01-22' }
    ]
  }
];

const mockProcedures: Procedure[] = [
  {
    id: '1',
    engagementId: '1',
    title: 'Cash and Bank Verification Procedures',
    status: 'completed',
    createdAt: '2024-01-25',
    questions: [
      {
        id: '1',
        question: 'Have all bank accounts been confirmed directly with the bank?',
        answer: 'Yes, confirmation letters received from all three banks.',
        category: 'Assets'
      },
      {
        id: '2',
        question: 'Are there any unusual or significant transactions near year-end?',
        answer: 'No unusual transactions identified in the final month.',
        category: 'Assets'
      }
    ]
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [engagements, setEngagements] = useState<Engagement[]>(mockEngagements);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>(mockDocumentRequests);
  const [procedures, setProcedures] = useState<Procedure[]>(mockProcedures);

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setClients(prev => [...prev, newClient]);
  };

  const addEngagement = (engagement: Omit<Engagement, 'id' | 'createdAt'>) => {
    const newEngagement: Engagement = {
      ...engagement,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setEngagements(prev => [...prev, newEngagement]);
  };

  const updateEngagement = (id: string, updates: Partial<Engagement>) => {
    setEngagements(prev => prev.map(eng => eng.id === id ? { ...eng, ...updates } : eng));
  };

  const addDocumentRequest = (request: Omit<DocumentRequest, 'id' | 'requestedAt'>) => {
    const newRequest: DocumentRequest = {
      ...request,
      id: Date.now().toString(),
      requestedAt: new Date().toISOString()
    };
    setDocumentRequests(prev => [...prev, newRequest]);
  };

  const updateDocumentRequest = (id: string, updates: Partial<DocumentRequest>) => {
    setDocumentRequests(prev => prev.map(req => req.id === id ? { ...req, ...updates } : req));
  };

  const addProcedure = (procedure: Omit<Procedure, 'id' | 'createdAt'>) => {
    const newProcedure: Procedure = {
      ...procedure,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setProcedures(prev => [...prev, newProcedure]);
  };

  const getClientEngagements = (clientId: string) => {
    return engagements.filter(eng => eng.clientId === clientId);
  };

  const getEngagementRequests = (engagementId: string) => {
    return documentRequests.filter(req => req.engagementId === engagementId);
  };

  const getEngagementProcedures = (engagementId: string) => {
    return procedures.filter(proc => proc.engagementId === engagementId);
  };

  return (
    <DataContext.Provider value={{
      clients,
      engagements,
      documentRequests,
      procedures,
      addClient,
      addEngagement,
      updateEngagement,
      addDocumentRequest,
      updateDocumentRequest,
      addProcedure,
      getClientEngagements,
      getEngagementRequests,
      getEngagementProcedures
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
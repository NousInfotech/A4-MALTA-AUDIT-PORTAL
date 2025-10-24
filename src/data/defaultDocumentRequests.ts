export interface DefaultDocument {
  id: string;
  name: string;
  type: 'direct' | 'template';
  category: string;
  description: string;
  url: string;
  previewUrl?: string;
  instruction?: string;
  required: boolean;
}

export interface DefaultDocumentRequest {
  id: string;
  name: string;
  category: string;
  description: string;
  documents: DefaultDocument[];
}

export const defaultDocumentRequests: DefaultDocumentRequest[] = [
  {
    id: 'kyc-identity',
    name: 'Identity Verification Documents',
    category: 'Identity',
    description: 'Documents required for client identity verification',
    documents: [
      {
        id: 'id-passport',
        name: 'ID/Passport',
        type: 'direct',
        category: 'Identity',
        description: 'Clear copy of passport or national ID with photo and personal details',
        url: '',
        previewUrl: '',
        required: true
      },
      {
        id: 'utility-bill',
        name: 'Utility Bill',
        type: 'direct',
        category: 'Identity',
        description: 'Recent utility bill (electricity, water, gas, or internet) as proof of address',
        url: '',
        previewUrl: '',
        required: true
      }
    ]
  },
  {
    id: 'kyc-company',
    name: 'Company Information Documents',
    category: 'Company',
    description: 'Company-related documents and declarations',
    documents: [
      {
        id: 'company-activity',
        name: 'Company Activity',
        type: 'template',
        category: 'Company',
        description: 'Document describing the company\'s business activities and operations',
        url: '/Company Activity.pdf',
        previewUrl: '/Company Activity.pdf',
        instruction: 'The file you should upload must be similar to this document. This is only for reference - do not send this back. Upload your own document that describes your company\'s business activities and operations.',
        required: true
      },
      {
        id: 'company-profile',
        name: 'Company Profile',
        type: 'template',
        category: 'Company',
        description: 'Comprehensive company profile including history, structure, and key personnel',
        url: '/Company Profile.pdf',
        previewUrl: '/Company Profile.pdf',
        instruction: 'The file you should upload must be similar to this document. This is only for reference - do not send this back. Upload your own company profile document.',
        required: true
      }
    ]
  },
  {
    id: 'kyc-wealth-compliance',
    name: 'Wealth and Compliance Documents',
    category: 'Compliance',
    description: 'Source of wealth and politically exposed person declarations',
    documents: [
      {
        id: 'source-of-wealth',
        name: 'Source of Wealth',
        type: 'template',
        category: 'Compliance',
        description: 'Document explaining the source of wealth and financial resources',
        url: '/Source of Wealth.pdf',
        previewUrl: '/Source of Wealth.pdf',
        instruction: 'The file you should upload must be similar to this document. This is only for reference - do not send this back. Upload your own document explaining your source of wealth.',
        required: true
      },
      {
        id: 'pep-declaration',
        name: 'PEP Declaration',
        type: 'template',
        category: 'Compliance',
        description: 'Politically Exposed Person declaration form',
        url: '/PEP Declaration.pdf',
        previewUrl: '/PEP Declaration.pdf',
        instruction: 'The file you should upload must be similar to this document. This is only for reference - do not send this back. Upload your own PEP declaration document.',
        required: true
      }
    ]
  }
];

// Helper function to get all documents from all requests
export const getAllDefaultDocuments = (): DefaultDocument[] => {
  return defaultDocumentRequests.flatMap(request => request.documents);
};

// Helper function to get documents by type
export const getDocumentsByType = (type: 'direct' | 'template'): DefaultDocument[] => {
  return getAllDefaultDocuments().filter(doc => doc.type === type);
};

// Helper function to get documents by category
export const getDocumentsByCategory = (category: string): DefaultDocument[] => {
  return getAllDefaultDocuments().filter(doc => doc.category === category);
};

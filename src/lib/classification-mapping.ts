// Classification ID Mapping Service
// Dynamically maps frontend classification strings to backend MongoDB ObjectIds
// by fetching or creating ClassificationSection documents

import axiosInstance from './axiosInstance';

export interface ClassificationMapping {
  [key: string]: string;
}

export interface ClassificationSection {
  _id: string;
  engagement: string;
  classification: string;
  status: 'in-progress' | 'ready-for-review' | 'reviewed-approved';
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  workingPapersId?: string;
  workingPapersUrl?: string;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

// Cache for classification mappings to avoid repeated API calls
const classificationCache: ClassificationMapping = {};

// Valid classification options from backend
const VALID_CLASSIFICATIONS = [
  "Assets > Current > Cash & Cash Equivalents",
  "Assets > Current > Trade Receivables",
  "Assets > Current > Other Receivables",
  "Assets > Current > Prepayments",
  "Assets > Current > Inventory",
  "Assets > Current > Recoverable VAT/Tax",
  "Assets > Non-current > Property, Plant & Equipment",
  "Assets > Non-current > Intangible Assets",
  "Assets > Non-current > Investments",
  "Assets > Non-current > Deferred Tax Asset",
  "Assets > Non-current > Long-term Receivables/Deposits",
  "Liabilities > Current > Trade Payables",
  "Liabilities > Current > Accruals",
  "Liabilities > Current > Taxes Payable",
  "Liabilities > Current > Short-term Borrowings/Overdraft",
  "Liabilities > Current > Other Payables",
  "Liabilities > Non-current > Borrowings (Long-term)",
  "Liabilities > Non-current > Provisions",
  "Liabilities > Non-current > Deferred Tax Liability",
  "Liabilities > Non-current > Lease Liabilities",
  "Equity > Share Capital",
  "Equity > Share Premium",
  "Equity > Reserves",
  "Equity > Retained Earnings",
  "Income > Operating > Revenue (Goods)",
  "Income > Operating > Revenue (Services)",
  "Income > Operating > Other Operating Income",
  "Income > Non-operating > Other Income",
  "Income > Non-operating > FX Gains",
  "Expenses > Cost of Sales > Materials/Purchases",
  "Expenses > Cost of Sales > Freight Inwards",
  "Expenses > Cost of Sales > Manufacturing Labour",
  "Expenses > Cost of Sales > Production Overheads",
  "Expenses > Direct Costs",
  "Expenses > Administrative Expenses > Payroll",
  "Expenses > Administrative Expenses > Rent & Utilities",
  "Expenses > Administrative Expenses > Office/Admin",
  "Expenses > Administrative Expenses > Marketing",
  "Expenses > Administrative Expenses > Repairs & Maintenance",
  "Expenses > Administrative Expenses > IT & Software",
  "Expenses > Administrative Expenses > Insurance",
  "Expenses > Administrative Expenses > Professional Fees",
  "Expenses > Administrative Expenses > Depreciation & Amortisation",
  "Expenses > Administrative Expenses > Research & Development",
  "Expenses > Administrative Expenses > Lease Expenses",
  "Expenses > Administrative Expenses > Bank Charges",
  "Expenses > Administrative Expenses > Travel & Entertainment",
  "Expenses > Administrative Expenses > Training & Staff Welfare",
  "Expenses > Administrative Expenses > Telephone & Communication",
  "Expenses > Administrative Expenses > Subscriptions & Memberships",
  "Expenses > Administrative Expenses > Bad Debt Written Off",
  "Expenses > Administrative Expenses > Stationery & Printing",
  "Expenses > Finance Costs",
  "Expenses > Other > FX Losses",
  "Expenses > Other > Exceptional/Impairment",
];

/**
 * Get or create MongoDB ObjectId for a classification string
 * @param classificationString - The classification string from frontend
 * @param engagementId - The engagement ID to associate with the classification
 * @returns Promise<MongoDB ObjectId>
 */
export const getClassificationId = async (classificationString: string, engagementId: string): Promise<string> => {
  // Check if we have a cached mapping
  const cacheKey = `${engagementId}-${classificationString}`;
  if (classificationCache[cacheKey]) {
    console.log(`Using cached classification ID: ${classificationCache[cacheKey]}`);
    return classificationCache[cacheKey];
  }

  // Validate classification string
  if (!VALID_CLASSIFICATIONS.includes(classificationString)) {
    throw new Error(`Invalid classification: "${classificationString}". Valid options: ${VALID_CLASSIFICATIONS.slice(0, 5).join(', ')}...`);
  }

  // Validate engagement ID
  if (!engagementId || engagementId.trim() === '') {
    throw new Error('Engagement ID is required');
  }

  try {
    // First, try to find existing classification section
    const response = await axiosInstance.get(`/api/classification-sections`, {
      params: {
        engagementId,
        classification: classificationString
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.data.classificationSections && response.data.classificationSections.length > 0) {
      const classificationId = response.data.classificationSections[0]._id;
      classificationCache[cacheKey] = classificationId;
      console.log(`Found existing classification section: ${classificationId}`);
      return classificationId;
    }

    // If not found, create a new classification section
    const createResponse = await axiosInstance.post('/api/classification-sections', {
      engagementId,
      classification: classificationString,
      status: 'in-progress'
    }, {
      timeout: 10000 // 10 second timeout
    });

    const classificationId = createResponse.data.classificationSection._id;
    classificationCache[cacheKey] = classificationId;
    console.log(`Created new classification section: ${classificationId}`);
    return classificationId;

  } catch (error: any) {
    console.error('Error getting classification ID:', error);
    
    // Provide more specific error messages
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout: Backend server is not responding');
    } else if (error.response?.status === 404) {
      throw new Error('Backend API endpoint not found. Please check if the server is running.');
    } else if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    } else if (error.response?.status === 500) {
      throw new Error('Backend server error. Please try again later.');
    } else if (error.message?.includes('Network Error')) {
      throw new Error('Network error: Cannot connect to backend server. Please check your connection.');
    }
    
    throw new Error(`Failed to get classification ID: ${error.message}`);
  }
};

/**
 * Get all cached classification mappings
 * @returns Object containing all cached classification mappings
 */
export const getAllClassificationMappings = (): ClassificationMapping => {
  return { ...classificationCache };
};

/**
 * Add a new classification mapping to cache
 * @param engagementId - The engagement ID
 * @param classificationString - The classification string
 * @param objectId - The MongoDB ObjectId
 */
export const addClassificationMapping = (engagementId: string, classificationString: string, objectId: string): void => {
  const cacheKey = `${engagementId}-${classificationString}`;
  classificationCache[cacheKey] = objectId;
  console.log(`Added mapping: "${classificationString}" -> ${objectId}`);
};

/**
 * Check if a classification has a cached mapping
 * @param engagementId - The engagement ID
 * @param classificationString - The classification string
 * @returns boolean indicating if mapping exists in cache
 */
export const hasClassificationMapping = (engagementId: string, classificationString: string): boolean => {
  const cacheKey = `${engagementId}-${classificationString}`;
  return cacheKey in classificationCache;
};

/**
 * Clear classification cache
 */
export const clearClassificationCache = (): void => {
  Object.keys(classificationCache).forEach(key => delete classificationCache[key]);
  console.log('Classification cache cleared');
};

/**
 * Get valid classification options
 * @returns Array of valid classification strings
 */
export const getValidClassifications = (): string[] => {
  return [...VALID_CLASSIFICATIONS];
};

/**
 * Validate a classification string
 * @param classificationString - The classification string to validate
 * @returns boolean indicating if classification is valid
 */
export const isValidClassification = (classificationString: string): boolean => {
  return VALID_CLASSIFICATIONS.includes(classificationString);
};

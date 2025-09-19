export const fetchAuditItemId = async (
  itemType: AuditItemType,
  itemId: string
) => {
  try {
    if (itemType === "procedure") {
      const response = await axiosInstance.get("/api/procedures", {
        params: { itemId },
      });
      return response.data._id;
    }

    if (itemType === "planning-procedure") {
      const response = await axiosInstance.get(
        "/api/planning-procedures",
        {
          params: { itemId },
        }
      );
      return response.data._id;
    }

    if (itemType === "document-request") {
      const response = await axiosInstance.get(
        "/api/document-requests",
        {
          params: { itemId },
        }
      );
      return response.data._id;
    }

    if (itemType === "checklist-item") {
      const response = await axiosInstance.get("/api/checklist", {
        params: { itemId },
      });
      return response.data._id;
    }

    if (itemType === "pbc") {
      const response = await axiosInstance.get("/api/pbc", {
        params: { itemId },
      });
      return response.data._id;
    }

    if (itemType === "kyc") {
      const response = await axiosInstance.get("/api/kyc", {
        params: { itemId },
      });
      return response.data._id;
    }

    if (itemType === "isqm-document") {
      const response = await axiosInstance.get("/api/isqm", {
        params: { itemId },
      });
      return response.data._id;
    }

    if (itemType === "working-paper") {
      const response = await axiosInstance.get("/api/working-paper", {
        params: { itemId },
      });
      return response.data._id;
    }

    console.warn(`Unhandled item type: ${itemType}`);
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
};









[
    {
        "_id": "68c9318b102b7aa172d2a225",
        "engagement": {
            "_id": "68c31476a191f4ea0f12c85c",
            "title": "test",
            "yearEndDate": "2025-09-24T00:00:00.000Z",
            "id": "68c31476a191f4ea0f12c85c"
        },
        "clientId": "86e85b64-4b88-4f32-ad98-0cf21ced8c46",
        "auditorId": "00ec57eb-ceb7-485d-8449-e0b9574e01e7",
        "documentRequests": [
            {
                "_id": "68c32c7f1e7ecf7552ed6b84",
                "category": "pbc",
                "description": "test",
                "status": "pending",
                "documents": []
            }
        ],
        "entityName": "test",
        "currency": "EUR",
        "framework": "IFRS",
        "materialityAbsolute": null,
        "riskNotes": "",
        "trialBalanceUrl": "",
        "status": "document-collection",
        "createdAt": "2025-09-16T09:44:43.292Z",
        "updatedAt": "2025-09-16T09:44:43.292Z",
        "__v": 0
    },
    {
        "_id": "68c9273502090e144c75eec3",
        "engagement": {
            "_id": "68b1a0c5d8c5b389a7ceefc3",
            "title": "new",
            "yearEndDate": "2026-01-01T00:00:00.000Z",
            "id": "68b1a0c5d8c5b389a7ceefc3"
        },
        "clientId": "86e85b64-4b88-4f32-ad98-0cf21ced8c46",
        "auditorId": "00ec57eb-ceb7-485d-8449-e0b9574e01e7",
        "documentRequests": [
            {
                "_id": "68c8801009c84618029b50dc",
                "category": "pbc",
                "description": "new",
                "status": "pending",
                "documents": [
                    {
                        "name": "audit.xlsx",
                        "url": "https://xqetphggxhqttjnaxilk.supabase.co/storage/v1/object/public/engagement-documents/68b1a0c5d8c5b389a7ceefc3/pbc/1758013238144_lkgxw.xlsx",
                        "uploadedAt": "2025-09-16T09:00:38.894Z",
                        "status": "uploaded",
                        "_id": "68c9273602090e144c75eeca"
                    }
                ]
            }
        ],
        "entityName": "new",
        "currency": "EUR",
        "framework": "IFRS",
        "materialityAbsolute": null,
        "riskNotes": "",
        "trialBalanceUrl": "https://docs.google.com/spreadsheets/d/11XkZWjatV88FrsUCAQWzBiHGGIQLdEnrKsI40aWTu6M/edit?usp=drivesdk  ",
        "trialBalance": "68b733db23a1b512374bc377",
        "status": "document-collection",
        "createdAt": "2025-09-16T09:00:37.687Z",
        "updatedAt": "2025-09-16T09:00:37.687Z",
        "__v": 0
    },
    {
        "_id": "68c8b9f26a7d07c46243b754",
        "engagement": {
            "_id": "68b1836923509e37fa96cacf",
            "title": "Audit 2025",
            "yearEndDate": "2026-01-01T00:00:00.000Z",
            "id": "68b1836923509e37fa96cacf"
        },
        "clientId": "86e85b64-4b88-4f32-ad98-0cf21ced8c46",
        "auditorId": "00ec57eb-ceb7-485d-8449-e0b9574e01e7",
        "documentRequests": [
            {
                "_id": "68c8811809c84618029b517c",
                "category": "pbc",
                "description": "Audit 2025",
                "status": "pending",
                "documents": [
                    {
                        "name": "Sample-Financial-Statements-1.pdf",
                        "url": "https://xqetphggxhqttjnaxilk.supabase.co/storage/v1/object/public/engagement-documents/68b1836923509e37fa96cacf/pbc/1757985001798_m1ids.pdf",
                        "uploadedAt": "2025-09-16T01:10:02.700Z",
                        "status": "uploaded",
                        "_id": "68c8b8ea6a7d07c46243b719"
                    },
                    {
                        "name": "Engagement Letter-split-1.pdf",
                        "url": "https://xqetphggxhqttjnaxilk.supabase.co/storage/v1/object/public/engagement-documents/68b1836923509e37fa96cacf/pbc/1757985266356_o3lt1.pdf",
                        "uploadedAt": "2025-09-16T01:14:27.337Z",
                        "status": "uploaded",
                        "_id": "68c8b9f36a7d07c46243b75d"
                    }
                ]
            }
        ],
        "entityName": "Audit 2025",
        "currency": "EUR",
        "framework": "IFRS",
        "materialityAbsolute": null,
        "riskNotes": "",
        "trialBalanceUrl": "https://docs.google.com/spreadsheets/d/19kSMjy7F8DimjIVrsQjQOL8wiJAGCyeWFXDs0Ba1bNM/edit?usp=sharing",
        "trialBalance": "68b5a66b31dc5b9f9e92a17f",
        "status": "qna-preparation",
        "createdAt": "2025-09-16T01:14:26.038Z",
        "updatedAt": "2025-09-16T01:23:52.485Z",
        "__v": 0
    }
]
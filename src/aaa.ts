import { off } from "process";

Schema of PBC :

const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

/**
 * QnA Discussion Schema
 */
const QnADiscussionSchema = new Schema({
  role: {
    type: String,
    enum: ['client', 'auditor'],
    required: true
  },
  message: { type: String, required: true },
  replyTo: { type: Types.ObjectId }, // reply chain
  createdAt: { type: Date, default: Date.now }
}, { _id: true });


/**
 * QnA Question Schema
 */
const QnAQuestionSchema = new Schema({
  question: { type: String, required: true },
  isMandatory: { type: Boolean, default: false },
  answer: { type: String },
  status: {
    type: String,
    enum: ['unanswered', 'answered', 'doubt'],
    default: 'unanswered'
  },
  discussions: [QnADiscussionSchema],
  answeredAt: { type: Date }
}, { timestamps: true });


/**
 * Category Schema (linked to PBC)
 */
const QnACategorySchema = new Schema({
  pbcId: { type: Types.ObjectId, ref: 'PBC', required: true },
  title: { type: String, required: true },
  qnaQuestions: [QnAQuestionSchema],
}, { timestamps: true });


/**
 * PBC Schema
 */
const PBCSchema = new Schema({
  engagement: { type: Types.ObjectId, ref: 'Engagement', required: true },
  clientId: { type: String, required: true },
  auditorId: { type: String, required: true },
  documentRequests: [{ type: Types.ObjectId, ref: 'DocumentRequest' }],

  // 🔹 Extra fields for AI context
  entityName: { type: String }, // engagement.title
  periodStart: { type: Date },  // optional, can be null
  periodEnd: { type: Date },    // engagement.yearEndDate
  currency: { type: String, default: "EUR" },
  framework: { type: String, default: "IFRS" }, // GAAP/IFRS etc
  industry: { type: String }, // free text
  materialityAbsolute: { type: Number, default: null },
  riskNotes: { type: String, default: "" },

  // 🔹 trial balance linkage
  trialBalanceUrl: { type: String }, // direct link
  trialBalance: { type: Types.ObjectId, ref: "TrialBalance" },

  // 🔹 workflow level
  status: {
    type: String,
    enum: [
      'document-collection',  // Level 1
      'qna-preparation',      // Level 2
      'client-responses',     // Level 3
      'doubt-resolution',     // Level 4
      'submitted'             // Level 5
    ],
    default: 'document-collection'
  }
}, { timestamps: true });


const PBC = mongoose.model('PBC', PBCSchema);
const QnACategory = mongoose.model('QnACategory', QnACategorySchema);

module.exports = { PBC, QnACategory };




Schema of DocumentRequest


const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const DocumentRequestSchema = new Schema({
  engagement: { type: Types.ObjectId, ref: 'Engagement', required: true },
  clientId: { type: String, required: true },
  name: { type: String, },
  category: { type: String, required: true, index: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  requestedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  documents: [{
    name: { type: String, required: true },
    url: { type: String }, // Supabase file URL 
    uploadedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'uploaded', 'in-review', 'approved', 'rejected'],
      default: 'pending'
    },
  }],

  // Review and Sign-off fields
  reviewStatus: {
    type: String,
    enum: ['in-progress', 'ready-for-review', 'under-review', 'approved', 'rejected', 'signed-off', 're-opened'],
    default: 'in-progress'
  },
  reviewerId: {
    type: String // User ID of assigned reviewer
  },
  reviewedAt: {
    type: Date
  },
  reviewComments: {
    type: String
  },
  approvedBy: {
    type: String // User ID of approver
  },
  approvedAt: {
    type: Date
  },
  signedOffBy: {
    type: String // User ID of partner who signed off
  },
  signedOffAt: {
    type: Date
  },
  signOffComments: {
    type: String
  },
  isSignedOff: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date
  },
  lockedBy: {
    type: String // User ID who locked the item
  },
  reopenedAt: {
    type: Date
  },
  reopenedBy: {
    type: String // User ID who reopened the item
  },
  reopenReason: {
    type: String
  },
  reviewVersion: {
    type: Number,
    default: 1
  }
});

module.exports = mongoose.model('DocumentRequest', DocumentRequestSchema);





exports.createPBC = async (req, res, next) => {
  try {
    const {
      engagementId,
      clientId,
      auditorId,
      documentRequests: pbcDocumentRequestsFromBody, // Renamed for clarity
      entityName,
      notes,
      customFields,
    } = req.body;

    // --- 1️⃣ Verify engagement exists ---
    const engagement = await Engagement.findById(engagementId);
    if (!engagement) {
      return res.status(404).json({ message: "Engagement not found" });
    }

    // --- 2️⃣ Check if PBC already exists for this engagement ---
    const existingPBC = await PBC.findOne({ engagement: engagementId });
    if (existingPBC) {
      return res
        .status(400)
        .json({ message: "PBC workflow already exists for this engagement" });
    }

    // --- 3️⃣ Create/Update document requests if provided ---
    let validDocumentRequestIds = [];
    if (pbcDocumentRequestsFromBody && pbcDocumentRequestsFromBody.length > 0) {
      const documentRequestIdsFromBody = pbcDocumentRequestsFromBody.map((dr) => dr._id);

      // Find all document requests that match the IDs, engagement, and category
      const foundDocumentRequests = await DocumentRequest.find({
        _id: { $in: documentRequestIdsFromBody },
        engagement: engagementId,
        category: "pbc",
      });

      // Check if all provided IDs are valid and belong to the correct engagement/category
      if (foundDocumentRequests.length !== documentRequestIdsFromBody.length) {
        return res.status(400).json({
          message:
            "One or more provided document request IDs are invalid or do not belong to this engagement/category.",
        });
      }

      
      // Adjust logic if you intend to add, not replace.
      const updatePromises = foundDocumentRequests.map(async (foundReq) => {
        const correspondingBodyReq = pbcDocumentRequestsFromBody.find(
          (bodyReq) => String(bodyReq._id) === String(foundReq._id)
        );

        if (correspondingBodyReq && correspondingBodyReq.documents) {
          // Assuming you want to replace the documents array on the DocumentRequest with the one from req.body
          foundReq.documents = correspondingBodyReq.documents;
          return foundReq.save();
        }
        return Promise.resolve(); // No update needed for this specific request
      });
      await Promise.all(updatePromises); // Wait for all document requests to be saved

      validDocumentRequestIds = foundDocumentRequests.map((req) => req._id);
    }

    // --- 4️⃣ Create the PBC workflow ---
    const pbc = await PBC.create({
      engagement: engagementId,
      clientId: clientId || engagement.clientId,
      auditorId: auditorId || req.user.id,
      documentRequests: validDocumentRequestIds,

      // Pull directly from Engagement
      engagementTitle: engagement.title,
      yearEndDate: engagement.yearEndDate,
      trialBalanceUrl: engagement.trialBalanceUrl,
      trialBalance: engagement.trialBalance,
      excelURL: engagement.excelURL,

      // Extra fields from req.body
      entityName,
      notes,
      customFields,

      status: "document-collection",
      createdAt: new Date(),
      createdBy: req.user.id,
    });

    // --- 5️⃣ Update engagement status ---
    await Engagement.findByIdAndUpdate(engagementId, {
      status: "pbc-data-collection",
    });

    // --- 6️⃣ Populate document requests to return as objects ---
    const populatedPBC = await PBC.findById(pbc._id)
      .populate("engagement", "title yearEndDate clientId")
      .populate("documentRequests"); // Ensure your DocumentRequest schema is properly defined

    res.status(201).json({
      success: true,
      message: "PBC workflow created successfully",
      pbc: populatedPBC,
    });
  } catch (err) {
    next(err); // Pass error to your error handling middleware
  }
};



// Requirement is that if existingPBC is there , then i need to update PBC with the latest notes received from req.body, At the next moment  then i need to replace the found documentRequest's documents with pbcDocumentRequestsFromBody.documents, so update the create PBC Controller function
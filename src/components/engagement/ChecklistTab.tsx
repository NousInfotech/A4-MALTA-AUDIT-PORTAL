import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChecklistTabProps {
  checklist: Record<string, boolean>;
  toggle: (key: string) => void;
}

export const ChecklistTab = ({ checklist, toggle }: ChecklistTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Checklist</CardTitle>
        <CardDescription>
          Complete audit checklist to track progress through all phases
        </CardDescription>
      </CardHeader>
            <CardHeader>
              <CardTitle>Audit Checklist</CardTitle>
              <CardDescription>
                Complete audit checklist to track progress through all phases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* Pre-Audit Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Pre-Audit Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Professional Clearance</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['prof-clearance-letter'] || false}
                        onCheckedChange={() => toggle('prof-clearance-letter')}
                      />
                      <Label>Signed Professional Clearance Letter (if required)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['removal-auditor'] || false}
                        onCheckedChange={() => toggle('removal-auditor')}
                      />
                      <Label>Removal of Auditor</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-f1'] || false}
                        onCheckedChange={() => toggle('form-f1')}
                      />
                      <Label>Form F1 Submitted (if required)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Engagement Letter</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-engagement'] || false}
                        onCheckedChange={() => toggle('draft-engagement')}
                      />
                      <Label>Draft Engagement Letter</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-engagement'] || false}
                        onCheckedChange={() => toggle('signed-engagement')}
                      />
                      <Label>Signed Engagement Letter by Client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['engagement-sent'] || false}
                        onCheckedChange={() => toggle('engagement-sent')}
                      />
                      <Label>Engagement Letter sent to client (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Letter of Independence</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-independence'] || false}
                        onCheckedChange={() => toggle('draft-independence')}
                      />
                      <Label>Draft Letter of Independence for team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-independence'] || false}
                        onCheckedChange={() => toggle('signed-independence')}
                      />
                      <Label>Signed Independence Letter by audit team members</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['filed-independence'] || false}
                        onCheckedChange={() => toggle('filed-independence')}
                      />
                      <Label>Filed for record (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">MBR Authorization Access</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-auth-request'] || false}
                        onCheckedChange={() => toggle('mbr-auth-request')}
                      />
                      <Label>Authorization request submitted for MBR access (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-confirmation'] || false}
                        onCheckedChange={() => toggle('mbr-confirmation')}
                      />
                      <Label>Access confirmation received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">CFR02 Tax Access</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cfr02-request'] || false}
                        onCheckedChange={() => toggle('cfr02-request')}
                      />
                      <Label>CFR02 Tax access request submitted (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cfr02-granted'] || false}
                        onCheckedChange={() => toggle('cfr02-granted')}
                      />
                      <Label>Access granted for tax details (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Task Assignment</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['engagement-type'] || false}
                        onCheckedChange={() => toggle('engagement-type')}
                      />
                      <Label>Specify Type of Engagement: (select one) ✓ Audit ☐ Liquidation ☐ Review ☐ Other</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['assign-manager'] || false}
                        onCheckedChange={() => toggle('assign-manager')}
                      />
                      <Label>Assign audit manager/lead auditor (Name: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Period</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['audit-period'] || false}
                        onCheckedChange={() => toggle('audit-period')}
                      />
                      <Label>Years/Periods to be Audited: ______ to ______</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Bank Confirmation Letter</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-letters-sent'] || false}
                        onCheckedChange={() => toggle('bank-letters-sent')}
                      />
                      <Label>Bank Confirmation Letters sent (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-letters-received'] || false}
                        onCheckedChange={() => toggle('bank-letters-received')}
                      />
                      <Label>Bank Confirmation Letters received (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Planning Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Audit Planning Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Audit Planning Meeting</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['planning-meeting'] || false}
                        onCheckedChange={() => toggle('planning-meeting')}
                      />
                      <Label>Initial audit planning meeting scheduled (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['scope-discussion'] || false}
                        onCheckedChange={() => toggle('scope-discussion')}
                      />
                      <Label>Discussion of audit scope, timing, and key focus areas</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Strategy and Risk Assessment</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['risk-assessment'] || false}
                        onCheckedChange={() => toggle('risk-assessment')}
                      />
                      <Label>Identify significant risks and audit areas</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['audit-strategy'] || false}
                        onCheckedChange={() => toggle('audit-strategy')}
                      />
                      <Label>Document audit strategy</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['internal-controls'] || false}
                        onCheckedChange={() => toggle('internal-controls')}
                      />
                      <Label>Review internal controls (if applicable)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Team Planning</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['team-assigned'] || false}
                        onCheckedChange={() => toggle('team-assigned')}
                      />
                      <Label>Audit team assigned and roles clarified</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['timeline-communication'] || false}
                        onCheckedChange={() => toggle('timeline-communication')}
                      />
                      <Label>Communication of timelines and deliverables</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentation Requested */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Documentation Requested
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Client Documentation Request</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['financial-statements'] || false}
                        onCheckedChange={() => toggle('financial-statements')}
                      />
                      <Label>Financial Statements (balance sheet, income statement, cash flow)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['trial-balance'] || false}
                        onCheckedChange={() => toggle('trial-balance')}
                      />
                      <Label>General Ledger and Trial Balance</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fixed-asset-register'] || false}
                        onCheckedChange={() => toggle('fixed-asset-register')}
                      />
                      <Label>Fixed Asset Register</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-statements'] || false}
                        onCheckedChange={() => toggle('bank-statements')}
                      />
                      <Label>Bank Statements and Reconciliations</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['payroll-reports'] || false}
                        onCheckedChange={() => toggle('payroll-reports')}
                      />
                      <Label>Payroll Reports and Supporting Documents</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['tax-returns'] || false}
                        onCheckedChange={() => toggle('tax-returns')}
                      />
                      <Label>Tax Returns and Correspondence</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['debtors-creditors'] || false}
                        onCheckedChange={() => toggle('debtors-creditors')}
                      />
                      <Label>Debtors & Creditors Ledgers</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['legal-documents'] || false}
                        onCheckedChange={() => toggle('legal-documents')}
                      />
                      <Label>Legal Documents (agreements, contracts, leases)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['board-minutes'] || false}
                        onCheckedChange={() => toggle('board-minutes')}
                      />
                      <Label>Minutes of Board Meetings</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['significant-transactions'] || false}
                        onCheckedChange={() => toggle('significant-transactions')}
                      />
                      <Label>Significant transactions documentation (loans, acquisitions, etc.)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['other-requests'] || false}
                        onCheckedChange={() => toggle('other-requests')}
                      />
                      <Label>Other (list any additional requests: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit File Preparation</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['working-papers'] || false}
                        onCheckedChange={() => toggle('working-papers')}
                      />
                      <Label>Audit working papers created (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fieldwork Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Fieldwork Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Audit Started</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fieldwork-start'] || false}
                        onCheckedChange={() => toggle('fieldwork-start')}
                      />
                      <Label>Date of Audit Fieldwork Start: __________</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['inventory-count'] || false}
                        onCheckedChange={() => toggle('inventory-count')}
                      />
                      <Label>Attendance of inventory count (if applicable)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Testing and Sampling</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['assertions-tested'] || false}
                        onCheckedChange={() => toggle('assertions-tested')}
                      />
                      <Label>Financial statement assertions tested</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['sampling-plan'] || false}
                        onCheckedChange={() => toggle('sampling-plan')}
                      />
                      <Label>Sampling plan for testing developed</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['sample-selection'] || false}
                        onCheckedChange={() => toggle('sample-selection')}
                      />
                      <Label>Sample selection completed</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Substantive Procedures</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['revenue-testing'] || false}
                        onCheckedChange={() => toggle('revenue-testing')}
                      />
                      <Label>Revenue testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['expense-testing'] || false}
                        onCheckedChange={() => toggle('expense-testing')}
                      />
                      <Label>Expense testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cash-bank-testing'] || false}
                        onCheckedChange={() => toggle('cash-bank-testing')}
                      />
                      <Label>Cash and bank testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['asset-testing'] || false}
                        onCheckedChange={() => toggle('asset-testing')}
                      />
                      <Label>Asset testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['liability-testing'] || false}
                        onCheckedChange={() => toggle('liability-testing')}
                      />
                      <Label>Liability testing</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Review of Estimates and Judgments</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['estimates-review'] || false}
                        onCheckedChange={() => toggle('estimates-review')}
                      />
                      <Label>Review management's estimates (e.g., provisions, impairments)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Review of Going Concern</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['going-concern'] || false}
                        onCheckedChange={() => toggle('going-concern')}
                      />
                      <Label>Going concern analysis completed</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Finalization Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Finalization Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Financial Statements</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fs-drafted'] || false}
                        onCheckedChange={() => toggle('fs-drafted')}
                      />
                      <Label>Financial Statements Drafted by: __________ (Name)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fs-reviewed'] || false}
                        onCheckedChange={() => toggle('fs-reviewed')}
                      />
                      <Label>Financial Statements Reviewed by: __________ (Name)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['review-date'] || false}
                        onCheckedChange={() => toggle('review-date')}
                      />
                      <Label>Date of Review: __________</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Completion Date</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fieldwork-completed'] || false}
                        onCheckedChange={() => toggle('fieldwork-completed')}
                      />
                      <Label>Date Audit Fieldwork Completed: __________</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Adjustments</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-discussed'] || false}
                        onCheckedChange={() => toggle('adjustments-discussed')}
                      />
                      <Label>Discuss adjustments with client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-processed'] || false}
                        onCheckedChange={() => toggle('adjustments-processed')}
                      />
                      <Label>Final adjustments processed</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Review of Financial Statements</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-fs-reviewed'] || false}
                        onCheckedChange={() => toggle('final-fs-reviewed')}
                      />
                      <Label>Final financial statements reviewed by audit team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['representation-drafted'] || false}
                        onCheckedChange={() => toggle('representation-drafted')}
                      />
                      <Label>Letter of representation drafted and sent to management</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['representation-received'] || false}
                        onCheckedChange={() => toggle('representation-received')}
                      />
                      <Label>Signed letter of representation received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Opinion Drafting</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-report'] || false}
                        onCheckedChange={() => toggle('draft-report')}
                      />
                      <Label>Draft audit report completed</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['report-review'] || false}
                        onCheckedChange={() => toggle('report-review')}
                      />
                      <Label>Review with audit team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-report'] || false}
                        onCheckedChange={() => toggle('final-report')}
                      />
                      <Label>Final report issued (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Post-Audit Letters & Documentation */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Post-Audit Letters & Documentation
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Form DD1/DD2 (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-dd1'] || false}
                        onCheckedChange={() => toggle('form-dd1')}
                      />
                      <Label>Form DD1 prepared and submitted (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-dd2'] || false}
                        onCheckedChange={() => toggle('form-dd2')}
                      />
                      <Label>Form DD2 prepared and submitted (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Letter of Representation</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['lor-drafted'] || false}
                        onCheckedChange={() => toggle('lor-drafted')}
                      />
                      <Label>Drafted and sent to management (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['lor-received'] || false}
                        onCheckedChange={() => toggle('lor-received')}
                      />
                      <Label>Signed letter received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Shareholder's/s' Confirmation (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['shareholder-confirmation'] || false}
                        onCheckedChange={() => toggle('shareholder-confirmation')}
                      />
                      <Label>Confirmation from shareholders received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Shareholder's/s' Resolution (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['shareholder-draft'] || false}
                        onCheckedChange={() => toggle('shareholder-draft')}
                      />
                      <Label>Draft shareholder's resolution</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['shareholder-signed'] || false}
                        onCheckedChange={() => toggle('shareholder-signed')}
                      />
                      <Label>Signed resolution received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Director's/s' Resolution (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['director-draft'] || false}
                        onCheckedChange={() => toggle('director-draft')}
                      />
                      <Label>Draft director's resolution</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['director-signed'] || false}
                        onCheckedChange={() => toggle('director-signed')}
                      />
                      <Label>Signed resolution received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Going Concern Letter (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['going-concern-letter'] || false}
                        onCheckedChange={() => toggle('going-concern-letter')}
                      />
                      <Label>Going concern letter obtained from management and reviewed.</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Related Parties Letters (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['related-parties-drafted'] || false}
                        onCheckedChange={() => toggle('related-parties-drafted')}
                      />
                      <Label>Related parties letter drafted and sent to management.</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['related-parties-confirmed'] || false}
                        onCheckedChange={() => toggle('related-parties-confirmed')}
                      />
                      <Label>Confirmation of related parties transactions received and reviewed.</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">External Confirmation Letters (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['external-confirmations-sent'] || false}
                        onCheckedChange={() => toggle('external-confirmations-sent')}
                      />
                      <Label>External confirmation letters (e.g., bank, receivables) drafted and sent.</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['external-confirmations-received'] || false}
                        onCheckedChange={() => toggle('external-confirmations-received')}
                      />
                      <Label>External confirmations received and reconciled with client records.</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Letter of Management</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['management-letter-draft'] || false}
                        onCheckedChange={() => toggle('management-letter-draft')}
                      />
                      <Label>Draft letter of management comments prepared</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['management-letter-sent'] || false}
                        onCheckedChange={() => toggle('management-letter-sent')}
                      />
                      <Label>Final letter sent to management (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Adjustments Approval</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-discussed-client'] || false}
                        onCheckedChange={() => toggle('adjustments-discussed-client')}
                      />
                      <Label>Audit adjustments discussed with client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-approved'] || false}
                        onCheckedChange={() => toggle('adjustments-approved')}
                      />
                      <Label>Adjustments approved by management (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Post-Audit Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Post-Audit Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Management Letter</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-management-letter'] || false}
                        onCheckedChange={() => toggle('draft-management-letter')}
                      />
                      <Label>Draft Management Letter</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['finalized-management-letter'] || false}
                        onCheckedChange={() => toggle('finalized-management-letter')}
                      />
                      <Label>Finalized Management Letter (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Client Debrief</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['post-audit-meeting'] || false}
                        onCheckedChange={() => toggle('post-audit-meeting')}
                      />
                      <Label>Post-audit meeting scheduled with client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['client-feedback'] || false}
                        onCheckedChange={() => toggle('client-feedback')}
                      />
                      <Label>Feedback received from the client</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Archiving</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['audit-file-archived'] || false}
                        onCheckedChange={() => toggle('audit-file-archived')}
                      />
                      <Label>Audit file archived</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['closure-meeting'] || false}
                        onCheckedChange={() => toggle('closure-meeting')}
                      />
                      <Label>Engagement closure meeting with the team</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Conclusion</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-documents'] || false}
                        onCheckedChange={() => toggle('signed-documents')}
                      />
                      <Label>Signed documents obtained from the client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['documentation-rearranged'] || false}
                        onCheckedChange={() => toggle('documentation-rearranged')}
                      />
                      <Label>Documentation re-arranged and prepared for submission</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['counter-signed-docs'] || false}
                        onCheckedChange={() => toggle('counter-signed-docs')}
                      />
                      <Label>Counter-signed documents sent to the client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-submission'] || false}
                        onCheckedChange={() => toggle('mbr-submission')}
                      />
                      <Label>Submission completed with MBR (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-billing'] || false}
                        onCheckedChange={() => toggle('final-billing')}
                      />
                      <Label>Final billing for the engagement issued (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
    </Card>
  );
};
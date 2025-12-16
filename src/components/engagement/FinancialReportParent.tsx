import React from 'react'
import FSUploadFlow from '../fs-review/FSUploadFlow'

interface FinancialReportParentProps {
  engagementId?: string;
}

const FinancialReportParent = ({ engagementId }: FinancialReportParentProps) => {
  return (
    <FSUploadFlow engagementId={engagementId} />
  )
}

export default FinancialReportParent
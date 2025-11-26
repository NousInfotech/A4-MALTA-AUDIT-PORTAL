import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import { AuditLogEntry, Workbook } from '../../types/audit-workbooks/types';

interface AuditLogProps {
  auditLogs: AuditLogEntry[];
  workbook: Workbook | null;
  onBack: () => void;
}



export const AuditLog: React.FC<AuditLogProps> = ({ auditLogs, workbook, onBack }) => {
  if (!workbook) return null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 text-brand-body" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Audit Log for {workbook.name}</h1>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </header>

      <main className="flex-1 p-4 lg:p-8 overflow-auto space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default">All</Button>
              <Button size="sm" variant="outline">Uploads</Button>
              <Button size="sm" variant="outline">Mappings</Button>
              <Button size="sm" variant="outline">Changes</Button>
              <Button size="sm" variant="outline">Date Range</Button>
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden sm:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* USE the auditLogs prop instead of mockAuditLog */}
                {auditLogs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">{new Date(entry.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.user}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.action}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-600">{entry.details}</TableCell>
                  </TableRow>
                ))}
                {auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-4">
                      No audit logs found for this workbook.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
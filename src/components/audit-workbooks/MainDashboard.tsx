import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Upload, FileSpreadsheet, Activity, User } from 'lucide-react';
import { Workbook } from '../../types/audit-workbooks/types';

interface MainDashboardProps {
  workbooks: Workbook[];
  onSelectWorkbook: (workbook: Workbook) => void;
  onUploadClick: () => void;
}


const mockActivities = [
  { user: 'Alice', action: 'mapped cell A1 to field X', time: '2 hours ago' },
  { user: 'Bob', action: 'uploaded new version of Q4_Sales_Report', time: '5 hours ago' },
  { user: 'Charlie', action: 'mapped Sheet2 to dataset Z', time: '1 day ago' },
];

export const MainDashboard: React.FC<MainDashboardProps> = ({ workbooks, onSelectWorkbook, onUploadClick }) => {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Audit Work&nbsp;Book</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarFallback><User className="h-4 w-4"/></AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium">Auditor</span>
          
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="grid grid-cols-1 gap-6">
          {/* Upload Area */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Workbook
              </CardTitle>
              <CardDescription>
                Add a new Excel file to start mapping.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                onClick={onUploadClick}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Drag & drop an .xlsx file here, or</p>
                <Button variant="link" className="mt-1 p-0 h-auto">Browse Files</Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Workbooks */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Recent Workbooks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* USE the workbooks prop instead of mockWorkbooks */}
              {workbooks.map((wb) => (
                <div 
                  key={wb.id} 
                  onClick={() => onSelectWorkbook(wb)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-sm">{wb.name}</p>
                  <p className="text-xs text-gray-500">v{wb.version} by {wb.lastModifiedBy || 'Unknown'}</p>
                </div>
              ))}
              {workbooks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No workbooks uploaded yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{activity.user[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
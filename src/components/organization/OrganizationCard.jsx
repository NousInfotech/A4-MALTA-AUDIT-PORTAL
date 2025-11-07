import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Users, UserCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export function OrganizationCard({ organization }) {

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{organization.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                ID: {organization.id.substring(0, 8)}...
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Admin Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{organization.adminName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCircle className="h-4 w-4" />
            <span className="truncate">{organization.adminEmail}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Employees</span>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-semibold">{organization.employeeCount}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Clients</span>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-lg font-semibold">{organization.clientCount}</span>
            </div>
          </div>
        </div>

        {/* Created Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t">
          <Calendar className="h-3 w-3" />
          <span>Created {format(new Date(organization.createdAt), 'MMM dd, yyyy')}</span>
        </div>

        {/* Status Badge */}
        <div className="flex justify-end">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}


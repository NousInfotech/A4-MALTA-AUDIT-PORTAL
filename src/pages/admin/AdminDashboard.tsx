import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, Building2 } from 'lucide-react';

export const AdminDashboard = () => {
  // Mock stats data
  const stats = [
    {
      title: 'Total Users',
      value: '24',
      description: 'All registered users',
      icon: Users,
      trend: '+2 this week'
    },
    {
      title: 'Pending Approvals',
      value: '3',
      description: 'Awaiting approval',
      icon: UserCheck,
      trend: '+1 today'
    },
    {
      title: 'Active Employees',
      value: '12',
      description: 'Approved auditors',
      icon: UserCheck,
      trend: '+1 this month'
    },
    {
      title: 'Client Companies',
      value: '9',
      description: 'Active clients',
      icon: Building2,
      trend: '+2 this month'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      action: 'New user registration',
      user: 'Sarah Johnson',
      time: '2 hours ago',
      status: 'pending'
    },
    {
      id: 2,
      action: 'User approved',
      user: 'Michael Chen',
      time: '1 day ago',
      status: 'completed'
    },
    {
      id: 3,
      action: 'New user registration',
      user: 'David Wilson',
      time: '2 days ago',
      status: 'pending'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage your audit portal users and system overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-success mt-1">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest user management activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'pending' ? 'bg-warning' : 'bg-success'
                  }`} />
                  <div>
                    <p className="font-medium text-foreground">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.user}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
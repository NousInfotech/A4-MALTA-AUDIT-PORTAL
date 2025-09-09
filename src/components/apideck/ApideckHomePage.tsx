'use client'; 

import { useEffect, useState } from 'react';


import { toast } from 'sonner';

import { getServicesbyUserId } from '@/lib/api/apideck';
import { ApideckConnectionList } from './ApideckConnectionList';
import { ApideckDataDisplay } from './ApideckDataDisplay';
import { useAuth } from '@/contexts/AuthContext';

export default function ApideckHomePage() {
  const [connections, setConnections] = useState<any>([]);
  const [services, setServices] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      try {
        if (!user) return;

        const response = await getServicesbyUserId(user.id);
        console.log(response);
        console.log('services', response.getConsumerResponse.data.services);
        console.log(
          'connections',
          response.getConsumerResponse.data.connections
        );
        setServices(response.getConsumerResponse.data.services);
        setConnections(response.getConsumerResponse.data.connections);
      } catch (error) {
        console.log(error);
        toast.error('Something went wrong, while fetching services');
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading && user) {
      fetchServices();
    }
  }, [authLoading, user]);

  

  const handleConnectionClick = (connectionId: string) => {
    setSelectedConnectionId(connectionId);
  };

  const connectionsWithHandlers = connections.map((conn: any) => ({
    connection: conn, // Wrap the connection object
    onClick: handleConnectionClick,
    isActive: conn.serviceId === selectedConnectionId
  }));

  if (loading) {
    return <div>Loading.......</div>;
  }
  console.log(connections);
  return (
    <div className='min-h-screen w-full bg-gradient-to-br from-gray-50 to-indigo-100 py-10'>
      <h1 className='mb-12 text-center text-4xl font-extrabold text-gray-900'>
        Apideck Integrations Dashboard
      </h1>

      {/* Connection List Section */}
      <div className='my-5 w-full rounded-lg bg-white p-6 shadow-xl'>
        <ApideckConnectionList connections={connectionsWithHandlers} />
      </div>

      {/* Data Display Section */}
      <div className='my-5 w-full rounded-lg bg-white p-6 shadow-xl'>
        <ApideckDataDisplay connectionId={selectedConnectionId} />
      </div>
    </div>
  );
}

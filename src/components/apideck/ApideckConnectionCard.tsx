import { cn } from '@/lib/utils'; // Assuming you still use cn for class merging

interface ConnectionCardProps {
  connection: {
    id: string;
    name: string;
    icon: string; // Not used in this direct HTML version, but kept in interface
    logo: string; // Not used in this direct HTML version, but kept in interface
    serviceId: string;
    unifiedApi: string;
    consumerId: string;
    authType: string;
    createdAt: string;
  };
  className?: string;
  onClick?: (serviceId: string) => void;
  isActive?: boolean;
}

export function ApideckConnectionCard({
  connection,
  className,
  onClick,
  isActive
}: ConnectionCardProps) {
  const formattedDate = new Date(connection.createdAt).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  );

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-lg transition-shadow duration-300 ease-in-out hover:shadow-xl',
        'w-full cursor-pointer p-6', // Added padding and base styles
        isActive &&
          'border-primary ring-primary-foreground border-2 !bg-pink-100 ring-2',
        className
      )}
      onClick={() => onClick && onClick(connection.serviceId)}
    >
      {/* CardHeader equivalent */}
      <div className='mb-4'>
        <h3 className='flex items-center justify-between text-lg font-semibold text-gray-800'>
          {connection.name.charAt(0).toUpperCase() + connection.name.slice(1)}
        </h3>
        <p className='text-sm text-gray-500'>
          Unified API: {connection.unifiedApi}
        </p>
      </div>

      {/* CardContent equivalent */}
      <div className='grid gap-2 text-gray-700'>
        <div className='flex items-center space-x-2'>
          <span className='font-medium'>Service ID:</span>
          <span className='text-sm'>{connection.serviceId}</span>
        </div>
        <div className='flex items-center space-x-2'>
          <span className='font-medium'>Consumer ID:</span>
          <span className='text-sm'>{connection.consumerId}</span>
        </div>
        <div className='flex items-center space-x-2'>
          <span className='font-medium'>Auth Type:</span>
          <span className='truncate text-sm'>{connection.authType}</span>
        </div>
        <div className='flex items-center space-x-2'>
          <span className='font-medium'>Created At:</span>
          <span className='text-sm'>{formattedDate}</span>
        </div>
      </div>

      {/* CardFooter equivalent */}
      <div className='mt-4 flex justify-end pt-2'>
        <span className='text-xs text-gray-400'>
          ID: {connection.id.substring(0, 8)}...
        </span>
      </div>
    </div>
  );
}
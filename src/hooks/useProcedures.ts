// // @ts-nocheck
// import { useState, useEffect } from 'react';
// import { procedureApi, getSocket } from '@/services/api';
// import { useToast } from '@/hooks/use-toast';

// export interface ProcedureTask {
//   _id: string;
//   description: string;
//   category: string;
//   completed: boolean;
// }

// export interface Procedure {
//   _id: string;
//   engagement: string;
//   title: string;
//   status: 'draft' | 'completed';
//   tasks: ProcedureTask[];
//   createdAt: string;
// }

// export const useProcedures = (engagementId?: string) => {
//   const [procedures, setProcedures] = useState<Procedure[]>([]);
//   const [loading, setLoading] = useState(false);
//   const { toast } = useToast();

//   const fetchProcedures = async () => {
//     if (!engagementId) return;
    
//     try {
//       setLoading(true);
//       const data = await procedureApi.getByEngagement(engagementId);
//       setProcedures(data);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch procedures",
//         variant: "destructive"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const createProcedure = async (data: {
//     title: string;
//     tasks: Array<{ description: string; category: string }>;
//   }) => {
//     if (!engagementId) return;

//     try {
//       const newProcedure = await procedureApi.seed({
//         engagementId,
//         ...data
//       });
//       setProcedures(prev => [...prev, newProcedure]);
//       toast({
//         title: "Success",
//         description: "Procedure created successfully",
//       });
//       return newProcedure;
//     } catch (error) {
//       throw error;
//     }
//   };

//   const updateTask = async (procedureId: string, taskId: string, completed: boolean) => {
//     try {
//       const updated = await procedureApi.updateTask(procedureId, taskId, { completed });
//       setProcedures(prev => prev.map(proc => proc._id === procedureId ? updated : proc));
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to update task",
//         variant: "destructive"
//       });
//     }
//   };

//   useEffect(() => {
//     fetchProcedures();
//   }, [engagementId]);

//   // Socket.IO real-time updates
//   useEffect(() => {
//     const socket = getSocket();
//     if (socket && engagementId) {
//       const handleProcedureUpdate = (updatedProcedure: Procedure) => {
//         setProcedures(prev => prev.map(proc => 
//           proc._id === updatedProcedure._id ? updatedProcedure : proc
//         ));
//       };

//       socket.on('procedure:update', handleProcedureUpdate);
      
//       return () => {
//         socket.off('procedure:update', handleProcedureUpdate);
//       };
//     }
//   }, [engagementId]);

//   return {
//     procedures,
//     loading,
//     createProcedure,
//     updateTask,
//     refetch: fetchProcedures
//   };
// };

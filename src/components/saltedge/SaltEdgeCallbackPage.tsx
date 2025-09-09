// import React, { useEffect, useState } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useAuth } from "@/contexts/AuthContext"; 

// export default function SaltEdgeCallbackPage() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { refreshUser, isLoading: authLoading } = useAuth();

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [message, setMessage] = useState<string | null>(null);

//   useEffect(() => {
//     const handleCallback = async () => {
//       if (authLoading) return;

//       setLoading(true);
//       const params = new URLSearchParams(location.search);

//       const connectionId = params.get("connection_id");
//       const errorClass = params.get("error_class");
//       const errorMessage = params.get("error_message");

//       if (errorClass || errorMessage) {
//         setError(errorMessage || "An error occurred during bank connection.");
//         setMessage(null);
//         setLoading(false);
//         return;
//       }

//       if (connectionId) {
//         console.log(
//           "Salt Edge connection successful! Connection ID:",
//           connectionId
//         );
//         setMessage("Your bank has been successfully registered!");

//         try {
//           await refreshUser();
//           console.log("User profile refreshed with new bankconnectionid.");
//         } catch (refreshError) {
//           console.error(
//             "Error refreshing user profile after Salt Edge:",
//             refreshError
//           );
//           setMessage((prev) =>
//             prev
//               ? prev +
//                 " However, there was an issue updating your local user data. Please refresh the page if you don't see your bank data immediately."
//               : "Your bank has been successfully registered! However, there was an issue updating your local user data. Please refresh the page if you don't see your bank data immediately."
//           );
//         }
//       } else {
//         setError(
//           "No connection ID received. Bank connection might not have completed."
//         );
//         setMessage(null);
//       }

//       setLoading(false);
//     };

//     handleCallback();
//   }, [location.search, navigate, refreshUser, authLoading]);

//   if (authLoading || loading) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
//         <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
//         <p className="mt-4 text-lg text-gray-700">
//           Processing bank connection...
//         </p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-4 text-red-700">
//         <h1 className="mb-4 text-3xl font-bold">Connection Failed!</h1>
//         <p className="text-lg text-center">{error}</p>
//         <button
//           onClick={() => window.close()}
//           className="mt-8 rounded-lg bg-red-600 px-6 py-3 text-white shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
//         >
//           Close
//         </button>
//       </div>
//     );
//   }

//   if (message) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 p-4 text-green-700">
//         <h1 className="mb-4 text-3xl font-bold">Success!</h1>
//         <p className="text-xl text-center">{message}</p>
//         <div className="mt-8 h-8 w-8 animate-spin rounded-full border-b-2 border-green-500"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
//       <p className="text-gray-700">Something went wrong...</p>
//     </div>
//   );
// }

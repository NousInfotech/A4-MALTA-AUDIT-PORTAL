import React from "react";

interface FieldErrorProps {
  message?: string;
  className?: string;
}

export const ErrorMessage: React.FC<FieldErrorProps> = ({ message, className = "text-sm text-red-500 mt-1" }) => {
  if (!message) return null;
  return <p className={className}>{message}</p>;
};

export default ErrorMessage;

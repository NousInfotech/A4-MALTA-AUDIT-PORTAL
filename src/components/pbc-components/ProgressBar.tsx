// src/components/ProgressBar.tsx
import React from 'react';
import { useProgress } from '@/contexts/ProgressContext';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class merging

interface ProgressBarProps {
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ className }) => {
  const { currentStep, steps } = useProgress();

  return (
    <div className={cn("flex items-center justify-between gap-x-2 text-sm", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={stepNumber} className="flex-1 flex flex-col items-center">
            <div
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full border-2",
                isCompleted ? "bg-green-500 border-green-500 text-white" : "",
                isActive ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-200 border-gray-300 text-gray-600"
              )}
            >
              {isCompleted ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <span>{stepNumber}</span>
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-center",
                isActive ? "font-semibold text-blue-600" : "text-gray-500"
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-full top-1/2 -mt-px h-0.5 w-full bg-gray-300",
                  isCompleted ? "bg-green-500" : ""
                )}
              ></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressBar;
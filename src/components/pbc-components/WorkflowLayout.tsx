// src/components/WorkflowLayout.tsx
import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import { useProgress } from '@/contexts/ProgressContext';
import { Card, CardContent } from '@/components/ui/card'; // shadcn/ui Card components

const WorkflowLayout: React.FC = () => {
  const { setCurrentStep, steps } = useProgress();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    const stepIndex = steps.findIndex(s => s.toLowerCase().replace(/\s/g, '') === path);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex + 1);
    } else if (location.pathname === '/') {
      setCurrentStep(1); // Default to first step
      navigate('/submission', { replace: true });
    }
  }, [location.pathname, setCurrentStep, steps, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <Card className="w-full max-w-6xl shadow-lg rounded-lg overflow-hidden">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">PBC Documentation Workflow</h1>
          <ProgressBar className="mb-8" />
          <div className="border-t pt-6">
            <Outlet /> {/* Renders the current workflow step page */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowLayout;
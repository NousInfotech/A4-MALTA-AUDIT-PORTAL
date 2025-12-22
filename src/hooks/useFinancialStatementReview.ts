import { useState, useCallback } from "react";
import financialStatementReviewApi from "@/lib/api/financialStatementReview";
import { FSReviewOutput } from "@/types/fs/fs";

export type LoadingStep =
  | "uploading"
  | "extracting-engagement"
  | "extracting-pdf"
  | "validating"
  | "generating-sheets"
  | "preparing-prompt"
  | "generating-report"
  | null;

interface UseFinancialStatementReviewReturn {
  data: FSReviewOutput | null;
  loading: boolean;
  error: string | null;
  loadingStep: LoadingStep;
  generateReview: (engagementId: string, file: File, includeTests?: string[], includePortalData?: boolean) => Promise<void>;
  reset: () => void;
}

const LOADING_STEPS: { key: LoadingStep; label: string }[] = [
  { key: "uploading", label: "Uploading Financial statement" },
  { key: "extracting-engagement", label: "Extracting engagement data from portal" },
  { key: "extracting-pdf", label: "Extracting financial statement data from pdf" },
  { key: "validating", label: "Validating the fields" },
  { key: "generating-sheets", label: "Generating lead sheets, income statements, and balance sheets" },
  { key: "preparing-prompt", label: "Preparing payload and AI prompt" },
  { key: "generating-report", label: "Generating AI report on financial statements" },
];

export const useFinancialStatementReview = (): UseFinancialStatementReviewReturn => {
  const [data, setData] = useState<FSReviewOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null);

  const simulateProgress = useCallback(async (apiCall: () => Promise<FSReviewOutput>) => {
    const stepDuration = 1000; // 1 second per step
    let currentStepIndex = 0;

    // Simulate progress through steps
    const progressInterval = setInterval(() => {
      if (currentStepIndex < LOADING_STEPS.length) {
        setLoadingStep(LOADING_STEPS[currentStepIndex].key);
        currentStepIndex++;
      } else {
        clearInterval(progressInterval);
      }
    }, stepDuration);

    try {
      // Start with first step
      setLoadingStep(LOADING_STEPS[0].key);
      
      // Make the actual API call
      const result = await apiCall();
      
      // Complete all steps
      setLoadingStep(LOADING_STEPS[LOADING_STEPS.length - 1].key);
      
      // Small delay to show final step
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      clearInterval(progressInterval);
      setData(result);
      setLoadingStep(null);
    } catch (err: any) {
      clearInterval(progressInterval);
      setLoadingStep(null);
      
      // Extract error message
      let errorMessage = "An error occurred while generating the financial statement review.";
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      
      setError(errorMessage);
      throw err;
    }
  }, []);

  const generateReview = useCallback(
    async (engagementId: string, file: File, includeTests: string[] = ["ALL"], includePortalData: boolean = false) => {
      if (!engagementId) {
        setError("Engagement ID is required");
        return;
      }

      if (!file) {
        setError("File is required");
        return;
      }

      setLoading(true);
      setError(null);
      setData(null);

      try {
        await simulateProgress(() =>
          financialStatementReviewApi.generateFinancialStatementReview(engagementId, file, includeTests, includePortalData)
        );
      } catch (err) {
        // Error is already handled in simulateProgress
      } finally {
        setLoading(false);
      }
    },
    [simulateProgress]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setLoadingStep(null);
  }, []);

  return {
    data,
    loading,
    error,
    loadingStep,
    generateReview,
    reset,
  };
};

export const getLoadingStepLabel = (step: LoadingStep): string => {
  const stepInfo = LOADING_STEPS.find((s) => s.key === step);
  return stepInfo?.label || "";
};

export const getLoadingStepProgress = (step: LoadingStep): number => {
  if (!step) return 0;
  const stepIndex = LOADING_STEPS.findIndex((s) => s.key === step);
  if (stepIndex === -1) return 0;
  return Math.round(((stepIndex + 1) / LOADING_STEPS.length) * 100);
};


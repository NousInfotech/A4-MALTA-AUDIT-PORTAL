import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PBCWorkflow, QnACategory } from "@/types/pbc";

import { CategoryManager } from "./CategoryManager";
import { DocumentRequestsView } from "./DocumentRequestsView";
import { WorkflowSettings } from "./WorkflowSettings";
import { pbcApi } from "@/lib/api/pbc-workflow";

interface PBCWorkflowInfoProps {
  workflow: PBCWorkflow;
  userRole: "employee" | "client" | "admin";

  onWorkflowUpdate: (workflow: PBCWorkflow) => void;
}

export function PBCWorkflowInfo({
  workflow,
  userRole,

  onWorkflowUpdate,
}: PBCWorkflowInfoProps) {
  const [categories, setCategories] = useState<QnACategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadCategories();
  }, [workflow._id]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await pbcApi.getCategoriesByPBC(workflow._id);
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryUpdate = () => {
    loadCategories();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "document-collection": "bg-blue-500",
      "qna-preparation": "bg-yellow-500",
      "client-responses": "bg-orange-500",
      "doubt-resolution": "bg-red-500",
      submitted: "bg-green-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getTotalQuestions = () => {
    return categories.reduce(
      (total, category) => total + category.qnaQuestions.length,
      0
    );
  };

  const getAnsweredQuestions = () => {
    return categories.reduce(
      (total, category) =>
        total +
        category.qnaQuestions.filter((q) => q.status === "answered").length,
      0
    );
  };

  const getQuestionsWithDoubts = () => {
    return categories.reduce(
      (total, category) =>
        total +
        category.qnaQuestions.filter((q) => q.status === "doubt").length,
      0
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {workflow.engagement.title}
          </h1>
          <p className="text-gray-600 mt-2">
            Year End: {formatDate(workflow.engagement.yearEndDate)}
          </p>
        </div>
        <Badge className={`${getStatusColor(workflow.status)} text-white`}>
          {getStatusLabel(workflow.status)}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 border-b">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:bg-indigo-500 px-4 py-2 transition-colors"
          >
            Overview
          </TabsTrigger>

          <TabsTrigger
            value="categories"
            className="data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:bg-indigo-500 px-4 py-2 transition-colors"
          >
            Q&A Categories
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:bg-indigo-500 px-4 py-2 transition-colors"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Questions Answered
                  </span>
                  <span className="text-sm text-gray-500">
                    {getAnsweredQuestions()} of {getTotalQuestions()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${
                        getTotalQuestions() > 0
                          ? (getAnsweredQuestions() / getTotalQuestions()) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm">Workflow created</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {formatDate(workflow.createdAt)}
                    </span>
                  </div>
                  {workflow.updatedAt !== workflow.createdAt && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Last updated</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {formatDate(workflow.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Client ID:</span>
                    <span className="text-sm font-mono">
                      {workflow.clientId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Auditor ID:</span>
                    <span className="text-sm font-mono">
                      {workflow.auditorId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant="outline">
                      {getStatusLabel(workflow.status)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager
            pbcId={workflow._id}
            categories={categories}
            userRole={userRole}
            onUpdate={handleCategoryUpdate}
            workflowStatus={workflow.status}
            workflow={workflow}
          />
        </TabsContent>

        <TabsContent value="settings">
          <WorkflowSettings
            workflow={workflow}
            userRole={userRole}
            onUpdate={onWorkflowUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

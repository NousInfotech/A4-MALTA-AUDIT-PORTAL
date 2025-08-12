import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send } from 'lucide-react';

const categories = [
  "Planning",
  "Capital & Reserves",
  "Property, plant and equipment",
  "Intangible Assets",
  "Investment Property",
  "Investment in Subsidiaries & Associates investments",
  "Receivables",
  "Payables",
  "Inventory",
  "Bank & Cash",
  "Borrowings & loans",
  "Taxation",
  "Going Concern",
  "Others",
];

interface DocumentRequestsTabProps {
  requests: any[];
  documentRequest: {
    category: string;
    description: string;
  };
  setDocumentRequest: (request: any) => void;
  handleSendDocumentRequest: () => void;
}

export const DocumentRequestsTab = ({
  requests,
  documentRequest,
  setDocumentRequest,
  handleSendDocumentRequest,
}: DocumentRequestsTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Document Request</CardTitle>
          <CardDescription>
            Request specific documents from the client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={documentRequest.category}
                onValueChange={(value) =>
                  setDocumentRequest((prev) => ({
                    ...prev,
                    category: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="max-h-44 overflow-y-auto">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Request Description</Label>
            <Textarea
              id="description"
              value={documentRequest.description}
              onChange={(e) =>
                setDocumentRequest((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe the documents you need from the client..."
              rows={3}
            />
          </div>
          <Button onClick={handleSendDocumentRequest}>
            <Send className="h-4 w-4 mr-2" />
            Send Request
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Requests History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div>
                  <div className="font-medium">{request.description}</div>
                  <div className="text-sm text-muted-foreground">
                    Category: {request.category} • Requested:{" "}
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      request.status === "completed"
                        ? "outline"
                        : "secondary"
                    }
                    className={
                      request.status === "completed"
                        ? "text-success border-success"
                        : ""
                    }
                  >
                    {request.status}
                  </Badge>
                  {request.status === "completed" && (
                    <>
                      {request.documents?.map((doc) => (
                        <a href={doc.url} key={doc.name}>
                          <Badge variant="outline">
                            View {doc.name}
                          </Badge>
                        </a>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No document requests sent yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

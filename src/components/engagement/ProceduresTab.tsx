import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Bot, Loader2 } from 'lucide-react';

interface ProceduresTabProps {
  procedures: any[];
  handleGenerateProcedures: () => void;
  isGeneratingProcedures: boolean;
}

export const ProceduresTab = ({
  procedures,
  handleGenerateProcedures,
  isGeneratingProcedures,
}: ProceduresTabProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Procedures</CardTitle>
            <CardDescription>
              AI-generated procedures based on uploaded documents
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateProcedures}
            disabled={isGeneratingProcedures}
          >
            {isGeneratingProcedures ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            Generate New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {procedures.map((procedure) => (
            <Card key={procedure._id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {procedure.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {procedure.tasks.map((task) => (
                    <div
                      key={task._id}
                      className="border-l-4 border-primary/20 pl-4"
                    >
                      <div className="font-medium text-foreground mb-2">
                        {task.description}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Category: {task.category}
                      </div>
                      <div className="mt-2">
                        <Badge
                          variant={
                            task.completed ? "outline" : "secondary"
                          }
                          className={
                            task.completed
                              ? "text-success border-success"
                              : ""
                          }
                        >
                          {task.completed ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export as PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {procedures.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No procedures generated yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Generate AI-powered audit procedures based on your
                uploaded documents and trial balance data.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

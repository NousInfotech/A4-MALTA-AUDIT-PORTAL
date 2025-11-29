// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Search, Save, Edit, FileText, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { promptApi } from "@/services/api";

interface Prompt {
    _id: string;
    name: string;
    description: string;
    category: string;
    content: string;
    version: number;
    isActive: boolean;
    lastModifiedBy: string;
    createdAt: string;
    updatedAt: string;
}

export const PromptManagement = () => {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();

    const categories = [
        { value: "all", label: "All Categories" },
        { value: "Planning", label: "Planning" },
        { value: "Field Work", label: "FieldWork" },
    ];

    useEffect(() => {
        fetchPrompts();
    }, []);

    useEffect(() => {
        filterPrompts();
    }, [prompts, searchTerm, categoryFilter]);

    const fetchPrompts = async () => {
        try {
            setLoading(true);
            const response = await promptApi.get();
            setPrompts(response.prompts);
        } catch (error) {
            console.error("Error fetching prompts:", error);
            toast({
                title: "Error",
                description: "Failed to load prompts",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const filterPrompts = () => {
        let filtered = prompts;

        if (searchTerm) {
            filtered = filtered.filter(prompt =>
                prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                prompt.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (categoryFilter !== "all") {
            filtered = filtered.filter(prompt => prompt.category === categoryFilter);
        }

        setFilteredPrompts(filtered);
    };

    const savePrompt = async (prompt: Prompt) => {
        try {
            setSaving(prompt._id);
            prompt.lastModifiedBy=user.name;
            const response = await fetch(`${import.meta.env.VITE_APIURL}/api/admin/prompts`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(prompt),
            });

            if (!response.ok) throw new Error("Failed to save prompt");

            const updatedPrompt = await response.json();

            setPrompts(prev => prev.map(p =>
                p._id === updatedPrompt.prompt._id ? updatedPrompt.prompt : p
            ));

            setEditingPrompt(null);

            toast({
                title: "Success",
                description: "Prompt updated successfully",
            });
            fetchPrompts()
        } catch (error) {
            console.error("Error saving prompt:", error);
            toast({
                title: "Error",
                description: "Failed to save prompt",
                variant: "destructive",
            });
        } finally {
            setSaving(null);
        }
    };

    const getCategoryColor = (category: string) => {
        const colors = {
            "Planning": "bg-blue-100 text-blue-800 hover:text-blue-100 hover:bg-blue-800",
            "Field Work": "bg-purple-100 text-purple-800 hover:text-purple-100 hover:bg-purple-800",
        };
        return colors[category] || "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="min-h-screen  bg-brand-body p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <EnhancedLoader size="lg" text="Loading prompts..." />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen  bg-brand-body p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold text-brand-body mb-2">AI Prompt Management</h1>
                    <p className="text-brand-body">
                        Manage and edit AI prompts used across the audit portal
                    </p>
                </div>

                {/* Filters */}
                <Card className="bg-white/80 border border-white/50 rounded-2xl p-6 mb-6 shadow-lg shadow-gray-300/30">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search prompts by name or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white border-gray-300 rounded-xl"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-64 bg-white border-gray-300 rounded-xl">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(category => (
                                    <SelectItem key={category.value} value={category.value}>
                                        {category.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={fetchPrompts}
                            variant="outline"
                            className="border-gray-300 rounded-xl"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </Card>

                {/* Prompts Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {filteredPrompts.map((prompt) => (
                        <Card
                            key={prompt._id}
                            className="bg-white/80 border border-white/50 rounded-2xl hover:bg-white/90 shadow-lg shadow-gray-300/30 transition-all duration-300"
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CardTitle className="text-xl text-gray-900">
                                                {prompt.name}
                                            </CardTitle>
                                            <Badge className={getCategoryColor(prompt.category)}>
                                                {prompt.category}
                                            </Badge>
                                            {prompt.isActive ? (
                                                <Badge className="bg-green-100 text-green-800 hover:text-green-100 hover:bg-green-800">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </div>
                                        <CardDescription className="text-gray-700">
                                            {prompt.description}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-gray-600">
                                            v{prompt.version}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            onClick={() => setEditingPrompt(editingPrompt?._id === prompt._id ? null : prompt)}
                                            className="rounded-lg"
                                        >
                                            <Edit className="h-4 w-4 mr-1" />
                                            {editingPrompt?._id === prompt._id ? "Cancel" : "Edit"}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                {editingPrompt?._id === prompt._id ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-900">Name</label>
                                                <Input
                                                    disabled={true}

                                                    value={editingPrompt.name}
                                                    onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                                                    className="bg-white border-gray-300 rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-900">Category</label>
                                                <Select


                                                    value={editingPrompt.category}
                                                    onValueChange={(value) => setEditingPrompt({ ...editingPrompt, category: value })}
                                                >
                                                    <SelectTrigger className="bg-white border-gray-300 rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.filter(c => c.value !== "all").map(category => (
                                                            <SelectItem key={category.value} value={category.value}>
                                                                {category.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-900">Description</label>
                                            <Input

                                                value={editingPrompt.description}
                                                onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                                                className="bg-white border-gray-300 rounded-xl"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-900">Prompt Content</label>
                                            <Textarea
                                                value={editingPrompt.content}
                                                onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                                                className="min-h-[300px] bg-white border-gray-300 rounded-xl font-mono text-sm"
                                                placeholder="Enter prompt content..."
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-4">
                                            <div className="flex items-center gap-4">
                                                {/* <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingPrompt.isActive}
                            onChange={(e) => setEditingPrompt({ ...editingPrompt, isActive: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Active</span>
                        </label> */}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setEditingPrompt(null)}
                                                    className="rounded-xl border-gray-300"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={() => savePrompt(editingPrompt)}
                                                    disabled={saving === prompt._id}
                                                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary"
                                                >
                                                    {saving === prompt._id ? (
                                                        <>
                                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            Save Changes
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <div className="flex items-center gap-4">
                                                <span>Last modified by: {prompt.lastModifiedBy}</span>
                                                <span>Updated: {new Date(prompt.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                <span>{prompt.content.length} characters</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                                                {prompt.content.length > 500
                                                    ? `${prompt.content.substring(0, 500)}...`
                                                    : prompt.content
                                                }
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {filteredPrompts.length === 0 && (
                        <Card className="bg-white/80 border border-white/50 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No prompts found</h3>
                            <p className="text-gray-600">
                                {searchTerm || categoryFilter !== "all"
                                    ? "Try adjusting your search filters"
                                    : "No prompts available"
                                }
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
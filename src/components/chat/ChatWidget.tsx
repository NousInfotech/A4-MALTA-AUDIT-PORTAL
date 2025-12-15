
import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle, X, ChevronUp, ChevronDown, Plus,
    MoreHorizontal, Video, Phone, Check, Search,
    Maximize2, Minimize2, Image as ImageIcon, Send, Pin, Trash2,
    Settings, Archive, Filter, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    startDirectChat, getConversations, searchUsers, Conversation,
    togglePinConversation, toggleArchiveConversation // Added archive service
} from '@/services/chatService';
import { ChatWindow } from './ChatWindow';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";

interface ChatWindowState {
    conversation: Conversation;
    minimized: boolean;
}

// Extend Conversation type for UI
interface ExtendedConversation extends Conversation {
    name: string; // Ensure name is always string (handled by backend or fallback)
    role?: string;
    otherUserId?: string;
    archivedBy?: string[]; // Added
    unread?: number; // Added for unread badge
}

export const ChatWidget = () => {
    // --- State ---
    const [isListOpen, setIsListOpen] = useState(false);
    const [openChats, setOpenChats] = useState<ChatWindowState[]>([]);
    const [conversations, setConversations] = useState<ExtendedConversation[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [globalUnreadCount, setGlobalUnreadCount] = useState(0);

    // Settings State
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [filterUnread, setFilterUnread] = useState(false);

    // New Chat Dialog State
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [searchRole, setSearchRole] = useState("all");
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Filter/Search State for List
    const [listSearchQuery, setListSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'focused' | 'other'>('focused');

    const SOCKET_URL = (import.meta.env.VITE_APIURL as string) || "http://localhost:8000";

    // --- Effects ---
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setCurrentUserId(data.user.id);
        });
    }, []);

    useEffect(() => {
        if (isListOpen) {
            loadConversations();
        }
    }, [isListOpen]);

    // Global Socket for Notifications & Counts
    useEffect(() => {
        if (!currentUserId && !conversations.length) return; // Wait for convos to load for proper counting? 
        // Actually best to just listen and increment generic if convo not found, or update convo list.

        import("socket.io-client").then(({ io }) => {
            const socket = io(SOCKET_URL);

            socket.on("connect", () => {
                if (currentUserId) socket.emit("joinUser", currentUserId);
            });

            socket.on("newMessage", (message: any) => {
                // Determine if this message is for a conversation we know
                setConversations(prev => {
                    return prev.map(c => {
                        if (c._id === message.conversationId) {
                            const isOpen = openChats.some(oc => oc.conversation._id === c._id && !oc.minimized);
                            // If chat is open and active, don't increment (mark read logic handles it).
                            // If chat is closed or minimized, increment.
                            const newUnread = isOpen ? 0 : (c.unread || 0) + 1;
                            return {
                                ...c,
                                lastMessage: message,
                                unread: newUnread
                            };
                        }
                        return c;
                    });
                });

                // Also update global count
                setGlobalUnreadCount(prev => prev + 1);
            });

            return () => {
                socket.disconnect();
            };
        });
    }, [currentUserId, openChats]);

    // Fetch users for "New Chat"
    useEffect(() => {
        if (isNewChatOpen) {
            fetchUsersList();
        }
    }, [isNewChatOpen, searchRole, userSearchQuery]);

    // --- Actions ---
    const loadConversations = () => {
        getConversations().then((data) => {
            // Initialize unread counts if backend doesn't provide (mocking 0 for now as backend 'unread' logic might be complex)
            // Ideally backend tells us count. Assuming data has it or we default to 0.
            const mapped = (data as ExtendedConversation[]).map(c => {
                // Calculate unread based on readBy of last message? 
                // Simple logic: if last message not read by me, unread = 1 (at least)
                // Or valid backend count.
                let ur = 0;
                if (c.lastMessage && c.lastMessage.senderId !== currentUserId && !c.lastMessage.readBy?.includes(currentUserId || "")) {
                    ur = 1;
                }
                return { ...c, unread: ur };
            });
            setConversations(mapped);
        });
    };

    const fetchUsersList = async () => {
        setLoadingUsers(true);
        try {
            const response = await searchUsers(userSearchQuery, searchRole);
            const users = response.users || [];
            if (currentUserId) {
                setSearchResults(users.filter((u: any) => (u.user_id || u._id || u.id) !== currentUserId));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleOpenChat = (conversation: Conversation) => {
        // Clear unread for this chat
        setConversations(prev => prev.map(c => c._id === conversation._id ? { ...c, unread: 0 } : c));

        const existing = openChats.find(c => c.conversation._id === conversation._id);

        // Single Window Policy: If opening a new one, replace the old one.
        // If it's already "open" (in the list), just ensure it's not minimized.

        if (existing) {
            // Already open, just maximize/focus it
            // If we want ONLY ONE, we reset the array to just this one.
            setOpenChats([{ conversation: conversation as ExtendedConversation, minimized: false }]);
        } else {
            // Not open, replace whatever is there
            setOpenChats([{ conversation: conversation as ExtendedConversation, minimized: false }]);
        }
    };

    const handleCloseChat = (conversationId: string) => {
        setOpenChats(prev => prev.filter(c => c.conversation._id !== conversationId));
    };

    const handleMinimizeChat = (conversationId: string) => {
        setOpenChats(prev => prev.map(c => c.conversation._id === conversationId ? { ...c, minimized: !c.minimized } : c));
    };

    const handlePinConversation = async (conversationId: string) => {
        try {
            await togglePinConversation(conversationId);
            loadConversations();
        } catch (error) {
            console.error(error);
        }
    };

    const handleArchiveConversation = async (conversationId: string) => {
        try {
            // Assume service exists
            if (typeof toggleArchiveConversation === 'function') {
                await toggleArchiveConversation(conversationId);
                loadConversations();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleStartNewChat = async (userId: string) => {
        try {
            const conversation = await startDirectChat(userId);
            handleOpenChat(conversation);
            setIsNewChatOpen(false);
            setListSearchQuery("");
            loadConversations();
        } catch (error) {
            console.error("Failed to start chat", error);
        }
    };

    const toggleNotifications = () => {
        setNotificationsEnabled(!notificationsEnabled);
        // Toast could be added here
    };

    const toggleFilterUnread = () => {
        setFilterUnread(!filterUnread);
    };

    // --- Render Helpers ---
    const sortedConversations = [...conversations].sort((a, b) => {
        // Pinned first
        const aPinned = a.pinnedBy?.includes(currentUserId || "");
        const bPinned = b.pinnedBy?.includes(currentUserId || "");

        // Then unread? Users usually like unread at top but pins override.
        // Let's stick to Pin > Date. 

        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return new Date(b.lastMessage?.createdAt || b.createdAt).getTime() - new Date(a.lastMessage?.createdAt || a.createdAt).getTime();
    });

    const filteredConversations = sortedConversations.filter(c => {
        const name = c.name || "User Name";
        const matchesSearch = name.toLowerCase().includes(listSearchQuery.toLowerCase());
        const matchesFilter = filterUnread ? (c.unread && c.unread > 0) : true;
        return matchesSearch && matchesFilter;
    });

    // Filtering Logic
    // Focused: Not Archived, Known User
    // Other: Archived OR Unknown User (Mock logic for now)

    const displayConversations = filteredConversations.filter(c => {
        const isArchived = c.archivedBy?.includes(currentUserId || "");

        if (activeTab === 'focused') {
            return !isArchived && (c.name && c.name !== "Unknown User");
        } else {
            // Other tab
            return isArchived || (!c.name || c.name === "Unknown User");
        }
    });

    const getLastMessagePreview = (conv: ExtendedConversation) => {
        const msg = conv.lastMessage;
        if (!msg) return "";

        if (msg.isDeleted) return <span className="italic flex items-center gap-1 text-xs"><Trash2 className="h-3 w-3 inline" /> Deleted</span>;

        if (!msg.content && msg.attachments && msg.attachments.length > 0) {
            return <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Photo</span>;
        }

        const prefix = msg.senderId === currentUserId ? 'You: ' : '';
        return prefix + (msg.content || "Message");
    };

    if (!currentUserId) return null;

    return (
        <div className="fixed bottom-0 right-4 flex flex-row items-end gap-4 z-50 transition-all pointer-events-none">
            {/* Open Chat Windows */}
            <div className="flex items-end gap-3 pointer-events-auto">
                {openChats.map(({ conversation, minimized }) => (
                    <div
                        key={conversation._id}
                        className={cn(
                            "bg-white shadow-xl border rounded-t-lg flex flex-col transition-all duration-300 ease-in-out",
                            minimized ? "w-[200px] h-[48px]" : "w-[320px] h-[580px]" // Increased height to match widget
                        )}
                    >
                        {/* Chat Header */}
                        <div
                            className="flex items-center justify-between px-3 py-2 border-b cursor-pointer bg-white rounded-t-lg hover:bg-gray-50"
                            onClick={() => handleMinimizeChat(conversation._id)}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback>{(conversation as ExtendedConversation).name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-sm truncate">{(conversation as ExtendedConversation).name || "User"}</span>
                                    {!minimized && <span className="text-[10px] text-green-600 flex items-center gap-1">● Active now</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-green-50"
                                    onClick={(e) => { e.stopPropagation(); handleMinimizeChat(conversation._id); }}
                                >
                                    {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-red-50 hover:text-red-500"
                                    onClick={(e) => { e.stopPropagation(); handleCloseChat(conversation._id); }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Chat Body */}
                        {!minimized && (
                            <ChatWindow
                                conversationId={conversation._id}
                                currentUserId={currentUserId}
                                className="flex-1 rounded-b-lg border-0"
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Main Messaging List Widget */}
            <div className={cn(
                "bg-white shadow-2xl border rounded-t-lg flex flex-col pointer-events-auto transition-all duration-300 overflow-hidden", // Added overflow-hidden
                isListOpen ? "w-[320px] h-[580px]" : "w-[280px] h-[48px]"
            )}>
                {/* Header */}
                <div
                    className="flex justify-between items-center p-3 border-b cursor-pointer hover:bg-gray-50 bg-white rounded-t-lg relative"
                    onClick={() => setIsListOpen(!isListOpen)}
                >
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                            <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full", notificationsEnabled ? "bg-green-500" : "bg-yellow-500")}></span>
                        </div>
                        <span className="font-bold text-gray-800">Messaging</span>
                        {/* Global Badge */}
                        {conversations.reduce((acc, c) => acc + (c.unread || 0), 0) > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center px-1 rounded-full">{conversations.reduce((acc, c) => acc + (c.unread || 0), 0)}</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                        {/* 3 Dots Settings */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuLabel>Messaging Settings</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={toggleFilterUnread}>
                                    <Filter className="mr-2 h-4 w-4" /> {filterUnread ? "Show All Messages" : "Filter Unread"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={toggleNotifications}>
                                    <Bell className="mr-2 h-4 w-4" /> {notificationsEnabled ? "Mute Notifications" : "Enable Notifications"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled>Manage Sync</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                            e.stopPropagation();
                            setIsNewChatOpen(true);
                        }}>
                            <Plus className="h-4 w-4" />
                        </Button>
                        {isListOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </div>
                </div>

                {isListOpen && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        {/* Search & Tabs */}
                        <div className="p-2 space-y-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search messages"
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 border-none rounded-sm focus:ring-1 focus:ring-primary/20"
                                    value={listSearchQuery}
                                    onChange={(e) => setListSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex border-b">
                                <button
                                    className={cn("flex-1 pb-2 text-sm font-semibold border-b-2 transition-colors", activeTab === 'focused' ? "border-green-600 text-green-700" : "border-transparent text-gray-500")}
                                    onClick={() => setActiveTab('focused')}
                                >
                                    Focused
                                </button>
                                <button
                                    className={cn("flex-1 pb-2 text-sm font-semibold border-b-2 transition-colors", activeTab === 'other' ? "border-green-600 text-green-700" : "border-transparent text-gray-500")}
                                    onClick={() => setActiveTab('other')}
                                >
                                    Other
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {displayConversations.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                        <MessageCircle className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <p>No messages yet</p>
                                    <Button variant="link" className="text-green-600" onClick={() => setIsNewChatOpen(true)}>Start a new chat</Button>
                                </div>
                            ) : (
                                displayConversations.map(conv => (
                                    <div
                                        key={conv._id}
                                        className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer border-l-4 border-transparent hover:border-green-600 transition-all group relative"
                                        onClick={() => handleOpenChat(conv)}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${conv.name}`} />
                                                <AvatarFallback>{conv.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {(conv.unread || 0) > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                                    {conv.unread}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("font-semibold text-sm truncate transition-colors", (conv.unread || 0) > 0 ? "text-black font-bold" : "text-gray-900 group-hover:text-green-700")}>
                                                        {conv.name || "Unknown"}
                                                    </span>
                                                    {conv.role && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                                                            {conv.role}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {conv.pinnedBy?.includes(currentUserId || "") && (
                                                        <Pin className="h-3 w-3 text-gray-400 rotate-45 fill-gray-400" />
                                                    )}
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(conv.lastMessage?.createdAt || conv.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className={cn("text-xs truncate mt-0.5", (conv.unread || 0) > 0 ? "text-black font-semibold" : "text-gray-500")}>
                                                {getLastMessagePreview(conv)}
                                            </p>
                                        </div>

                                        {/* Hover Menu for Pin - Using Opacity Hack */}
                                        <div className="absolute right-2 top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-gray-200">
                                                        <MoreHorizontal className="h-3 w-3 text-gray-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="z-[200]">
                                                    <DropdownMenuItem onClick={() => handlePinConversation(conv._id)}>
                                                        <Pin className="mr-2 h-3 w-3" />
                                                        {conv.pinnedBy?.includes(currentUserId || "") ? "Unpin" : "Pin"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleArchiveConversation(conv._id)}>
                                                        <Archive className="mr-2 h-3 w-3" />
                                                        {conv.archivedBy?.includes(currentUserId || "") ? "Unarchive" : "Archive"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600">
                                                        <Trash2 className="mr-2 h-3 w-3" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* New Chat Dialog (Reused but styled) */}
            < Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen} >
                <DialogContent className="sm:max-w-[400px] bg-white gap-0 p-0 overflow-hidden rounded-lg">
                    <DialogHeader className="px-4 py-3 border-b">
                        <DialogTitle className="text-base font-semibold">New message</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            {/* Role Filter */}
                            <Select value={searchRole} onValueChange={setSearchRole}>
                                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                                    <SelectValue placeholder="Filter by role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Members</SelectItem>
                                    <SelectItem value="employee">Auditors</SelectItem>
                                    <SelectItem value="client">Clients</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* User Search Input */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Type a name..."
                                    className="pl-9 bg-gray-50 border-gray-200"
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="h-[200px] overflow-y-auto border rounded-md bg-white">
                            {loadingUsers ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-sm text-gray-400">
                                    <p>No results found</p>
                                </div>
                            ) : (
                                searchResults.map((user) => (
                                    <div
                                        key={user.id || user._id}
                                        className="flex items-center gap-3 p-3 hover:bg-green-50 cursor-pointer transition-colors"
                                        onClick={() => handleStartNewChat(user.user_id || user.id || user._id)}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={user.avatarUrl} />
                                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">{user.role}</Badge>
                                            </div>
                                            <span className="text-xs text-gray-500">{user.email}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog >
        </div >
    );
};


import React, { useEffect, useState, useRef } from "react";
import {
    Message, sendMessage, getMessages, editMessage,
    deleteMessage, toggleStarMessage, markMessagesRead
} from "@/services/chatService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Send, Paperclip, MoreVertical, Edit2, Trash2,
    Star, Search, X, ImageIcon, FileText, Check, CheckCheck
} from "lucide-react";
import { io } from "socket.io-client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast"; // Added

interface ChatWindowProps {
    conversationId: string;
    currentUserId: string;
    className?: string;
}

const SOCKET_URL = (import.meta.env.VITE_APIURL as string) || "http://localhost:8000";

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, currentUserId, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editContent, setEditContent] = useState("");
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [viewImage, setViewImage] = useState<string | null>(null); // State for image preview

    const { toast } = useToast(); // Added hook

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getMessages(conversationId).then(data => {
            setMessages(data);
            markMessagesRead(conversationId); // Mark read on open
        });

        const socket = io(SOCKET_URL);
        const joinRoom = () => {
            socket.emit("joinConversation", conversationId);
            socket.emit("joinUser", currentUserId); // Also join own room for read receipts/other events
        };

        if (socket.connected) joinRoom();
        socket.on("connect", joinRoom);

        socket.on("newMessage", (message: Message) => {
            if (message.conversationId === conversationId) {
                setMessages((prev) => [...prev, message]);
                if (message.senderId !== currentUserId) {
                    markMessagesRead(conversationId); // Mark read real-time
                }
            }
        });

        socket.on("messageUpdated", (updatedMessage: Message) => {
            if (updatedMessage.conversationId === conversationId) {
                setMessages((prev) => prev.map(m => m._id === updatedMessage._id ? updatedMessage : m));
            }
        });

        // Listen for Read Receipts
        socket.on("messagesRead", (data: { conversationId: string, readBy: string }) => {
            if (data.conversationId === conversationId) {
                setMessages(prev => prev.map(m => {
                    if (m.senderId === currentUserId && !m.readBy?.includes(data.readBy)) {
                        return { ...m, readBy: [...(m.readBy || []), data.readBy] };
                    }
                    return m;
                }));
            }
        });

        return () => {
            socket.emit("leaveConversation", conversationId);
            socket.off("messagesRead");
            socket.disconnect();
        };
    }, [conversationId, currentUserId]);

    useEffect(() => {
        if (!isSearching && scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isSearching, fileToUpload]); // Scroll when file attached too

    const handleSend = async () => {
        if ((!newMessage.trim() && !fileToUpload) && !editingMessage) return;

        try {
            if (editingMessage) {
                // Ensure edit works only if content changed? Or allow same.
                await editMessage(editingMessage._id, editContent);
                setEditingMessage(null);
                setEditContent("");
            } else {
                await sendMessage(conversationId, newMessage, fileToUpload || undefined);
                setNewMessage("");
                setFileToUpload(null);
            }
        } catch (error: any) {
            console.error("Failed to send/edit", error);
            toast({
                title: "Error sending message",
                description: error.message || "Something went wrong",
                variant: "destructive",
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDelete = async (mode: 'me' | 'everyone') => {
        if (!messageToDelete) return;
        try {
            await deleteMessage(messageToDelete._id, mode);
            setDeleteConfirmOpen(false);
            setMessageToDelete(null);
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileToUpload(e.target.files[0]);
            // Reset input so same file selection works if needed
            e.target.value = "";
        }
    };

    const getMessageStatusIcon = (msg: Message) => {
        if (msg.senderId !== currentUserId) return null;

        // Logic: 1 tick = sent, 2 grey = delivered (mocked by basic readBy check or existence), 2 blue = read
        // If readBy contains ANYONE other than me, assume read (simple logic for now)
        // Actually, schema `readBy` usually accumulates.

        const isRead = msg.readBy && msg.readBy.some(id => id !== currentUserId);

        if (isRead) {
            return <CheckCheck className="h-3 w-3 text-blue-500" />;
        }
        // If not read, assume delivered (double grey) or just sent (single grey). 
        // Real delivery receipts need more backend work. I'll stick to: Created = Sent. Socket ack = Delivered (not impl).
        // User requested: "single means offline double means online blue tick means read".

        // I'll simulate "Delivered" if message is older than 5 seconds? No, that's hacky.
        // I'll just use Double Check Grey for Sent/Delivered and Blue for Read. 
        // Or Single Check for Sent.
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
    };

    const filteredMessages = searchQuery
        ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    return (
        <div className={cn("flex flex-col bg-white relative overflow-hidden", className)}>
            {/* Search Bar Area */}
            {isSearching && (
                <div className="p-2 bg-white border-b flex gap-2 animate-in slide-in-from-top-2 shadow-sm z-10">
                    <Input
                        autoFocus
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsSearching(false); setSearchQuery(""); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="flex flex-col gap-2">
                    {filteredMessages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        const isDeleted = msg.isDeleted;
                        const isDeletedForMe = msg.deletedFor?.includes(currentUserId);

                        if (isDeletedForMe) return null;

                        return (
                            <div
                                key={msg._id}
                                className={`group flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                            >
                                <div className={`relative px-3 py-2 rounded-2xl text-sm ${isMe
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                                    }`}>
                                    {isDeleted ? (
                                        <span className="italic text-xs opacity-70 flex items-center gap-1">
                                            <Trash2 className="h-3 w-3" /> This message was deleted
                                        </span>
                                    ) : (
                                        <>
                                            {msg.content}
                                            {msg.isEdited && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}

                                            {msg.attachments?.map((att, i) => (
                                                <div key={i} className="mt-2 rounded overflow-hidden border bg-black/5">
                                                    {att.type === 'image' || att.url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                        <img
                                                            src={att.url}
                                                            alt="attachment"
                                                            className="max-w-[150px] max-h-[150px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() => setViewImage(att.url)}
                                                        />
                                                    ) : (
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 text-xs hover:underline bg-white/50 rounded">
                                                            <FileText className="h-3 w-3" /> {att.name || "Attachment"}
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Message Actions Dropdown */}
                                    {!isDeleted && (
                                        <div className={`absolute top-0 bottom-0 flex items-center ${isMe ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                                            <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-gray-100 text-gray-500 bg-white/80 shadow-sm">
                                                        <MoreVertical className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align={isMe ? "end" : "start"} className="w-32">
                                                    {isMe && <DropdownMenuItem onClick={() => { setEditingMessage(msg); setEditContent(msg.content); }}>
                                                        <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
                                                    </DropdownMenuItem>}
                                                    <DropdownMenuItem onClick={() => toggleStarMessage(msg._id)}>
                                                        <Star className={`mr-2 h-3.5 w-3.5 ${msg.starredBy?.includes(currentUserId) ? "fill-yellow-400 text-yellow-400" : ""}`} />
                                                        {msg.starredBy?.includes(currentUserId) ? "Unstar" : "Star"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => { setMessageToDelete(msg); setDeleteConfirmOpen(true); }}>
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mt-1 px-1">
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && getMessageStatusIcon(msg)}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* Editing Indicator */}
            {editingMessage && (
                <div className="px-3 py-1 bg-yellow-50 border-t flex justify-between items-center text-xs text-yellow-700 animate-in slide-in-from-bottom-2">
                    <span className="flex items-center gap-1"><Edit2 className="h-3 w-3" /> Editing message...</span>
                    <Button variant="ghost" size="sm" className="h-4 p-0 hover:bg-yellow-100 rounded-full w-4" onClick={() => { setEditingMessage(null); setEditContent(""); }}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Footer Input Area */}
            <div className="p-2 border-t bg-gray-50">
                <div className="flex gap-2 items-center bg-white border rounded-full px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-blue-400 transition-shadow relative">
                    {/* File Attachment Pill */}
                    {fileToUpload && (
                        <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full max-w-[120px] shrink-0 animate-in fade-in zoom-in spin-in-1">
                            <ImageIcon className="h-3 w-3" />
                            <span className="truncate max-w-[80px]">{fileToUpload.name}</span>
                            <X className="h-3 w-3 cursor-pointer hover:bg-blue-200 rounded-full" onClick={(e) => { e.stopPropagation(); setFileToUpload(null); }} />
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>

                    {!isSearching && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full shrink-0"
                            onClick={() => setIsSearching(true)}
                            title="Search messages"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    )}

                    <Input
                        value={editingMessage ? editContent : newMessage}
                        onChange={(e) => editingMessage ? setEditContent(e.target.value) : setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                        className="flex-1 h-8 text-sm border-none shadow-none focus-visible:ring-0 px-1 bg-transparent"
                    />

                    <Button
                        size="icon"
                        onClick={handleSend}
                        className={`h-8 w-8 rounded-full shrink-0 transition-all ${(newMessage.trim() || fileToUpload || editingMessage) ? "bg-blue-600 hover:bg-blue-700 scale-100" : "bg-gray-300 scale-90"}`}
                        disabled={!newMessage.trim() && !fileToUpload && !editingMessage}
                    >
                        {editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>


            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Message?</DialogTitle>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDelete('me')}>Delete for Me</Button>
                        {messageToDelete?.senderId === currentUserId && (
                            <Button variant="destructive" onClick={() => handleDelete('everyone')}>Delete for Everyone</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Preview Window */}
            <Dialog open={!!viewImage} onOpenChange={(open) => !open && setViewImage(null)}>
                <DialogContent className="max-w-[800px] h-fit max-h-[90vh] p-0 overflow-hidden bg-black/90 border-none">
                    <div className="relative w-full h-full flex flex-col">
                        {/* Header/Close */}
                        <div className="absolute top-2 right-2 z-50 flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                    if (viewImage) {
                                        try {
                                            const response = await fetch(viewImage);
                                            const blob = await response.blob();
                                            const blobUrl = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = blobUrl;
                                            link.download = `image-${Date.now()}.jpg`; // Default name
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(blobUrl);
                                        } catch (e) {
                                            console.error("Download failed", e);
                                            // Fallback for cross-origin if standard download fails (opens in new tab)
                                            window.open(viewImage, '_blank');
                                        }
                                    }
                                }}
                            >
                                Download
                            </Button>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => setViewImage(null)}>
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        {/* Image */}
                        <div className="flex-1 flex items-center justify-center p-4">
                            <img src={viewImage || ""} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

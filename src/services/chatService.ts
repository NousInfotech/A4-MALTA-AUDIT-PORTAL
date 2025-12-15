import { supabase } from "@/integrations/supabase/client";

const API_BASE = (import.meta.env.VITE_APIURL as string) || "http://localhost:8000";

async function getAuthToken() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session?.access_token
}

export interface Message {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    attachments?: {
        url: string;
        type: 'image' | 'file';
        name: string;
    }[];
    createdAt: string;
    isEdited: boolean;
    isDeleted: boolean;
    starredBy?: string[];
    deletedFor?: string[];
    pinned?: boolean;
    readBy?: string[]; // Added
}

export interface Conversation {
    _id: string;
    type: 'direct' | 'group';
    name?: string;
    createdAt: string;
    participants: string[];
    lastMessage?: Message;
    pinnedBy?: string[];
}

// Start a direct chat
export const startDirectChat = async (otherUserId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/conversations/direct`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ otherUserId })
    });

    if (!res.ok) throw new Error('Failed to start chat');
    return res.json();
};

// Create Group Chat
export const createGroupChat = async (name: string, userIds: string[]) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/conversations/group`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, userIds })
    });

    if (!res.ok) throw new Error('Failed to create group chat');
    return res.json();
};

// Send Message
export const sendMessage = async (conversationId: string, content: string, file?: File) => {
    const token = await getAuthToken();
    let attachments = [];

    if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${conversationId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('chat_files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('chat_files').getPublicUrl(filePath);
        attachments.push({
            url: data.publicUrl,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name
        });
    }

    const res = await fetch(`${API_BASE}/api/chat/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ conversationId, content, attachments })
    });

    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
};

export const editMessage = async (messageId: string, content: string) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/messages/${messageId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content })
    });

    if (!res.ok) throw new Error('Failed to edit message');
    return res.json();
};

export const deleteMessage = async (messageId: string, mode: 'me' | 'everyone') => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/messages/${messageId}/delete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ mode })
    });

    if (!res.ok) throw new Error('Failed to delete message');
    return res.json();
};

export const toggleStarMessage = async (messageId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/messages/${messageId}/star`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to star message');
    return res.json();
};

export const togglePinConversation = async (conversationId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/conversations/${conversationId}/pin`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to pin conversation');
    return res.json();
};

export const toggleArchiveConversation = async (conversationId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/conversations/${conversationId}/archive`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error('Failed to archive conversation');
    return res.json();
};

export const markMessagesRead = async (conversationId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/conversations/${conversationId}/read`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error('Failed to mark messages as read');
    return res.json();
};

export const searchMessages = async (query: string, conversationId?: string) => {
    const token = await getAuthToken();
    let url = `${API_BASE}/api/chat/search?query=${encodeURIComponent(query)}`;
    if (conversationId) url += `&conversationId=${conversationId}`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to search messages');
    return res.json();
};

export const getConversations = async () => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
};

export const getMessages = async (conversationId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/chat/conversations/${conversationId}/messages`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
};

export const searchUsers = async (query: string, role?: string) => {
    const token = await getAuthToken();
    let url = `${API_BASE}/api/users?search=${encodeURIComponent(query)}`;

    if (role && role !== 'all') {
        url += `&role=${encodeURIComponent(role)}`;
    }

    const res = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to search users');
    return res.json();
};

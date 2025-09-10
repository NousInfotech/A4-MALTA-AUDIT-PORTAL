import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Reply, Send } from 'lucide-react';
import { Discussion } from '@/types/pbc';
import { pbcApi } from '@/lib/api/pbc-workflow';


interface QuestionDiscussionProps {
  categoryId: string;
  questionIndex: number;
  discussions: Discussion[];
  onUpdate: () => void;
}

export function QuestionDiscussion({
  categoryId,
  questionIndex,
  discussions,
  onUpdate,
}: QuestionDiscussionProps) {
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  const handleAddDiscussion = async () => {
    if (!newMessage.trim()) return;

    try {
      await pbcApi.addDiscussion(categoryId, questionIndex, {
        message: newMessage.trim(),
      });
      setNewMessage('');
      onUpdate();
    } catch (error) {
      console.error('Error adding discussion:', error);
    }
  };

  const handleReply = async (replyToId: string) => {
    if (!replyMessage.trim()) return;

    try {
      await pbcApi.addDiscussion(categoryId, questionIndex, {
        message: replyMessage.trim(),
        replyTo: replyToId,
      });
      setReplyMessage('');
      setShowReplyForm(null);
      onUpdate();
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getReplies = (discussionId: string) => {
    return discussions.filter(d => d.replyTo === discussionId);
  };

  const getTopLevelDiscussions = () => {
    return discussions.filter(d => !d.replyTo);
  };

  return (
    <Card className="bg-gray-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Discussion ({discussions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {getTopLevelDiscussions().map((discussion) => (
          <div key={discussion._id} className="space-y-2">
            <div className="bg-white p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-700">
                  User {discussion.createdBy}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(discussion.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-900">{discussion.message}</p>
              <div className="flex justify-end mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(discussion._id)}
                  className="text-xs"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>
            </div>

            {/* Replies */}
            {getReplies(discussion._id).map((reply) => (
              <div key={reply._id} className="ml-6">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-blue-700">
                      User {reply.createdBy}
                    </span>
                    <span className="text-xs text-blue-600">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-blue-900">{reply.message}</p>
                </div>
              </div>
            ))}

            {/* Reply form */}
            {showReplyForm === discussion._id && (
              <div className="ml-6 space-y-2">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReply(discussion._id)}
                    className="flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Send Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReplyForm(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* New message form */}
        <div className="space-y-2 pt-2 border-t">
          <Textarea
            placeholder="Start a discussion..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            onClick={handleAddDiscussion}
            className="flex items-center gap-1"
          >
            <Send className="h-3 w-3" />
            Send Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { noticeBoardApi } from '@/services/api';

enum RoleEnum {
  ADMIN = "admin",
  EMPLOYEE = "employee",
  CLIENT = "client",
}

enum NoticeTypeEnum {
  EMERGENCY = "emergency",
  WARNING = "warning",
  UPDATE = "update",
  ANNOUNCEMENT = "announcement",
  REMINDER = "reminder",
  INFO = "info",
  SUCCESS = "success"
}

interface NoticeBoard {
  id: string;
  title: string;
  description: string;
  roles: RoleEnum[];
  createdBy: "admin" | "super-admin";
  type: NoticeTypeEnum;
  createdAt: Date;
  updatedAt: Date;
}

interface NoticeBoardFormProps {
  notice?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNoticeCreated?: () => void;
}

export const NoticeBoardForm = ({ 
  notice, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  onNoticeCreated 
}: NoticeBoardFormProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NoticeTypeEnum>(NoticeTypeEnum.ANNOUNCEMENT);
  const [selectedRoles, setSelectedRoles] = useState<RoleEnum[]>([]);
  const [priority, setPriority] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!notice;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Load notice data when editing
  React.useEffect(() => {
    if (notice && open) {
      setTitle(notice.title || '');
      setDescription(notice.description || '');
      setType(notice.type || NoticeTypeEnum.ANNOUNCEMENT);
      setSelectedRoles(notice.roles || []);
      setPriority(notice.priority || 0);
      setIsActive(notice.isActive !== undefined ? notice.isActive : true);
      if (notice.expiresAt) {
        const date = new Date(notice.expiresAt);
        setExpiresAt(date.toISOString().split('T')[0]);
      } else {
        setExpiresAt('');
      }
    } else if (!notice && open) {
      // Reset form for new notice
      setTitle('');
      setDescription('');
      setType(NoticeTypeEnum.ANNOUNCEMENT);
      setSelectedRoles([]);
      setPriority(0);
      setExpiresAt('');
      setIsActive(true);
    }
  }, [notice, open]);

  const handleRoleToggle = (role: RoleEnum) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (selectedRoles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one role.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const noticeData: any = {
        title: title.trim(),
        description: description.trim(),
        roles: selectedRoles,
        type: type,
        priority: priority || 0,
        isActive: isActive,
      };

      if (expiresAt) {
        noticeData.expiresAt = new Date(expiresAt).toISOString();
      }

      if (isEditMode && notice) {
        await noticeBoardApi.update(notice._id || notice.id, noticeData);
        toast({
          title: "Notice Updated",
          description: "The notice has been updated successfully.",
        });
      } else {
        await noticeBoardApi.create(noticeData);
        toast({
          title: "Notice Created",
          description: "The notice has been shared successfully.",
        });
      }

      // Reset form
      if (!isEditMode) {
        setTitle('');
        setDescription('');
        setType(NoticeTypeEnum.ANNOUNCEMENT);
        setSelectedRoles([]);
        setPriority(0);
        setExpiresAt('');
        setIsActive(true);
      }
      setOpen(false);

      // Call callback if provided
      if (onNoticeCreated) {
        onNoticeCreated();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} notice. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {isEditMode ? 'Edit Notice' : 'Create New Notice'}
        </DialogTitle>
        <DialogDescription>
          {isEditMode 
            ? 'Update the notice details below.'
            : 'Share a notice with employees and/or clients. Select the target audience and notice type.'}
        </DialogDescription>
      </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notice title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter notice description"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Notice Type *</Label>
              <Select value={type} onValueChange={(value) => setType(value as NoticeTypeEnum)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NoticeTypeEnum.ANNOUNCEMENT}>Announcement</SelectItem>
                  <SelectItem value={NoticeTypeEnum.EMERGENCY}>Emergency</SelectItem>
                  <SelectItem value={NoticeTypeEnum.WARNING}>Warning</SelectItem>
                  <SelectItem value={NoticeTypeEnum.UPDATE}>Update</SelectItem>
                  <SelectItem value={NoticeTypeEnum.REMINDER}>Reminder</SelectItem>
                  <SelectItem value={NoticeTypeEnum.INFO}>Info</SelectItem>
                  <SelectItem value={NoticeTypeEnum.SUCCESS}>Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Audience *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="employee"
                    checked={selectedRoles.includes(RoleEnum.EMPLOYEE)}
                    onCheckedChange={() => handleRoleToggle(RoleEnum.EMPLOYEE)}
                  />
                  <Label htmlFor="employee" className="font-normal cursor-pointer">
                    Employee
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="client"
                    checked={selectedRoles.includes(RoleEnum.CLIENT)}
                    onCheckedChange={() => handleRoleToggle(RoleEnum.CLIENT)}
                  />
                  <Label htmlFor="client" className="font-normal cursor-pointer">
                    Client
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="admin"
                    checked={selectedRoles.includes(RoleEnum.ADMIN)}
                    onCheckedChange={() => handleRoleToggle(RoleEnum.ADMIN)}
                  />
                  <Label htmlFor="admin" className="font-normal cursor-pointer">
                    Admin
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (0-10)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            {isEditMode && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked as boolean)}
                  />
                  <Label htmlFor="isActive" className="font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>Loading...</>
              ) : isEditMode ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Notice
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Notice
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );

  if (isEditMode) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 mt-4">
          <Plus className="h-4 w-4" />
          Create Notice
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};


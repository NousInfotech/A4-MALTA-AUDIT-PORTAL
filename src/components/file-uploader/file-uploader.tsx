"use client";

import { IconX, IconUpload } from "@tabler/icons-react";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import Dropzone, {
  type DropzoneProps,
  type FileRejection,
} from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/utils";

// Define a type for File with the added 'preview' property
export interface FileWithPreview extends File {
  preview: string;
}

export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: 'accurate' | 'normal';
  } = {}
) {
  const { decimals = 0, sizeType = 'normal' } = opts;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === 'accurate'
      ? (accurateSizes[i] ?? 'Bytes')
      : (sizes[i] ?? 'Bytes')
  }`;
}

interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Value of the uploader.
   * Accepts File[] or FileWithPreview[].
   * @type (File | FileWithPreview)[]
   * @default undefined
   * @example value={files}
   */
  value?: (File | FileWithPreview)[]; // <--- UPDATED: Allow File or FileWithPreview

  /**
   * Function to be called when the value changes.
   * @type React.Dispatch<React.SetStateAction<FileWithPreview[]>>
   * @default undefined
   * @example onValueChange={(files) => setFiles(files)}
   */
  onValueChange?: React.Dispatch<React.SetStateAction<FileWithPreview[]>>; // <--- Keep as FileWithPreview[]

  /**
   * Function to be called when files are uploaded.
   * @type (files: FileWithPreview[]) => Promise<void>
   * @default undefined
   * @example onUpload={(files) => uploadFiles(files)}
   */
  onUpload?: (files: FileWithPreview[]) => Promise<void>; // <--- Keep as FileWithPreview[]

  /**
   * Progress of the uploaded files.
   * @type Record<string, number> | undefined
   * @default undefined
   * @example progresses={{ "file1.png": 50 }}
   */
  progresses?: Record<string, number>;

  /**
   * Accepted file types for the uploader.
   * @type { [key: string]: string[]}
   * @default
   * ```ts
   * { "image/*": [] }
   * ```
   * @example accept={["image/png", "image/jpeg"]}
   */
  accept?: DropzoneProps["accept"];

  /**
   * Maximum file size for the uploader.
   * @type number | undefined
   * @default 1024 * 1024 * 2 // 2MB
   * @example maxSize={1024 * 1024 * 2} // 2MB
   */
  maxSize?: DropzoneProps["maxSize"];

  /**
   * Maximum number of files for the uploader.
   * @type number | undefined
   * @default 1
   * @example maxFiles={5}
   */
  maxFiles?: DropzoneProps["maxFiles"];

  /**
   * Whether the uploader should accept multiple files.
   * @type boolean
   * @default false
   * @example multiple
   */
  multiple?: boolean;

  /**
   * Whether the uploader is disabled.
   * @type boolean
   * @default false
   * @example disabled
   */
  disabled?: boolean;

  /**
   * Whether to display the file preview card after selecting a file.
   * @type boolean
   * @default true
   * @example showPreview={false}
   */
  showPreview?: boolean;
}

export function FileUploader(props: FileUploaderProps) {
  const {
    value: valueProp,
    onValueChange,
    onUpload,
    progresses,
    accept = { "image/*": [] },
    maxSize = 1024 * 1024 * 2,
    maxFiles = 1,
    multiple = false,
    disabled = false,
    showPreview = true,
    className,
    ...dropzoneProps
  } = props;

  // Internal state always holds FileWithPreview[]
  const [files, setFiles] = useControllableState<FileWithPreview[]>({
    prop: valueProp
      ? valueProp.map((file) =>
          isFileWithPreview(file)
            ? file
            : Object.assign(file, { preview: URL.createObjectURL(file) }) // Create preview if not exists
        )
      : [],
    onChange: onValueChange,
  });

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Check if trying to add more than allowed files
      const currentFilesCount = files?.length ?? 0;
      if (currentFilesCount + acceptedFiles.length > maxFiles) {
        toast.error(`You can only upload a maximum of ${maxFiles} files.`);
        return;
      }

      // Check for single file limit enforcement
      if (!multiple && maxFiles === 1 && acceptedFiles.length > 1) {
        toast.error("Cannot upload more than 1 file at a time.");
        return;
      }

      const newFilesWithPreview: FileWithPreview[] = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );

      setFiles((prevFiles) => (prevFiles ? [...prevFiles, ...newFilesWithPreview] : newFilesWithPreview));

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors }) => {
          console.error(`File ${file.name} was rejected:`, errors);
          toast.error(
            `File "${file.name}" was rejected. Reason: ${
              errors[0]?.message || "Unknown error."
            }`
          );
        });
      }

      if (onUpload && newFilesWithPreview.length > 0) {
        const target =
          newFilesWithPreview.length > 1 ? `${newFilesWithPreview.length} files` : `file`;

        toast.promise(onUpload(newFilesWithPreview), {
          loading: `Uploading ${target}...`,
          success: () => {
            // Optional: You might want to remove only the *uploaded* files from the preview
            // or clear all if the expectation is to replace them.
            setFiles((prev) => prev?.filter(
                (file) => !newFilesWithPreview.some(newFile => newFile.name === file.name && newFile.size === file.size)
            ) || []);
            return `${target} uploaded successfully!`;
          },
          error: (err) => {
             console.error("Upload error:", err);
             return `Failed to upload ${target}. ${err?.message || ''}`;
          },
        });
      }
    },
    [files, maxFiles, multiple, onUpload, setFiles]
  );

  const onRemove = useCallback(
    (index: number) => {
      if (!files) return;
      const fileToRemove = files[index];
      if (fileToRemove && isFileWithPreview(fileToRemove)) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onValueChange?.(newFiles);
    },
    [files, setFiles, onValueChange]
  );

  // Revoke all preview URLs when component unmounts or files change significantly
  useEffect(() => {
    return () => {
      if (files) {
        files.forEach((file) => {
          if (isFileWithPreview(file)) {
            URL.revokeObjectURL(file.preview);
          }
        });
      }
    };
  }, [files]);

  const isDisabled = disabled || (files?.length ?? 0) >= maxFiles;

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden">
      <Dropzone
        onDrop={onDrop}
        accept={accept}
        maxSize={maxSize}
        maxFiles={maxFiles}
        multiple={maxFiles > 1 || multiple}
        disabled={isDisabled}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps()}
            className={cn(
              "group border-muted-foreground/25 hover:bg-muted/25 relative grid h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed px-5 py-2.5 text-center transition",
              "ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isDragActive && "border-muted-foreground/50",
              isDisabled && "pointer-events-none opacity-60",
              className
            )}
            {...dropzoneProps}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                <div className="rounded-full border border-dashed p-3">
                  <IconUpload
                    className="text-muted-foreground size-7"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-muted-foreground font-medium">
                  Drop the files here
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                <div className="rounded-full border border-dashed p-3">
                  <IconUpload
                    className="text-muted-foreground size-7"
                    aria-hidden="true"
                  />
                </div>
                <div className="space-y-px">
                  <p className="text-muted-foreground font-medium">
                    Drag {`&`} drop files here, or click to select files
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                    ({formatBytes(maxSize)} max per file, up to {maxFiles} files)
                </p>
              </div>
            )}
          </div>
        )}
      </Dropzone>

      {showPreview && files?.length ? (
        <ScrollArea className="h-fit w-full px-3">
          <div className="max-h-48 space-y-4">
            {files.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                onRemove={() => onRemove(index)}
                progress={progresses?.[file.name]}
              />
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );
}

interface FileCardProps {
  file: FileWithPreview;
  onRemove: () => void;
  progress?: number;
}

function FileCard({ file, progress, onRemove }: FileCardProps) {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="relative flex items-center space-x-4">
      <div className="flex flex-1 space-x-4">
        {isImage && isFileWithPreview(file) ? (
          <img
            src={file.preview}
            alt={file.name}
            loading="lazy"
            className="w-12 h-12 aspect-square shrink-0 rounded-md object-cover"
          />
        ) : null}
        <div className="flex w-full flex-col gap-2">
          <div className="space-y-px">
            <p className="text-foreground/80 line-clamp-1 text-sm font-medium">
              {file.name}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(file.size)}
            </p>
          </div>
          {typeof progress === 'number' && progress >= 0 ? <Progress value={progress} /> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={typeof progress === 'number' && progress < 100}
          className="size-8 rounded-full"
        >
          <IconX className="text-muted-foreground" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    </div>
  );
}

function isFileWithPreview(file: File): file is FileWithPreview {
  return "preview" in file && typeof (file as FileWithPreview).preview === "string";
}
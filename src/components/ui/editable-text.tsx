"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------- INPUT BASE STYLE -------------------- */
const BaseInputClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
);

/* -------------------- INPUT COMPONENT -------------------- */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(BaseInputClass, className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

/* -------------------- TEXTAREA COMPONENT -------------------- */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={1}
    className={cn(
      "resize-none overflow-hidden leading-relaxed",
      BaseInputClass,
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/* -------------------- EDITABLE TEXT COMPONENT -------------------- */
interface EditableTextProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string | number;
  onChange?: (newValue: string | number) => void;
  placeholder?: string;
  inputClassName?: string;
  textClassName?: string;
  type?: "text" | "number";
  step?: number;
  min?: number;
  max?: number;
}

export const EditableText = React.forwardRef<HTMLDivElement, EditableTextProps>(
  (
    {
      value,
      onChange,
      placeholder = "-",
      inputClassName,
      textClassName,
      className,
      type = "text",
      step = 1,
      min,
      max,
      ...props
    },
    ref
  ) => {
    const [editing, setEditing] = React.useState(false);
    const [text, setText] = React.useState(String(value));
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Sync with external value
    React.useEffect(() => {
      setText(String(value ?? ""));
    }, [value]);

    // Focus handler
    React.useEffect(() => {
      const el = type === "number" ? inputRef.current : textareaRef.current;
      if (editing && el) {
        el.focus();

        // 👇 only apply selection for text-based inputs
        if (type !== "number" && "setSelectionRange" in el) {
          const val = el.value;
          el.setSelectionRange(val.length, val.length);
        }
      }
    }, [editing, type]);

    // Auto-resize for textarea
    React.useEffect(() => {
      if (type === "text" && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [text, editing, type]);

    const handleBlur = () => {
      setEditing(false);
      const parsedValue =
        type === "number"
          ? text.trim() === ""
            ? ""
            : parseFloat(text)
          : text.trim();
      onChange?.(parsedValue);
    };

    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      if (e.key === "Enter" && (type === "number" || !e.shiftKey)) {
        e.preventDefault();
        setEditing(false);
        const parsedValue =
          type === "number"
            ? text.trim() === ""
              ? ""
              : parseFloat(text)
            : text.trim();
        onChange?.(parsedValue);
      } else if (e.key === "Escape") {
        setText(String(value));
        setEditing(false);
      }
    };

    return (
      <div
        ref={ref}
        className={cn("inline-block w-full", className)}
        {...props}
      >
        {editing ? (
          type === "number" ? (
            <Input
              ref={inputRef}
              type="number"
              step={step}
              min={min}
              max={max}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={cn("text-base", inputClassName)}
            />
          ) : (
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={cn("text-base", inputClassName)}
            />
          )
        ) : (
          <p
            onClick={() => setEditing(true)}
            className={cn(
              "text-base ring-offset-background file:border-0 border border-input bg-background file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm whitespace-pre-wrap break-words rounded-md px-3 py-2",
              textClassName
            )}
          >
            {type === "number" && text !== ""
              ? Math.round(Number(text)).toLocaleString() // 👈 Rounded display
              : text || (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
          </p>
        )}
      </div>
    );
  }
);

EditableText.displayName = "EditableText";

/* -------------------- EXPORTS -------------------- */
export { Input, Textarea };
export default EditableText;

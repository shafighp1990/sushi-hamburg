"use client";
import { useId } from "react";
import { Input } from "../Input";
import { Label } from "../Label";
import { FieldMessage } from "../FieldMessage";
import type { TextFieldProps } from "./TextField.types";
import { textFieldStyles } from "./TextField.styles";
export function TextField({
  label,
  helperText,
  error,
  wrapperClassName,
  id,
  "aria-describedby": describedBy,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = Boolean(error?.trim());
  const message = hasError ? error : helperText;
  const messageId = message
    ? `${inputId}-${hasError ? "error" : "hint"}`
    : undefined;
  return (
    <div className={wrapperClassName ?? textFieldStyles.root}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        {...props}
        id={inputId}
        aria-invalid={hasError || props["aria-invalid"]}
        aria-describedby={
          [describedBy, messageId].filter(Boolean).join(" ") || undefined
        }
      />
      {message && (
        <FieldMessage
          id={messageId}
          tone={hasError ? "error" : "info"}
          role={hasError ? "alert" : undefined}
        >
          {message}
        </FieldMessage>
      )}
    </div>
  );
}

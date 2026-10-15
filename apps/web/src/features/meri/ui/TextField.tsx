"use client";
import { useId } from "react";
import { Input } from "@capiro/ui/input";
import surfaces from "./surfaces.module.css";

/** Labelled single-line field (Figma Field · label over a 44px input). */
export function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "search";
}) {
  const id = useId();
  return (
    <div className={surfaces.field}>
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

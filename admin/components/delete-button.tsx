"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";

/** Two clicks to delete, without a browser dialog. */
export function DeleteButton({ action, label }: { readonly action: () => Promise<void>; readonly label: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <Button type="button" variant="danger" onClick={() => setArmed(true)}>
        <Trash2 size={16} aria-hidden /> Delete
      </Button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <span className="text-sm text-danger-600">Delete {label} for good?</span>
      <Button type="submit" variant="danger">Yes, delete</Button>
      <Button type="button" variant="ghost" onClick={() => setArmed(false)}>Cancel</Button>
    </form>
  );
}

import { SearchXIcon } from "lucide-react";
import type { ReactNode } from "react";

type MessageStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function MessageState({
  title,
  description,
  action,
}: MessageStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <SearchXIcon className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

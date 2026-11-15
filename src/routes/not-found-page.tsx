import { Link } from "react-router";
import { MessageState } from "@/components/message-state";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <MessageState
        title="Not found"
        description="This page or job doesn't exist."
        action={
          <Button asChild variant="outline">
            <Link to="/">Browse all jobs</Link>
          </Button>
        }
      />
    </div>
  );
}

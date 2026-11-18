import { SearchIcon, XIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JobSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export function JobSearch({ value, onChange, onClear }: JobSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onClear();
    inputRef.current?.focus();
  };

  return (
    <search className="relative">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        aria-label="Search jobs by title"
        placeholder="Search by job title"
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClear();
          }
        }}
        className="h-10 pr-10 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Clear search"
          onClick={clear}
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <XIcon />
        </Button>
      )}
    </search>
  );
}

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "react-router";

export function useDebouncedSearchParam(name: string, delayMs: number) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(name) ?? "";
  const [input, setInput] = useState(value);
  const committedRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const commit = (next: string) => {
    clearTimeout(timeoutRef.current);
    committedRef.current = next;
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params);
        if (next) {
          updated.set(name, next);
        } else {
          updated.delete(name);
        }
        return updated;
      },
      { replace: true, preventScrollReset: true }
    );
  };

  const changeInput = (next: string) => {
    setInput(next);
    clearTimeout(timeoutRef.current);
    const trimmed = next.trim();
    if (trimmed === "") {
      commit("");
      return;
    }
    timeoutRef.current = setTimeout(() => commit(trimmed), delayMs);
  };

  const clear = () => {
    setInput("");
    commit("");
  };

  const followNavigation = useEffectEvent((navigatedValue: string) => {
    if (navigatedValue === committedRef.current) {
      return;
    }
    clearTimeout(timeoutRef.current);
    committedRef.current = navigatedValue;
    setInput(navigatedValue);
  });

  useEffect(() => {
    followNavigation(value);
  }, [value]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return { input, value, changeInput, clear };
}

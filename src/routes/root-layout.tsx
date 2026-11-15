import { BriefcaseBusinessIcon } from "lucide-react";
import { Link, Outlet, ScrollRestoration } from "react-router";

export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-heading font-medium"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-brand text-primary-foreground">
              <BriefcaseBusinessIcon className="size-4.5" aria-hidden />
            </span>
            Coople jobs
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}

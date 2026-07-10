import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to app
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: {updated}</p>
      {intro ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{intro}</p>
      ) : null}
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </div>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      {children}
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

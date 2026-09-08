"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";

/** Catch-all inside the shell: sidebar targets whose screens arrive in later phases.
 *  Real pages always take precedence over this route automatically. */
export default function UnderConstruction() {
  const pathname = usePathname();

  return (
    <>
      <PageHeader
        title="Screen under construction"
        subtitle={`The route ${pathname} is wired in navigation, but its screen arrives in a later phase.`}
      />
      <section className="max-w-lg rounded border border-section-line bg-white p-6">
        <p className="text-body text-slate">
          {/* Nothing is broken — this navigation target simply hasn't been built yet. It will appear */}
          here as the phases progress.
        </p>
      </section>
    </>
  );
}
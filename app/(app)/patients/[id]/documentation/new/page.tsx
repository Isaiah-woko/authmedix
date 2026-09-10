"use client";

import { useParams, useSearchParams } from "next/navigation";
import { AddDocumentationForm } from "@/components/records/add-documentation-form";
import { PageHeader } from "@/components/layout/page-header";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { isClinicalRole } from "@/lib/roles";

export default function AddDocumentationPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { session } = useRequireAuth();
  const patientName = searchParams.get("name") ?? "this patient";

  if (!session) return null;

  if (!isClinicalRole(session.user.role)) {
    return (
      <>
        <PageHeader title="Add Documentation" />
        <p className="text-body text-slate">Administrators cannot author clinical records.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add Documentation"
        subtitle="Typed, dictated or scanned. Everything is reviewed before save and audit-logged."
      />
      <AddDocumentationForm patientId={params.id} patientName={patientName} />
    </>
  );
}
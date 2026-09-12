"use client";

/**
 * Screen 10 — Passport Requests Queue (Admin). Pending only; approve/deny
 * happens on the detail page. Empty is a GOOD state: nothing waiting on you.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyQueueIllustration } from "@/components/domain/empty-illustrations";
import { api, describeApiError } from "@/lib/api";
import { formatTimestamp } from "@/lib/utils";
import type { PassportRequest } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleBadge } from "@/components/domain/role-badge";
import { ScopeBadges } from "@/components/domain/scope-badges";

export default function RequestsQueuePage() {
  const [requests, setRequests] = useState<PassportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.passportRequests.list("PENDING"); // await FIRST
      if (!active) return;
      if (result.ok) {
        setRequests(result.data);
        setError(null);
      } else {
        setError(describeApiError(result));
      }
      setIsLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retry() {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  return (
    <>
      <PageHeader
        title="Requests queue"
        subtitle="Pending access requests from clinical staff — approve or deny each one."
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          title="Couldn't load the queue"
          body={error}
          action={
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          }
        />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No pending requests"
          icon={<EmptyQueueIllustration />}
          body="Nothing is waiting on you right now. New requests from clinical staff appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>
                <span className="sr-only">Action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{request.requester.name}</span>
                    <RoleBadge role={request.requester.role} />
                  </div>
                  <span className="mono text-data text-slate-ink">
                    {request.requester.healthId}
                  </span>
                </TableCell>
                <TableCell>
                  <span>{request.patient.name}</span>
                  <br />
                  <span className="mono text-data text-slate-ink">
                    {request.patient.patientCode}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="block max-w-56 truncate" title={request.purpose}>
                    {request.purpose}
                  </span>
                </TableCell>
                <TableCell>
                  <ScopeBadges scope={request.scope} />
                </TableCell>
                <TableCell>
                  <span className="mono">{formatTimestamp(request.createdAt)}</span>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/requests/${request.id}`}>
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
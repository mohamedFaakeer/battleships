import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { safeRedirect } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a New Password" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Set-new-password page reached from a recovery link. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = safeRedirect(single(params.next));

  return (
    <AppShell>
      <section
        className="flex-1 flex items-center justify-center py-10 px-4"
        aria-label="Choose a new password"
      >
        <ResetPasswordForm nextPath={nextPath} />
      </section>
    </AppShell>
  );
}

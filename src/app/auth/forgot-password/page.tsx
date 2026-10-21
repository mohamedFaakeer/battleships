import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { safeRedirect } from "@/lib/auth";

export const metadata: Metadata = { title: "Reset Password" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Password reset request page. */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = safeRedirect(single(params.next));

  return (
    <AppShell>
      <section
        className="flex-1 flex items-center justify-center py-10 px-4"
        aria-label="Reset password"
      >
        <ForgotPasswordForm nextPath={nextPath} initialError={single(params.error)} />
      </section>
    </AppShell>
  );
}

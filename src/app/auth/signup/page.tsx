import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { AuthForm } from "@/components/auth";
import { safeRedirect } from "@/lib/auth";

export const metadata: Metadata = { title: "Create Account" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Sign-up page. New accounts confirm via email before their first sign-in. */
export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const redirectTo = safeRedirect(single(params.redirectedFrom));

  return (
    <AppShell>
      <section
        className="flex-1 flex items-center justify-center py-10 px-4"
        aria-label="Create account"
      >
        <AuthForm mode="signup" redirectTo={redirectTo} />
      </section>
    </AppShell>
  );
}

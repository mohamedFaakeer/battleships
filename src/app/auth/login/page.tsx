import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { AuthForm } from "@/components/auth";
import { safeRedirect } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Sign-in page. Honors ?redirectedFrom= set by middleware. */
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const redirectTo = safeRedirect(single(params.redirectedFrom));
  const error = single(params.error);
  const notice = single(params.message);

  return (
    <AppShell>
      <section
        className="flex-1 flex items-center justify-center py-10 px-4"
        aria-label="Sign in"
      >
        <AuthForm
          mode="login"
          redirectTo={redirectTo}
          initialError={error}
          initialNotice={notice}
        />
      </section>
    </AppShell>
  );
}

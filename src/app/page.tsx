"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/navigation";
import { useApp } from "@/lib/app-context";
import { Icon } from "@/components/Icon";
import { BrandMark } from "@/components/BrandMark";

export const dynamic = "force-dynamic";

function Splash() {
  const { profile } = useApp();
  return (
    <div className="grid h-dvh w-full place-items-center bg-base">
      <div className="flex flex-col items-center gap-5">
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-brand shadow-[0_0_60px_-8px_var(--color-brand-glow)]">
          <BrandMark className="h-10 w-10 text-white" />
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
        </div>
        <p className="text-xl font-semibold">{profile.appName}</p>
        <p className="text-sm text-muted">{profile.splashText || "A space for every lesson"}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { profile, loading } = useApp();

  useEffect(() => {
    if (loading) return;
    router.replace(profile.onboarded ? "/library" : "/onboarding");
  }, [loading, profile.onboarded, router]);

  return <Splash />;
}

import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/u/"],
        disallow: [
          "/app",
          "/api/",
          "/onboarding",
          "/settings",
          "/community",
          "/tools",
          "/templates",
          "/referrals",
          "/admin",
          "/workspace/",
          "/skills/",
          "/activities/",
          "/quests/",
          "/habits/",
          "/journal/",
          "/achievements/",
          "/goals/",
          "/health/",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sitemap.xml`,
  };
}

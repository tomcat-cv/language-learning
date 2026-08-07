import { asc, desc, eq } from "drizzle-orm";
import { contentImports, contentSources } from "@/db/schema";
import { getDatabase } from "@/db/client";

export type ContentSourceSummary = {
  id: string;
  name: string;
  homepageUrl: string;
  licenseName: string;
  licenseUrl: string;
  attributionText: string;
  updateFrequency: string;
  latestImport: null | {
    sourceVersion: string;
    status: "running" | "completed" | "failed";
    recordCount: number;
    startedAt: string;
    finishedAt: string | null;
  };
};

export async function listContentSourceSummaries(): Promise<
  ContentSourceSummary[]
> {
  const rows = await getDatabase()
    .select({
      id: contentSources.id,
      name: contentSources.name,
      homepageUrl: contentSources.homepageUrl,
      licenseName: contentSources.licenseName,
      licenseUrl: contentSources.licenseUrl,
      attributionText: contentSources.attributionText,
      updateFrequency: contentSources.updateFrequency,
      sourceVersion: contentImports.sourceVersion,
      status: contentImports.status,
      recordCount: contentImports.recordCount,
      startedAt: contentImports.startedAt,
      finishedAt: contentImports.finishedAt,
    })
    .from(contentSources)
    .leftJoin(contentImports, eq(contentImports.sourceId, contentSources.id))
    .orderBy(asc(contentSources.name), desc(contentImports.startedAt));

  const summaries = new Map<string, ContentSourceSummary>();
  for (const row of rows) {
    if (summaries.has(row.id)) continue;
    summaries.set(row.id, {
      id: row.id,
      name: row.name,
      homepageUrl: row.homepageUrl,
      licenseName: row.licenseName,
      licenseUrl: row.licenseUrl,
      attributionText: row.attributionText,
      updateFrequency: row.updateFrequency,
      latestImport:
        row.sourceVersion && row.status && row.startedAt
          ? {
              sourceVersion: row.sourceVersion,
              status: row.status,
              recordCount: row.recordCount ?? 0,
              startedAt: row.startedAt.toISOString(),
              finishedAt: row.finishedAt?.toISOString() ?? null,
            }
          : null,
    });
  }
  return [...summaries.values()];
}

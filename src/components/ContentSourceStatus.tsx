"use client";

import { useEffect, useState } from "react";
import type { ContentSourceSummary } from "@/lib/content-service";

type SourceState =
  | { status: "loading"; sources: ContentSourceSummary[]; error: "" }
  | { status: "ready"; sources: ContentSourceSummary[]; error: "" }
  | { status: "error"; sources: ContentSourceSummary[]; error: string };

export function ContentSourceStatus() {
  const [state, setState] = useState<SourceState>({
    status: "loading",
    sources: [],
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/content/sources", { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as {
          sources?: ContentSourceSummary[];
          error?: string;
        };
        if (!response.ok || !data.sources) {
          throw new Error(data.error ?? "暂时无法读取内容来源状态。");
        }
        setState({ status: "ready", sources: data.sources, error: "" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          sources: [],
          error: error instanceof Error ? error.message : "暂时无法读取内容来源状态。",
        });
      });
    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return <p className="source-state">正在读取词典数据版本…</p>;
  }
  if (state.status === "error") {
    return <p className="inline-error">{state.error}</p>;
  }
  if (state.sources.length === 0) {
    return <p className="source-state">尚未导入外部词典数据。</p>;
  }

  return (
    <div className="source-list">
      {state.sources.map((source) => (
        <article className="source-item" key={source.id}>
          <div>
            <h3>{source.name}</h3>
            <p>{source.attributionText}</p>
          </div>
          <dl>
            <div>
              <dt>当前记录</dt>
              <dd>{source.latestImport?.recordCount.toLocaleString("zh-CN") ?? 0}</dd>
            </div>
            <div>
              <dt>源版本</dt>
              <dd>{source.latestImport?.sourceVersion ?? "尚未导入"}</dd>
            </div>
          </dl>
          <div className="source-links">
            <a href={source.homepageUrl} rel="noreferrer" target="_blank">
              项目主页
            </a>
            <a href={source.licenseUrl} rel="noreferrer" target="_blank">
              {source.licenseName}
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

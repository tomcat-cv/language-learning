"use client";

import { useEffect, useState } from "react";

type Certificate = { level: string; awardedAt: string; score: number };

export function CertificateShelf() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  useEffect(() => { void fetch("/api/exams/certificates").then((response) => response.ok ? response.json() as Promise<{ certificates?: Certificate[] }> : null).then((data) => setCertificates(data?.certificates ?? [])).catch(() => undefined); }, []);
  return <section className="card settings-card certificate-card"><div className="page-eyebrow">Achievements · Certificates</div><h2>等级奖牌</h2><p>通过正式模拟考试后获得的学习成就。</p>{certificates.length === 0 ? <div className="certificate-empty">完成正式考试并通过后，这里会出现对应等级的奖牌。</div> : <div className="certificate-list">{certificates.map((certificate) => <div className="certificate-badge" key={certificate.level}><span>認</span><div><b>{certificate.level} 通过</b><small>{certificate.score} 分 · {new Date(certificate.awardedAt).toLocaleDateString("zh-CN")}</small></div></div>)}</div>}</section>;
}

import { ExamStudio } from "@/components/ExamStudio";
import { ExamRunner } from "@/components/ExamRunner";

export default function ExamsPage() {
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">JLPT · Exam Studio</div><h1 className="page-title">把学习，变成一次检验。</h1><p className="page-lead">官方资料用于本地学习参考，AI 题库用于生成原创模拟题。正式考试记录和证书将在题库准备后启用。</p></div></header>
    <section className="exam-grid">
      <article className="card official-exam-card"><div className="page-eyebrow">Official Source</div><h2>JLPT 官方资料</h2><p>本机已导入各等级官方样题包和部分练习册资料，原始文件保存在 Git 忽略目录。</p><div className="exam-levels">{["N5", "N4", "N3", "N2", "N1"].map((level) => <span className="pill" key={level}>{level}</span>)}</div><a className="secondary-button" href="https://www.jlpt.jp/e/samples/sampleindex.html" target="_blank" rel="noreferrer">打开官方题源 →</a></article>
      <ExamStudio />
    </section>
    <ExamRunner />
  </div>;
}

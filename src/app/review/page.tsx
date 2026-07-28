import Link from "next/link";
export default function ReviewPage(){
  return <div className="page-container"><header className="page-header"><div><div className="page-eyebrow">Review · Due Today</div><h1 className="page-title">忘记之前，再见一次。</h1><p className="page-lead">复习队列会优先安排即将遗忘的知识点。</p></div><span className="pill">今日到期 12</span></header>
    <article className="card empty-state"><div className="big">↺</div><h2>复习调度器已留好位置</h2><p>当前演示内容还没有真实作答记录。<br/>完成第一轮学习后，这里会根据记忆状态生成复习队列。</p><Link className="primary-button" href="/grammar/study" style={{marginTop:22}}>先学一个文法 →</Link></article>
  </div>;
}

import { ReviewQueue } from "@/components/ReviewQueue";

export default function ReviewPage(){
  return <div className="page-container"><header className="page-header"><div><div className="page-eyebrow">Review · Due Today</div><h1 className="page-title">忘记之前，再见一次。</h1><p className="page-lead">复习队列优先验证用户自报掌握和已经到期的知识点。</p></div><span className="pill">复习优先</span></header>
    <ReviewQueue/>
  </div>;
}

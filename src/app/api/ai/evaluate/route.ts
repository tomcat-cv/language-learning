import { NextResponse } from "next/server";
import { generateTeacherFeedback,type ProviderConfig } from "@/lib/ai/providers";

export async function POST(request:Request){
  try{
    const body=await request.json() as {config?:ProviderConfig;targetGrammar?:string;userSentence?:string};
    if(!body.config?.apiKey||!body.config.model||!body.targetGrammar||!body.userSentence)return NextResponse.json({error:"缺少模型配置或学习内容"},{status:400});
    if(body.userSentence.length>500)return NextResponse.json({error:"造句内容过长"},{status:400});
    const feedback=await generateTeacherFeedback(body.config,body.targetGrammar,body.userSentence);
    return NextResponse.json({feedback});
  }catch(error){
    const message=error instanceof Error?error.message:"模型调用失败";
    return NextResponse.json({error:message},{status:502});
  }
}

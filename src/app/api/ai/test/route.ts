import { NextResponse } from "next/server";
import { generateTeacherFeedback,type ProviderConfig } from "@/lib/ai/providers";

export async function POST(request:Request){
  try{
    const {config}=await request.json() as {config?:ProviderConfig};
    if(!config?.apiKey||!config.model)return NextResponse.json({error:"缺少模型名称或 API Key"},{status:400});
    await generateTeacherFeedback(config,"～は～です","私は学生です。");
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"连接失败"},{status:502});
  }
}

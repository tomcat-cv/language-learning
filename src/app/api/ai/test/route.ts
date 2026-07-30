import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { generateTeacherFeedback,type ProviderConfig } from "@/lib/ai/providers";

export async function POST(request:Request){
  const denied=enforcePersonalAccess(request);
  if(denied)return denied;

  try{
    const {config}=await request.json() as {config?:ProviderConfig};
    if(!config?.apiKey||!config.model)return NextResponse.json({error:"缺少模型名称或 API Key"},{status:400});
    await generateTeacherFeedback(config,"～は～です","私は学生です。");
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json(
      {error:"模型连接失败，请检查服务商、模型名称和密钥。"},
      {status:502},
    );
  }
}

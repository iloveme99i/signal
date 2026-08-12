type AnalyzeRequest = { title?: string; content?: string };

export async function POST(request: Request) {
  try {
    const body = await request.json() as AnalyzeRequest;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return Response.json({ error: "Signal 智能分析服务暂未配置" }, { status: 503 });
    if (!body.content?.trim()) return Response.json({ error: "备忘录内容为空" }, { status: 400 });
    if (body.content.length > 30000) return Response.json({ error: "首版单条笔记暂时限制在 30000 字以内" }, { status: 400 });

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `你是 Signal 的信息识别引擎。任务不是总结整份材料，也不是给建议，而是识别其中每一条独立且有用的信息，忠实摘取并分类。一份材料通常应产生多条记录。去掉广告、寒暄、重复和空话，不得编造。
只输出 JSON：{"items":[{"category":"deadline|task|job|knowledge|resource|project|contact|personal","title":"可检索的短标题","content":"完整而独立的信息","fields":{"字段名":"字段值"},"sourceQuote":"支持这条信息的最短原文","confidence":"high|medium|low","needsConfirmation":["无法从原文确定的字段名"],"confirmed":false}]}。
分类含义：deadline=日期截止日程；task=明确待办行动；job=公司岗位要求；knowledge=知识方法观点案例；resource=工具链接邮箱代码等资源；project=项目想法；contact=人物联系方式；personal=个人记录。相同原文可以同时产生不同类别的记录，例如岗位截图同时产生岗位、截止、投递待办和联系方式。相对日期、老地方、他等模糊指代必须放进 needsConfirmation。` },
          { role: "user", content: `标题：${body.title || "无标题"}\n\n正文：\n${body.content}` },
        ],
      }),
    });
    const result = await upstream.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!upstream.ok) return Response.json({ error: result.error?.message || "DeepSeek 接口请求失败" }, { status: upstream.status });
    const content = result.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "DeepSeek 没有返回分析结果" }, { status: 502 });
    const parsed = JSON.parse(content) as Analysis;
    const allowed = new Set(["deadline","task","job","knowledge","resource","project","contact","personal"]);
    const items = Array.isArray(parsed.items) ? parsed.items.filter(item => allowed.has(item.category)).slice(0, 30).map(item => ({
      category:item.category, title:String(item.title||"").slice(0,80), content:String(item.content||"").slice(0,1000),
      fields:item.fields && typeof item.fields === "object" ? item.fields : {}, sourceQuote:String(item.sourceQuote||"").slice(0,500),
      confidence:["high","medium","low"].includes(item.confidence)?item.confidence:"medium",
      needsConfirmation:Array.isArray(item.needsConfirmation)?item.needsConfirmation.map(String).slice(0,10):[], confirmed:false,
    })) : [];
    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}

type AnalysisItem = { category:string; title:string; content:string; fields?:Record<string,string>; sourceQuote:string; confidence:string; needsConfirmation?:string[] };
type Analysis = { items: AnalysisItem[] };

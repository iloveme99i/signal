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
          { role: "system", content: `你是 Signal 的信息摘取与分类引擎。只做识别、摘取、分类，不做分析、解释、评价、建议或扩写。一份材料可以产生多条记录。尽量保留用户原话，只允许删除重复、口头语、广告和无关内容；不得改变原意，不得补充原文没有的信息。
只输出 JSON：{"items":[{"category":"deadline|task|job|knowledge|resource|project|contact|personal","title":"可检索的短标题","content":"完整而独立的信息","fields":{"字段名":"字段值"},"sourceQuote":"支持这条信息的最短原文","confidence":"high|medium|low","needsConfirmation":["无法从原文确定的字段名"],"confirmed":false}]}。
分类含义：deadline=日期截止日程；task=明确待办行动；job=公司岗位要求；knowledge=知识方法观点案例；resource=工具链接邮箱代码等资源；project=项目想法；contact=人物联系方式；personal=个人记录。只有原文确实包含多种独立信息时才拆分，不能为了凑数量重复输出。相对日期、老地方、他等模糊指代放进 needsConfirmation，不要猜。` },
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

type AnalyzeRequest = { title?: string; content?: string; apiKey?: string };

export async function POST(request: Request) {
  try {
    const body = await request.json() as AnalyzeRequest;
    const apiKey = body.apiKey?.trim() || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return Response.json({ error: "请先在模型设置中输入 DeepSeek API Key" }, { status: 503 });
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
          { role: "system", content: `你是 Signal 的内容整理引擎。理解整份材料后，把它整理成一条保持上下文完整的记录。不要把时间、待办、知识点拆成不同记录；它们只是同一条内容中的信息。只有材料本身包含两个完全无关的主题时，才允许输出多条。
你可以调整语序、分段、标题和小标题，删除重复口头语与广告，但不能改变原意、编造内容或输出“建议/分析过程”。content 应是整理后的完整正文，而不是一句摘要。fields 用来保存正文中已有的时间、待办、人物、链接等属性，但不要因此拆分正文。
只输出 JSON：{"items":[{"category":"deadline|task|job|knowledge|resource|project|contact|personal","title":"清楚的标题","content":"保持上下文的完整整理正文","fields":{"时间":"原文时间","待办":"原文待办"},"sourceQuote":"原始材料中对应的完整片段","confidence":"high|medium|low","needsConfirmation":["无法确定的字段"],"confirmed":false}]}。默认只输出一个 item。` },
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

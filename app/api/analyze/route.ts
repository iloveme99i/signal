type AnalyzeRequest = { title?: string; content?: string; apiKey?: string; categories?: Array<{ id: string; label: string }> };

export async function POST(request: Request) {
  try {
    const body = await request.json() as AnalyzeRequest;
    const apiKey = body.apiKey?.trim() || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return Response.json({ error: "当前浏览器中没有可用的 DeepSeek Key" }, { status: 503 });
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
          { role: "system", content: `你是 Signal 的信息整理引擎。你的工作只有：理解原材料、轻度整理原文、匹配分类。

规则：
1. 默认把一份材料整理成一条保持上下文完整的记录。时间、待办、人物、链接只是这条记录里的信息，不能因此被拆成多条。
2. 只有原材料中存在两个完全无关、分别保存才更容易查找的主题时，才输出多条。不要按句子、字段或关键词机械拆分。
3. content 是整理后的完整正文，不是一句话摘要。可以调整语序、分段和标题，删除重复口头语、广告与无信息内容，但不能改写观点、编造信息或添加建议。
4. 不输出分析过程、行动建议、价值判断、总结套话或材料中不存在的内容。
5. category 只能从给定分类 ID 中选择最匹配的一项。

只输出 JSON：{"items":[{"category":"分类ID","title":"清楚且便于搜索的标题","content":"保持原意和上下文的完整整理正文","sourceQuote":"该记录对应的原始材料片段"}]}。默认只输出一个 item。` },
          { role: "user", content: `可用分类：${JSON.stringify(body.categories || [])}\n\n标题：${body.title || "无标题"}\n\n原始材料：\n${body.content}` },
        ],
      }),
    });
    const result = await upstream.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!upstream.ok) return Response.json({ error: result.error?.message || "DeepSeek 接口请求失败" }, { status: upstream.status });
    const content = result.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "DeepSeek 没有返回分析结果" }, { status: 502 });
    const parsed = JSON.parse(content) as Analysis;
    const allowed = new Set((body.categories || []).map((category) => category.id));
    if (!allowed.size) ["deadline","task","job","knowledge","resource","project","contact","personal"].forEach((id) => allowed.add(id));
    const items = Array.isArray(parsed.items) ? parsed.items.filter(item => allowed.has(item.category)).slice(0, 30).map(item => ({
      category:item.category, title:String(item.title||"").slice(0,80), content:String(item.content||"").slice(0,12000),
      sourceQuote:String(item.sourceQuote||"").slice(0,2000),
    })) : [];
    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}

type AnalysisItem = { category:string; title:string; content:string; sourceQuote:string };
type Analysis = { items: AnalysisItem[] };

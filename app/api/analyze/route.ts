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
          { role: "system", content: "你是个人信息整理助手。请理解用户笔记，不要编造。只输出JSON：{\"type\":\"不超过8字的信息类型\",\"summary\":\"不超过80字的核心摘要\",\"actions\":[\"最多3条、具体可执行的建议\"]}。如果笔记只是情绪或私人记录，不要强行制造任务。" },
          { role: "user", content: `标题：${body.title || "无标题"}\n\n正文：\n${body.content}` },
        ],
      }),
    });
    const result = await upstream.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!upstream.ok) return Response.json({ error: result.error?.message || "DeepSeek 接口请求失败" }, { status: upstream.status });
    const content = result.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "DeepSeek 没有返回分析结果" }, { status: 502 });
    const parsed = JSON.parse(content) as NoteAnalysis;
    return Response.json({ type: parsed.type, summary: parsed.summary, actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}

type NoteAnalysis = { type: string; summary: string; actions: string[] };

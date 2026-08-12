"use client";

import {
  Archive, Bell, BriefcaseBusiness, Check,
  CircleGauge, Clock3, FileText, Inbox, Link2,
  NotebookPen, Pin, Plus, RotateCcw, Search, Settings, Sparkles, Trash2, Upload, Video, X, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ItemStatus = "pending" | "done" | "archived" | "deleted" | "snoozed";
type Priority = "urgent" | "review" | "read" | "cleanup";
type InfoItem = {
  id: number; source: string; sourceClass: string; title: string; summary: string;
  meta: string; age: string; priority: Priority; status: ItemStatus; reason: string; action: string;
  attachmentKey?: string;
};
type Note = { id: number; title: string; body: string; updated: string; pinned: boolean };
type NoteAnalysis = { type: string; summary: string; actions: string[] };
type SourceId = "notes" | "notion" | "social" | "jobs" | "photos";

const initialNotes: Note[] = [
  { id: 101, title: "AI 产品经理实习准备", updated: "今天 10:24", pinned: true, body: "最近需要集中准备 AI 产品经理实习。\n\n- 把轻岗项目重新讲清楚\n- 梳理 EvalFlow 的评测指标\n- 补一下 SQL 基础\n- 收集 10 个目标岗位并比较要求\n\n这周至少完成一次模拟面试。" },
  { id: 102, title: "Signal 产品想法", updated: "昨天 23:18", pinned: true, body: "我真正的问题不是没有地方收藏，而是信息太多、每天不知道先处理什么。\n\nSignal 应该把截图、岗位、视频、备忘录统一放进来，自动判断时效、相关性和下一步。不能做成另一个越来越大的收藏夹。" },
  { id: 103, title: "明天要做的事", updated: "昨天 21:06", pinned: false, body: "明天先看三个 AI 产品实习岗位。\n给家教学生整理函数题。\n下午继续修改轻岗的 UI。\n晚上试一下 Signal 的每日清算。" },
  { id: 104, title: "收藏内容整理原则", updated: "8月9日", pinned: false, body: "不是所有收藏都值得完整看完。\n\n如果内容和已有信息重复，直接删除。\n如果只有一个新观点，保留这个观点，不保留整条视频。\n如果包含明确截止时间，优先转成行动。" },
  { id: 105, title: "随手记：最近有点累", updated: "8月8日", pinned: false, body: "最近同时推进的事情有点多，容易因为每件事都想做好而拖延。先把每天最重要的三件事做完，剩下的允许推迟。" },
];

const initialItems: InfoItem[] = [
  { id: 1, source: "BOSS直聘", sourceClass: "boss", title: "AI 产品经理实习生 · 字节跳动", summary: "与你的目标岗位高度匹配，要求中有 3 项已具备；SQL 与模型评测经历需要补充。", meta: "岗位 · 北京 · 4–5天/周", age: "收藏 6 天", priority: "urgent", status: "pending", reason: "岗位仍在招聘，但同类岗位平均 7 天内进入集中筛选。", action: "查看并决定是否投递" },
  { id: 2, source: "截图", sourceClass: "shot", title: "AI 产品线上分享会报名通知", summary: "8月14日 18:00 截止报名，主题包含 Agent 产品设计与大模型评测。", meta: "活动 · 截止时间已识别", age: "昨天 22:41", priority: "urgent", status: "pending", reason: "距离截止还有 3 天，并且与当前求职准备直接相关。", action: "报名或忽略" },
  { id: 3, source: "牛客", sourceClass: "nowcoder", title: "大模型产品经理面试：评测体系怎么讲", summary: "核心围绕评测集、人工校准、Bad Case 和版本回归；预计 4 分钟读完。", meta: "文章 · 求职准备", age: "收藏 12 天", priority: "review", status: "pending", reason: "与你正在规划的 EvalFlow 项目高度相关，建议本周消化。", action: "4 分钟快速阅读" },
  { id: 4, source: "抖音", sourceClass: "douyin", title: "30分钟讲清楚个人知识管理系统", summary: "与已收藏的 3 条内容重复度 82%，新增内容主要是用项目而不是标签组织资料。", meta: "视频 · 原时长 31:24", age: "收藏 18 天", priority: "cleanup", status: "pending", reason: "大部分观点已经出现在你的既有收藏中，无需观看完整视频。", action: "查看 48 秒摘要或删除" },
  { id: 5, source: "备忘录", sourceClass: "notes", title: "下次做项目时要验证的几个问题", summary: "包含 6 个产品验证问题，其中 4 个可合并到 Signal 的测试清单。", meta: "文字 · 产品想法", age: "记录 23 天", priority: "review", status: "pending", reason: "不是独立任务，但适合并入当前产品的验证计划。", action: "合并到当前项目" },
];

const navItems = [
  { id: "today", label: "今日调度", icon: CircleGauge },
  { id: "notes", label: "备忘录", icon: NotebookPen },
  { id: "inbox", label: "统一收件箱", icon: Inbox, count: 38 },
  { id: "sources", label: "来源管理", icon: Link2 },
  { id: "archive", label: "归档记录", icon: Archive },
];
const priorityMap: Record<Priority, { label: string; tone: string }> = {
  urgent: { label: "时效优先", tone: "red" }, review: { label: "建议处理", tone: "blue" },
  read: { label: "快速阅读", tone: "violet" }, cleanup: { label: "建议清理", tone: "gray" },
};
function sourceIcon(source: string) {
  if (source.includes("BOSS")) return BriefcaseBusiness;
  if (source === "截图") return FileText;
  if (source === "抖音") return Video;
  if (source === "备忘录") return NotebookPen;
  return FileText;
}

function saveAttachment(key: string, file: File) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("signal-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("files", "readwrite");
      transaction.objectStore("files").put(file, key);
      transaction.oncomplete = () => { request.result.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

function loadAttachment(key: string) {
  return new Promise<Blob | undefined>((resolve, reject) => {
    const request = indexedDB.open("signal-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("files", "readonly");
      const getRequest = transaction.objectStore("files").get(key);
      getRequest.onsuccess = () => { request.result.close(); resolve(getRequest.result as Blob | undefined); };
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("today");
  const [items, setItems] = useState<InfoItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState(1);
  const [filter, setFilter] = useState<Priority | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newInput, setNewInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState(101);
  const [noteSearch, setNoteSearch] = useState("");
  const [analyses, setAnalyses] = useState<Record<number, NoteAnalysis>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [toast, setToast] = useState("");
  const [addMode, setAddMode] = useState<"text" | "file">("text");
  const [expandedSource, setExpandedSource] = useState<SourceId | null>(null);
  const [sourceContext, setSourceContext] = useState<SourceId | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("signal-items");
    if (stored) try { setItems(JSON.parse(stored)); } catch { setItems(initialItems); }
    const storedNotes = window.localStorage.getItem("signal-notes");
    if (storedNotes) try { setNotes(JSON.parse(storedNotes)); } catch { setNotes(initialNotes); }
  }, []);
  useEffect(() => { window.localStorage.setItem("signal-items", JSON.stringify(items)); }, [items]);
  useEffect(() => { window.localStorage.setItem("signal-notes", JSON.stringify(notes)); }, [notes]);

  const pending = items.filter((item) => item.status === "pending");
  const visibleItems = useMemo(() => pending.filter((item) => (filter === "all" || item.priority === filter) && `${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(globalSearch.toLowerCase())), [pending, filter, globalSearch]);
  const selected = selectedId ? items.find((item) => item.id === selectedId) ?? visibleItems[0] : undefined;
  const completedToday = items.filter((item) => item.status !== "pending").length;
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0];
  const filteredNotes = notes.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(noteSearch.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const currentInsight = selectedNote ? analyses[selectedNote.id] ?? noteInsight(selectedNote.body) : null;

  function updateStatus(id: number, status: ItemStatus) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    const next = visibleItems.find((item) => item.id !== id); if (next) setSelectedId(next.id);
    showToast(status === "done" ? "已完成处理" : status === "archived" ? "已保留归档" : status === "deleted" ? "已移到废纸篓" : status === "snoozed" ? "已暂缓到明天" : "已恢复到处理队列");
  }
  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast(""), 1800); }
  async function addItem() {
    if (!newInput.trim()) return;
    const rawInput = newInput.trim();
    const inputSource = sourceContext === "jobs" ? "求职收藏" : sourceContext === "social" ? "内容收藏" : sourceContext === "notion" ? "Notion" : rawInput.startsWith("http") ? "网页链接" : "手动输入";
    const created: InfoItem = { id: Date.now(), source: inputSource, sourceClass: sourceContext ?? "web", title: rawInput.startsWith("http") ? rawInput.replace(/^https?:\/\//, "").slice(0, 48) : rawInput.slice(0, 38), summary: rawInput.slice(0, 120), meta: "新信息 · 正在分析", age: "刚刚", priority: "review", status: "pending", reason: "这是刚刚加入的信息，需要确认用途和优先级。", action: "查看并处理" };
    setItems((current) => [created, ...current]); setSelectedId(created.id); setNewInput(""); setSaved(true);
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: created.title, content: rawInput }) });
      const data = await response.json() as NoteAnalysis & { error?: string };
      if (!response.ok) throw new Error(data.error || "分析失败");
      setItems((current) => current.map((item) => item.id === created.id ? { ...item, summary: data.summary, meta: `${data.type} · 已分析`, reason: data.summary, action: data.actions[0] || "查看并处理" } : item));
      showToast("已保存并完成分析");
    } catch { setItems((current) => current.map((item) => item.id === created.id ? { ...item, meta: "已保存 · 本地" } : item)); showToast("已保存；智能分析暂时不可用"); }
    setSaved(false); setShowAdd(false); setSourceContext(null); setActiveNav("inbox");
  }
  async function importFiles(fileList?: FileList | File[]) {
    const files = fileList ? Array.from(fileList) : [];
    if (!files.length) return;
    setImporting(true);
    const imported: InfoItem[] = [];
    for (const [index, file] of files.entries()) {
      const isImage = file.type.startsWith("image/");
      const extension = file.name.split(".").pop()?.toLowerCase();
      let text = "";
      if (!isImage) try { text = await file.text(); } catch { text = ""; }
      const attachmentKey = `attachment-${Date.now()}-${index}-${file.name}`;
      try { await saveAttachment(attachmentKey, file); } catch { showToast(`${file.name} 原文件保存失败`); }
      const source = isImage || sourceContext === "photos" ? "截图" : sourceContext === "notion" ? "Notion 导入" : sourceContext === "jobs" ? "求职收藏" : sourceContext === "social" ? "内容收藏" : "本地文件";
      const base = Date.now() + index * 1000;
      if (extension === "json" && text.trim()) {
        try {
          const parsed = JSON.parse(text);
          const records = Array.isArray(parsed) ? parsed : [parsed];
          records.slice(0, 500).forEach((record, recordIndex) => {
            const value = typeof record === "string" ? record : JSON.stringify(record);
            imported.push({ id: base + recordIndex, source, sourceClass: sourceContext ?? "web", title: typeof record === "object" && record && (record.title || record.name) ? String(record.title || record.name) : `${file.name} · ${recordIndex + 1}`, summary: value.slice(0, 180), meta: "JSON 记录 · 已导入", age: "刚刚", priority: "review", status: "pending", reason: "由结构化文件批量导入，需要确认价值与下一步。", action: "查看并处理", attachmentKey });
          });
          continue;
        } catch { /* 作为普通文本导入 */ }
      }
      if (extension === "csv" && text.trim()) {
        const rows = text.split(/\r?\n/).filter(Boolean).slice(0, 501);
        const headers = rows[0]?.split(",").map((cell) => cell.trim()) ?? [];
        rows.slice(1).forEach((row, rowIndex) => {
          const cells = row.split(",").map((cell) => cell.trim());
          const value = headers.map((header, cellIndex) => `${header}: ${cells[cellIndex] ?? ""}`).join(" · ");
          imported.push({ id: base + rowIndex, source, sourceClass: sourceContext ?? "web", title: cells[0] || `${file.name} · ${rowIndex + 1}`, summary: value.slice(0, 180), meta: "CSV 记录 · 已导入", age: "刚刚", priority: "review", status: "pending", reason: "由表格批量导入，需要确认价值与下一步。", action: "查看并处理", attachmentKey });
        });
        continue;
      }
      imported.push({ id: base, source, sourceClass: isImage ? "shot" : sourceContext ?? "web", title: file.name, summary: isImage ? "截图与原文件已保存。视觉 OCR 接口配置完成后可继续识别正文。" : text.slice(0, 180) || "文件已加入统一收件箱。", meta: `${file.type || extension?.toUpperCase() || "文件"} · ${(file.size / 1024).toFixed(1)} KB`, age: "刚刚", priority: "review", status: "pending", reason: "这是新导入的信息，需要确认用途。", action: isImage ? "识别截图内容" : "查看并处理", attachmentKey });
    }
    if (imported.length) { setItems((current) => [...imported, ...current]); setSelectedId(imported[0].id); }
    setImporting(false); setShowAdd(false); setSourceContext(null); setActiveNav("inbox"); showToast(`已导入 ${imported.length} 条信息`);
  }
  function addNote() {
    const note: Note = { id: Date.now(), title: "新备忘录", body: "", updated: "刚刚", pinned: false };
    setNotes((current) => [note, ...current]); setSelectedNoteId(note.id); setActiveNav("notes");
  }
  function updateNote(field: "title" | "body", value: string) {
    setNotes((current) => current.map((note) => note.id === selectedNoteId ? { ...note, [field]: value, updated: "刚刚" } : note));
  }
  function togglePin() { setNotes((current) => current.map((note) => note.id === selectedNoteId ? { ...note, pinned: !note.pinned } : note)); }
  function deleteNote() { const remaining = notes.filter((note) => note.id !== selectedNoteId); setNotes(remaining); if (remaining[0]) setSelectedNoteId(remaining[0].id); }
  function noteInsight(body: string) {
    if (/岗位|面试|实习|SQL/.test(body)) return { type: "求职准备", summary: "这是一份求职行动笔记，包含岗位筛选、项目表达和能力补充三类任务。", actions: ["整理 10 个目标岗位", "完成 EvalFlow 评测指标", "安排一次模拟面试"] };
    if (/Signal|产品|收藏|信息/.test(body)) return { type: "产品项目", summary: "核心判断是：Signal 应该减少信息积压，而不是增加新的收藏位置。", actions: ["验证每日调度是否有用", "记录最常见的信息来源", "观察哪些建议判断错误"] };
    if (/明天|要做|下午|晚上/.test(body)) return { type: "日程与任务", summary: "这份笔记包含 4 项近期行动，适合进入今日调度而不是长期留在备忘录。", actions: ["查看 3 个实习岗位", "整理函数题", "继续修改轻岗 UI"] };
    return { type: "个人记录", summary: "这是一条适合保留的个人记录，目前没有必须立即执行的截止事项。", actions: ["保留原文", "暂不创建任务"] };
  }
  async function analyzeSelectedNote() {
    if (!selectedNote) return;
    setAnalyzing(true); setAnalysisError("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: selectedNote.title, content: selectedNote.body }) });
      const data = await response.json() as NoteAnalysis & { error?: string };
      if (!response.ok) throw new Error(data.error || "分析失败");
      setAnalyses((current) => ({ ...current, [selectedNote.id]: { type: data.type, summary: data.summary, actions: data.actions } }));
    } catch (error) { setAnalysisError(error instanceof Error ? error.message : "分析失败，请检查 Token 和网络。 "); }
    finally { setAnalyzing(false); }
  }
  async function openOriginalFile(item: InfoItem) {
    if (!item.attachmentKey) return;
    try {
      const blob = await loadAttachment(item.attachmentKey);
      if (!blob) throw new Error("文件不存在");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { showToast("无法读取原文件，可能已清除浏览器数据"); }
  }
  function openSourceAdd(source: SourceId, mode: "text" | "file") {
    if (source === "notes" && mode === "text") { addNote(); setExpandedSource(null); return; }
    setSourceContext(source); setAddMode(mode); setShowAdd(true); setExpandedSource(null);
  }
  function addSelectedNoteToQueue() {
    if (!selectedNote) return;
    const insight = analyses[selectedNote.id] ?? noteInsight(selectedNote.body);
    const created: InfoItem = { id: Date.now(), source: "备忘录", sourceClass: "notes", title: selectedNote.title || "无标题备忘录", summary: insight.summary, meta: `${insight.type} · 来自备忘录`, age: "刚刚", priority: "review", status: "pending", reason: "这条备忘录包含可执行信息，已由你加入今日调度。", action: insight.actions[0] || "查看并处理" };
    setItems((current) => [created, ...current]); setSelectedId(created.id); setActiveNav("today"); showToast("已加入今日调度");
  }
  const sourceEntries: { id: SourceId; name: string; count: string }[] = [
    { id: "notes", name: "备忘录", count: String(notes.length) },
    { id: "notion", name: "Notion", count: "未接入" },
    { id: "social", name: "内容收藏", count: String(items.filter((item) => ["抖音", "网页链接", "内容收藏"].includes(item.source)).length) },
    { id: "jobs", name: "求职收藏", count: String(items.filter((item) => ["BOSS直聘", "牛客", "求职收藏"].includes(item.source)).length) },
    { id: "photos", name: "截图与照片", count: String(items.filter((item) => item.source === "截图").length) },
  ];
  const sourceLabel = sourceContext ? sourceEntries.find((source) => source.id === sourceContext)?.name : null;
  const title = activeNav === "today" ? "今日调度" : navItems.find((item) => item.id === activeNav)?.label;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Zap size={17} strokeWidth={2.5} /></div><div><strong>Signal</strong><span>个人信息调度系统</span></div></div>
        <nav className="main-nav" aria-label="主导航"><p className="nav-section">工作区</p>{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={activeNav === item.id ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(item.id)}><Icon size={17} /><span>{item.label}</span>{item.count ? <em>{pending.length + 33}</em> : null}</button>; })}</nav>
        <div className="source-nav"><div className="section-row"><p className="nav-section">已接入来源</p><button className="source-add" onClick={() => setActiveNav("sources")} aria-label="管理来源"><Settings size={13} /></button></div>{sourceEntries.map((source) => <div className={expandedSource === source.id ? "source-entry expanded" : "source-entry"} key={source.id}><div className="source-entry-row"><button className="source-link" onClick={() => setActiveNav("sources")}><i className={`dot ${source.id}`} />{source.name}<span>{source.count}</span></button><button className="source-quick-add" onClick={() => setExpandedSource((current) => current === source.id ? null : source.id)} aria-label={`添加${source.name}`} aria-expanded={expandedSource === source.id}><Plus size={13}/></button></div>{expandedSource === source.id ? <div className="source-expand">{source.id === "notes" ? <><button onClick={() => openSourceAdd(source.id,"text")}><NotebookPen size={13}/>新建备忘录</button><button onClick={() => openSourceAdd(source.id,"file")}><Upload size={13}/>导入文本</button></> : source.id === "photos" ? <button onClick={() => openSourceAdd(source.id,"file")}><Upload size={13}/>选择截图或照片</button> : <><button onClick={() => openSourceAdd(source.id,"text")}><Link2 size={13}/>{source.id === "notion" ? "粘贴页面内容" : "粘贴链接或文字"}</button><button onClick={() => openSourceAdd(source.id,"file")}><Upload size={13}/>{source.id === "notion" ? "导入导出文件" : "上传截图或文件"}</button></>}</div> : null}</div>)}</div>
        <div className="sidebar-footer"><button className={activeNav === "settings" ? "nav-item active" : "nav-item"} onClick={() => setActiveNav("settings")}><Settings size={17} /><span>设置与规则</span></button><div className="local-badge"><span /><div><strong>仅保存在本机</strong><small>数据未上传云端</small></div></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Zap size={16} /></div><strong>Signal</strong></div><div className="search-box"><Search size={17} /><input aria-label="搜索信息" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="搜索全部信息、来源或项目" /><kbd>⌘ K</kbd></div><div className="top-actions"><button className="icon-button" aria-label="通知" onClick={() => showToast("目前没有新的通知")}><Bell size={18} /></button><button className="add-button" onClick={activeNav === "notes" ? addNote : () => { setSourceContext(null); setAddMode("text"); setShowAdd(true); }}><Plus size={17} />{activeNav === "notes" ? "新建备忘录" : "添加信息"}</button></div></header>
        {activeNav === "notes" ? (
          <div className="notes-page">
            <aside className="notes-list-panel">
              <div className="notes-list-heading"><div><span className="eyebrow">LOCAL NOTES</span><h1>备忘录</h1></div><button className="note-new-icon" onClick={addNote} aria-label="新建备忘录"><Plus size={18} /></button></div>
              <label className="notes-search"><Search size={15} /><input value={noteSearch} onChange={(event) => setNoteSearch(event.target.value)} placeholder="搜索备忘录" /></label>
              <div className="notes-count">{filteredNotes.length} 条备忘录 · 自动保存在本机</div>
              <div className="notes-list">{filteredNotes.map((note) => <button key={note.id} className={note.id === selectedNote?.id ? "note-row active" : "note-row"} onClick={() => setSelectedNoteId(note.id)}><div className="note-row-title"><strong>{note.title || "无标题"}</strong>{note.pinned ? <Pin size={12} fill="currentColor" /> : null}</div><p>{note.body.replace(/\n/g, " ").slice(0, 58) || "开始输入…"}</p><span>{note.updated}</span></button>)}</div>
            </aside>
            {selectedNote ? <>
              <section className="note-editor">
                <div className="note-toolbar"><span>{selectedNote.updated} · 已自动保存</span><div><button className="toolbar-action" onClick={addSelectedNoteToQueue}><Zap size={14} />加入调度</button><button className={selectedNote.pinned ? "active" : ""} onClick={togglePin} aria-label="置顶"><Pin size={16} /></button><button onClick={deleteNote} aria-label="删除"><Trash2 size={16} /></button></div></div>
                <input className="note-title-input" value={selectedNote.title} onChange={(event) => updateNote("title", event.target.value)} placeholder="标题" />
                <textarea className="note-body-input" value={selectedNote.body} onChange={(event) => updateNote("body", event.target.value)} placeholder="开始记录…" />
                <section className="compact-insight"><div><span>Signal 分析 · {analyses[selectedNote.id] ? "智能分析" : "本地预览"}</span><strong>{currentInsight?.type}</strong><p>{currentInsight?.summary}</p></div><button onClick={analyzeSelectedNote} disabled={analyzing}>{analyzing ? "分析中…" : "重新分析"}</button></section>
                <div className="note-status"><span>{selectedNote.body.length} 个字符</span><span>本机自动保存</span></div>
              </section>
              <aside className="note-insight">
                <div className="detail-heading"><span>Signal 分析</span><span className="local-analysis">{analyses[selectedNote.id] ? "已分析" : "本地预览"}</span></div>
                <div className="insight-hero"><span className="ai-icon"><Sparkles size={18} /></span><div><small>识别类型</small><strong>{currentInsight?.type}</strong></div></div>
                <div className="insight-block"><span>内容摘要</span><p>{currentInsight?.summary}</p></div>
                <div className="insight-block"><span>建议动作</span><ul>{currentInsight?.actions.map((action) => <li key={action}><Check size={14} />{action}</li>)}</ul></div>
                <div className="model-connect"><button onClick={analyzeSelectedNote} disabled={analyzing}>{analyzing ? "正在理解…" : "重新分析"}</button>{analysisError ? <p>{analysisError}</p> : null}</div>
                <button className="send-to-queue" onClick={addSelectedNoteToQueue}><Zap size={16} />加入今日调度</button>
                <p className="analysis-disclaimer">分析时当前笔记内容会发送给模型服务。请不要提交密码、证件等敏感信息。</p>
              </aside>
            </> : null}
          </div>
        ) : activeNav === "inbox" ? (
          <div className="utility-page"><div className="utility-heading"><div><span className="eyebrow">ALL INPUTS</span><h1>统一收件箱</h1><p>所有新信息先到这里，再决定完成、归档或删除。</p></div><button className="add-button" onClick={() => setShowAdd(true)}><Plus size={16}/>添加信息</button></div><div className="utility-list">{items.filter((item) => item.status === "pending" || item.status === "snoozed").map((item) => <article className="inbox-row" key={item.id}><div className={`source-icon ${item.sourceClass}`}><FileText size={17}/></div><div><span>{item.source} · {item.age}</span><strong>{item.title}</strong><p>{item.summary}</p></div><div className="row-actions"><button onClick={() => updateStatus(item.id,"done")}><Check size={15}/>完成</button><button onClick={() => updateStatus(item.id,"archived")}><Archive size={15}/>归档</button><button onClick={() => updateStatus(item.id,"deleted")} aria-label="删除"><Trash2 size={15}/></button></div></article>)}</div></div>
        ) : activeNav === "sources" ? (
          <div className="utility-page sources-page"><div className="utility-heading"><div><span className="eyebrow">INPUT PIPELINES</span><h1>来源与导入</h1><p>每一个“已接入”都对应真实的数据入口；未授权的接口不会伪装成可用。</p></div><button className="add-button" onClick={() => { setSourceContext(null); setAddMode("file"); setShowAdd(true); }}><Upload size={16}/>批量导入</button></div><div className="source-table"><div className="source-table-head"><span>来源</span><span>接入方式</span><span>状态</span><span>操作</span></div>{[{id:"notes" as SourceId,name:"Signal 备忘录",method:"内置编辑器",status:"已接入",tone:"live"},{id:"photos" as SourceId,name:"截图与照片",method:"批量文件导入",status:"可导入",tone:"live"},{id:"notion" as SourceId,name:"Notion",method:"文件导入 · API 授权待配置",status:"部分可用",tone:"partial"},{id:"social" as SourceId,name:"小红书 / 抖音 / 网页",method:"分享链接 · 扩展待开发",status:"可导入链接",tone:"partial"},{id:"jobs" as SourceId,name:"BOSS / 牛客 / 实习僧",method:"链接或 CSV 批量导入",status:"可导入",tone:"live"}].map((source) => <article className="source-table-row" key={source.id}><div><i className={`dot ${source.id}`}/><strong>{source.name}</strong></div><p>{source.method}</p><span className={`connection-state ${source.tone}`}>{source.status}</span><div className="source-row-actions"><button onClick={() => openSourceAdd(source.id, source.id === "photos" ? "file" : "text")}><Plus size={14}/>添加</button>{source.id !== "notes" ? <button onClick={() => openSourceAdd(source.id,"file")}><Upload size={14}/>导入</button> : null}</div></article>)}</div><section className="connector-note"><strong>关于自动同步</strong><p>Notion 可以通过官方 API 做持续同步；普通网页可通过浏览器扩展采集。小红书、抖音与招聘平台没有稳定的收藏夹公开 API，因此不能承诺“登录后全量同步”，首版采用分享链接和批量导入，避免账号风险。</p></section></div>
        ) : activeNav === "archive" ? (
          <div className="utility-page"><div className="utility-heading"><div><span className="eyebrow">HISTORY</span><h1>归档记录</h1><p>已处理的信息可以随时恢复。</p></div></div><div className="utility-list">{items.filter((item) => !["pending","snoozed"].includes(item.status)).map((item) => <article className="inbox-row" key={item.id}><div className={`source-icon ${item.sourceClass}`}><Archive size={17}/></div><div><span>{item.status === "done" ? "已完成" : item.status === "archived" ? "已归档" : "已删除"}</span><strong>{item.title}</strong><p>{item.summary}</p></div><div className="row-actions"><button onClick={() => updateStatus(item.id,"pending")}><RotateCcw size={15}/>恢复</button></div></article>)}{items.every((item) => ["pending","snoozed"].includes(item.status)) ? <div className="utility-empty"><Archive size={24}/><strong>还没有归档记录</strong></div> : null}</div></div>
        ) : activeNav === "settings" ? (
          <div className="utility-page narrow"><div className="utility-heading"><div><span className="eyebrow">SETTINGS</span><h1>设置与规则</h1><p>Signal 打开即用，无需登录或配置密钥。</p></div></div><section className="settings-card"><div><h2>本地数据</h2><p>你的笔记、队列与附件保存在当前浏览器。清除浏览器数据会同时删除这些内容。</p></div><div className="setting-row"><span><strong>智能分析</strong><small>由 Signal 服务端提供</small></span><code>自动</code></div><div className="setting-row"><span><strong>账号</strong><small>无需注册或登录</small></span><code>免登录</code></div></section></div>
        ) : (
        <div className="page-content">
          <div className="page-heading"><div><p className="eyebrow">TODAY</p><h1>{title}</h1><p>{pending.length} 条待处理，{completedToday} 条已处理</p></div></div>
          <div className="content-grid">
            <section className="queue-panel"><div className="panel-header"><div><h2>处理队列</h2><span>{visibleItems.length} 条待判断</span></div><div className="filter-row"><button className={filter === "all" ? "filter active" : "filter"} onClick={() => setFilter("all")}>全部</button><button className={filter === "urgent" ? "filter active" : "filter"} onClick={() => setFilter("urgent")}>时效优先</button><button className={filter === "review" ? "filter active" : "filter"} onClick={() => setFilter("review")}>建议处理</button><button className={filter === "cleanup" ? "filter active" : "filter"} onClick={() => setFilter("cleanup")}>建议清理</button></div></div>
              <div className="queue-list">{visibleItems.map((item) => { const priority = priorityMap[item.priority]; return <article key={item.id} className={selected?.id === item.id ? "queue-item selected" : "queue-item"} onClick={() => setSelectedId(item.id)}><div className="item-body"><div className="item-topline"><span className={`priority ${priority.tone}`}>{priority.label}</span><span>{item.source}</span><time>{item.age}</time></div><h3>{item.title}</h3><p>{item.summary}</p></div></article>; })}{visibleItems.length === 0 ? <div className="empty-state"><Check size={24} /><strong>这个队列已经处理完了</strong><p>切换筛选条件，或从统一收件箱继续处理。</p></div> : null}</div>
            </section>
            <aside className="detail-panel">{selected && selected.status === "pending" ? <div className="detail-document"><div className="detail-heading"><span>详情</span><button aria-label="关闭详情" onClick={() => setSelectedId(0)}><X size={17} /></button></div><header className="document-header"><div className="document-meta"><span>{selected.source}</span><span>{selected.age}</span><span>{selected.meta}</span></div><h2>{selected.title}</h2>{selected.attachmentKey ? <button className="open-original" onClick={() => openOriginalFile(selected)}><FileText size={14}/>打开原文件</button> : null}</header><div className="document-body"><section><h3>摘要</h3><p>{selected.summary}</p></section><section><h3>处理建议</h3><p>{selected.action}</p></section><section className="document-note"><h3>调度依据</h3><p>{selected.reason}</p></section></div><footer className="document-actions"><button className="complete" onClick={() => updateStatus(selected.id, "done")}><Check size={15}/>完成</button><button onClick={() => updateStatus(selected.id, "snoozed")}><Clock3 size={15}/>明天处理</button><button onClick={() => updateStatus(selected.id, "archived")}><Archive size={15}/>归档</button><button className="delete" onClick={() => updateStatus(selected.id, "deleted")} aria-label="删除"><Trash2 size={15}/></button></footer></div> : <div className="detail-empty"><FileText size={22} /><strong>选择一条信息</strong></div>}</aside>
          </div>
        </div>)}
      </section>
      <nav className="mobile-nav" aria-label="移动端导航">{navItems.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} className={activeNav === item.id ? "active" : ""} onClick={() => setActiveNav(item.id)}><Icon size={20} /><span>{item.label.replace("统一", "")}</span></button>; })}</nav>
      {toast ? <div className="toast" role="status"><Check size={16}/>{toast}</div> : null}
      {showAdd ? <div className="modal-backdrop" onMouseDown={() => { setShowAdd(false); setSourceContext(null); }}><section className="add-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">IMPORT TO SIGNAL</span><h2>{sourceLabel ? `添加到${sourceLabel}` : "导入信息"}</h2><p>支持单条粘贴和批量文件导入，导入后立即进入统一收件箱。</p></div><button className="icon-button" onClick={() => { setShowAdd(false); setSourceContext(null); }}><X size={19} /></button></div><div className="input-tabs"><button className={addMode === "text" ? "active" : ""} onClick={() => setAddMode("text")}><Link2 size={16} />链接或文字</button><button className={addMode === "file" ? "active" : ""} onClick={() => setAddMode("file")}><Upload size={16} />批量文件</button></div>{addMode === "text" ? <textarea autoFocus value={newInput} onChange={(event) => setNewInput(event.target.value)} placeholder="粘贴小红书、抖音、牛客、岗位链接，或者直接输入一段文字…" /> : <label className="file-drop"><Upload size={24}/><strong>{importing ? "正在导入…" : "选择一个或多个文件"}</strong><span>支持图片、TXT、Markdown、CSV、JSON · 单次最多解析 500 条记录</span><input type="file" multiple accept="image/*,.txt,.md,.csv,.json,text/plain,text/csv,application/json" disabled={importing} onChange={(event) => importFiles(event.target.files ?? undefined)}/></label>}<div className="import-facts"><span><Check size={13}/>免登录</span><span><Check size={13}/>本地保存</span><span><Check size={13}/>自动分析</span></div><div className="modal-actions"><button className="secondary-button" onClick={() => { setShowAdd(false); setSourceContext(null); }}>取消</button>{addMode === "text" ? <button className="add-button" onClick={addItem} disabled={!newInput.trim()}>{saved ? <><Check size={17} />处理中</> : <><Plus size={17} />加入并分析</>}</button> : null}</div></section></div> : null}
    </main>
  );
}

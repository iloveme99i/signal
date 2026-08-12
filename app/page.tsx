"use client";

import { AlertCircle, BookOpen, BriefcaseBusiness, CalendarDays, Check, FileText, Image as ImageIcon, Link2, ListChecks, NotebookPen, Plus, Search, Tag, Upload, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Category = "deadline" | "task" | "job" | "knowledge" | "resource" | "project" | "contact" | "personal";
type SourceType = "screenshot" | "transcript" | "link" | "text" | "note" | "file";
type Confidence = "high" | "medium" | "low";
type SourceMaterial = { id: string; type: SourceType; title: string; rawText: string; createdAt: string };
type ExtractedItem = { id: string; sourceId: string; category: Category; title: string; content: string; fields: Record<string,string>; sourceQuote: string; confidence: Confidence; needsConfirmation: string[]; confirmed: boolean };
type Note = { id:string; title:string; body:string; updated:string };

const categoryMeta: Record<Category,{label:string;icon:typeof CalendarDays}> = {
  deadline:{label:"时间 / 截止",icon:CalendarDays}, task:{label:"待办 / 行动",icon:ListChecks}, job:{label:"求职 / 岗位",icon:BriefcaseBusiness},
  knowledge:{label:"知识 / 方法",icon:BookOpen}, resource:{label:"工具 / 资源",icon:Link2}, project:{label:"项目 / 想法",icon:Tag},
  contact:{label:"人物 / 联系",icon:UserRound}, personal:{label:"个人记录",icon:NotebookPen},
};

const seedSource: SourceMaterial = {id:"source-demo",type:"screenshot",title:"云帆科技 AI 产品实习岗位截图",createdAt:"今天 10:24",rawText:"云帆科技招聘 AI 产品实习生，工作地点北京。参与大模型产品评测和 Agent 工作流设计，要求熟悉 SQL，有评测项目经验优先。8月16日 18:00 前发送简历和作品集至 campus@example.com，邮件标题：姓名-AI产品实习。内推码 YF2026。"};
const seedItems: ExtractedItem[] = [
  {id:"item-job",sourceId:seedSource.id,category:"job",title:"云帆科技｜AI 产品实习生",content:"北京；参与大模型产品评测和 Agent 工作流设计；要求熟悉 SQL，评测项目经验优先。",fields:{公司:"云帆科技",城市:"北京",岗位:"AI 产品实习生"},sourceQuote:"云帆科技招聘 AI 产品实习生，工作地点北京。",confidence:"high",needsConfirmation:[],confirmed:true},
  {id:"item-time",sourceId:seedSource.id,category:"deadline",title:"云帆科技投递截止",content:"8月16日 18:00 前完成投递。",fields:{日期:"8月16日",时间:"18:00"},sourceQuote:"8月16日 18:00 前发送简历和作品集",confidence:"high",needsConfirmation:[],confirmed:true},
  {id:"item-task",sourceId:seedSource.id,category:"task",title:"投递云帆科技 AI 产品实习",content:"准备简历和作品集，邮件标题使用“姓名-AI产品实习”。",fields:{材料:"简历、作品集",渠道:"邮件",状态:"未完成"},sourceQuote:"发送简历和作品集至 campus@example.com，邮件标题：姓名-AI产品实习。",confidence:"high",needsConfirmation:[],confirmed:true},
  {id:"item-resource",sourceId:seedSource.id,category:"resource",title:"云帆科技投递信息",content:"投递邮箱 campus@example.com；内推码 YF2026。",fields:{邮箱:"campus@example.com",内推码:"YF2026"},sourceQuote:"campus@example.com…内推码 YF2026",confidence:"high",needsConfirmation:[],confirmed:true},
];
const seedNotes: Note[] = [{id:"note-1",title:"Signal 要解决的问题",body:"把截图、收藏、视频字幕和备忘录中的有用信息逐条摘取并分类，保留原文，不再让我重新翻一遍。",updated:"刚刚"}];

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const compact = (value:string) => value.replace(/\s+/g," ").trim();

function localExtract(raw:string,sourceId:string): ExtractedItem[] {
  const text=compact(raw); const parts=raw.split(/[。！？\n；]+/).map(compact).filter(Boolean); const out:ExtractedItem[]=[];
  const add=(category:Category,title:string,content:string,quote:string,fields:Record<string,string>={},needs:string[]=[])=>out.push({id:uid(),sourceId,category,title,content,sourceQuote:quote,fields,confidence:needs.length?"low":"medium",needsConfirmation:needs,confirmed:needs.length===0});
  const deadline=parts.find(p=>/截止|之前|前完成|截至|\d{1,2}[月\/.-]\d{1,2}|周[一二三四五六日天]/.test(p));
  if(deadline){ const date=deadline.match(/(?:\d{4}年)?\d{1,2}月\d{1,2}日|\d{1,2}[\/.-]\d{1,2}|(?:下下|下|本)?周[一二三四五六日天]/)?.[0]||"待确认"; const time=deadline.match(/\d{1,2}:\d{2}/)?.[0]||""; add("deadline",deadline.slice(0,32),deadline,deadline,{日期:date,...(time?{时间:time}:{})},date==="待确认"?["日期"]:[]); }
  parts.filter(p=>/需要|请|记得|提交|发送|报名|投递|准备|完成|不要|必须/.test(p)).slice(0,3).forEach(p=>add("task",p.slice(0,32),p,p,{状态:"未完成"}));
  const job=parts.find(p=>/招聘|岗位|实习|职位|任职|工作地点|JD/.test(p)); if(job)add("job",job.slice(0,32),job,job);
  parts.filter(p=>/https?:\/\/|www\.|邮箱|@|链接|工具|软件|内推码|资源/.test(p)).slice(0,3).forEach(p=>add("resource",p.slice(0,32),p,p));
  parts.filter(p=>/方法|步骤|原则|技巧|核心|观点|经验|原因|如何|可以/.test(p)).slice(0,4).forEach(p=>add("knowledge",p.slice(0,32),p,p));
  if(!out.length)add("personal",text.slice(0,32)||"未命名记录",text||"空内容",text||"空内容");
  return out;
}

export default function Home(){
  const [view,setView]=useState<"library"|"import"|"review"|"notes">("library");
  const [sources,setSources]=useState<SourceMaterial[]>([seedSource]); const [items,setItems]=useState<ExtractedItem[]>(seedItems); const [notes,setNotes]=useState<Note[]>(seedNotes);
  const [selectedId,setSelectedId]=useState(seedItems[0].id); const [selectedNoteId,setSelectedNoteId]=useState(seedNotes[0].id); const [input,setInput]=useState(""); const [query,setQuery]=useState(""); const [category,setCategory]=useState<Category|"all">("all"); const [processing,setProcessing]=useState(false); const [toast,setToast]=useState(""); const fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{try{const s=localStorage.getItem("signal-sources"),i=localStorage.getItem("signal-items"),n=localStorage.getItem("signal-notes");if(s)setSources(JSON.parse(s));if(i)setItems(JSON.parse(i));if(n)setNotes(JSON.parse(n));}catch{}},[]);
  useEffect(()=>{localStorage.setItem("signal-sources",JSON.stringify(sources));localStorage.setItem("signal-items",JSON.stringify(items));localStorage.setItem("signal-notes",JSON.stringify(notes));},[sources,items,notes]);
  const filtered=useMemo(()=>items.filter(i=>(view!=="review"||i.needsConfirmation.length>0)&& (category==="all"||i.category===category) && `${i.title}${i.content}${Object.values(i.fields).join(" ")}`.toLowerCase().includes(query.toLowerCase())),[items,view,category,query]);
  const selected=items.find(i=>i.id===selectedId)??filtered[0]; const source=selected?sources.find(s=>s.id===selected.sourceId):undefined; const selectedNote=notes.find(n=>n.id===selectedNoteId)??notes[0];
  const notify=(m:string)=>{setToast(m);setTimeout(()=>setToast(""),1800)};
  async function extract(raw:string,type:SourceType,title?:string){
    const sourceId=uid(); const material:SourceMaterial={id:sourceId,type,title:title||compact(raw).slice(0,36)||"未命名材料",rawText:raw,createdAt:"刚刚"}; setProcessing(true); let extracted:ExtractedItem[]=[];
    try{const response=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:material.title,content:raw,sourceId})});if(response.ok){const data=await response.json();extracted=Array.isArray(data.items)?data.items.map((i:ExtractedItem)=>({...i,id:uid(),sourceId})):[];}}catch{}
    if(!extracted.length)extracted=localExtract(raw,sourceId); setSources(c=>[material,...c]);setItems(c=>[...extracted,...c]);setSelectedId(extracted[0]?.id||"");setProcessing(false);setInput("");setView(extracted.some(i=>i.needsConfirmation.length)?"review":"library");notify(`已摘取并分类 ${extracted.length} 条信息`);
  }
  async function handleFiles(files:FileList|null){if(!files?.length)return;for(const file of Array.from(files)){let text="";if(file.type.startsWith("image/")){setProcessing(true);notify(`正在识别截图：${file.name}`);try{const Tesseract=await import("tesseract.js");const result=await Tesseract.recognize(file,"chi_sim+eng");text=result.data.text;}catch{notify("截图文字识别失败，请重试或粘贴文字");setProcessing(false);continue;}}else if(file.type.startsWith("video/")){notify("视频请上传对应的 .srt / .vtt 字幕文件");continue;}else{try{text=await file.text()}catch{}}if(text.trim())await extract(text,file.type.startsWith("image/")?"screenshot":/srt|vtt/i.test(file.name)?"transcript":"file",file.name);else notify("没有读取到可识别文字");}}
  function updateItem(patch:Partial<ExtractedItem>){if(!selected)return;setItems(c=>c.map(i=>i.id===selected.id?{...i,...patch}:i));}
  function confirm(){if(!selected)return;updateItem({confirmed:true,needsConfirmation:[]});notify("已确认并收入信息库");}
  function newNote(){const n={id:uid(),title:"新备忘录",body:"",updated:"刚刚"};setNotes(c=>[n,...c]);setSelectedNoteId(n.id);}
  function updateNote(field:"title"|"body",value:string){setNotes(c=>c.map(n=>n.id===selectedNoteId?{...n,[field]:value,updated:"刚刚"}:n));}

  const nav=[{id:"library",label:"信息库",icon:BookOpen,count:items.length},{id:"import",label:"添加 / 导入",icon:Plus},{id:"review",label:"待确认",icon:AlertCircle,count:items.filter(i=>i.needsConfirmation.length).length},{id:"notes",label:"备忘录",icon:NotebookPen,count:notes.length}] as const;
  return <main className="signal-app"><aside className="signal-sidebar"><div className="signal-brand"><span>S</span><div><strong>Signal</strong><small>信息识别与分类</small></div></div><nav>{nav.map(n=><button key={n.id} className={view===n.id?"active":""} onClick={()=>setView(n.id)}><n.icon size={17}/><span>{n.label}</span>{"count" in n?<em>{n.count}</em>:null}</button>)}</nav><div className="source-note"><strong>一份材料，多条信息</strong><p>每条信息保留原文位置，可以核对和修改。</p></div><div className="privacy"><i/>无需登录 · 当前设备自动保存</div></aside>
  <section className="signal-main"><header className="signal-topbar"><label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索标题、内容或字段"/></label><button onClick={()=>setView("import")}><Plus size={16}/>添加材料</button></header>
  {view==="import"?<section className="import-view"><header><span>添加材料</span><h1>把原始内容放进来</h1><p>Signal 会逐条识别其中的时间、行动、岗位、知识、资源等信息，不把整份内容压成一个摘要。</p></header><div className="import-box"><textarea autoFocus value={input} onChange={e=>setInput(e.target.value)} placeholder="粘贴收藏正文、视频字幕、岗位描述、聊天记录或任意一段文字……"/><footer><button onClick={()=>fileInput.current?.click()}><Upload size={16}/>上传截图 / 文字 / 字幕</button><button className="primary" disabled={!input.trim()||processing} onClick={()=>extract(input,input.trim().startsWith("http")?"link":"text")}>{processing?"正在逐条识别…":"识别并分类"}</button></footer></div><input ref={fileInput} hidden multiple type="file" accept=".txt,.md,.csv,.json,.srt,.vtt,image/*,video/*" onChange={e=>handleFiles(e.target.files)}/><div className="support-row"><div><ImageIcon size={17}/><span><strong>截图 / 照片</strong>直接上传，先识别文字再逐条分类</span></div><div><FileText size={17}/><span><strong>长视频</strong>上传 SRT / VTT 字幕即可分类信息</span></div></div></section>
  :view==="notes"?<section className="notes-layout"><aside><header><div><span>NOTES</span><h1>备忘录</h1></div><button onClick={newNote}><Plus size={17}/></button></header>{notes.map(n=><button key={n.id} className={n.id===selectedNote?.id?"active":""} onClick={()=>setSelectedNoteId(n.id)}><strong>{n.title||"无标题"}</strong><p>{n.body.slice(0,52)||"开始记录…"}</p><small>{n.updated}</small></button>)}</aside>{selectedNote?<article><div className="note-toolbar"><span>{selectedNote.updated} · 自动保存</span><button disabled={!selectedNote.body.trim()||processing} onClick={()=>extract(selectedNote.body,"note",selectedNote.title)}>识别并分类这条笔记</button></div><input value={selectedNote.title} onChange={e=>updateNote("title",e.target.value)} placeholder="标题"/><textarea value={selectedNote.body} onChange={e=>updateNote("body",e.target.value)} placeholder="开始记录……"/></article>:null}</section>
  :<section className="library-view"><header className="library-heading"><span>{view==="review"?"待确认":"信息库"}</span><h1>{view==="review"?"需要你确认的信息":"已识别的信息"}</h1><p>{view==="review"?"只处理日期、地点或含义不够明确的字段。":"每一行是一条独立的有用信息，同一份材料可以出现在多个分类。"}</p></header><div className="category-tabs"><button className={category==="all"?"active":""} onClick={()=>setCategory("all")}>全部 <i>{items.length}</i></button>{(Object.keys(categoryMeta) as Category[]).map(k=><button key={k} className={category===k?"active":""} onClick={()=>setCategory(k)}>{categoryMeta[k].label} <i>{items.filter(i=>i.category===k).length}</i></button>)}</div><div className="records-layout"><div className="records"><div className="records-head"><span>分类</span><span>识别出的信息</span><span>来源</span><span>状态</span></div>{filtered.map(item=>{const meta=categoryMeta[item.category];const src=sources.find(s=>s.id===item.sourceId);return <button key={item.id} className={selected?.id===item.id?"selected":""} onClick={()=>setSelectedId(item.id)}><span className="category-cell"><meta.icon size={15}/>{meta.label}</span><span className="record-copy"><strong>{item.title}</strong><small>{item.content}</small></span><span className="source-cell">{src?.title||"未知来源"}</span><span className={item.needsConfirmation.length?"status warn":"status"}>{item.needsConfirmation.length?"待确认":"已归档"}</span></button>})}{!filtered.length?<div className="empty"><Check size={22}/><span>这里没有待处理的信息</span></div>:null}</div><aside className="inspector">{selected?<><header><div><span>{categoryMeta[selected.category].label}</span><input value={selected.title} onChange={e=>updateItem({title:e.target.value})}/></div><button aria-label="关闭详情" onClick={()=>setSelectedId("")}><X size={16}/></button></header><section><label>分类</label><select value={selected.category} onChange={e=>updateItem({category:e.target.value as Category})}>{(Object.keys(categoryMeta) as Category[]).map(k=><option key={k} value={k}>{categoryMeta[k].label}</option>)}</select></section><section><label>摘取内容</label><textarea value={selected.content} onChange={e=>updateItem({content:e.target.value})}/></section>{Object.keys(selected.fields).length?<section><label>结构化字段</label><div className="fields">{Object.entries(selected.fields).map(([key,value])=><div key={key}><span>{key}</span><input value={value} onChange={e=>updateItem({fields:{...selected.fields,[key]:e.target.value}})}/></div>)}</div></section>:null}{selected.needsConfirmation.length?<section className="confirm-box"><label>需要确认</label><p>{selected.needsConfirmation.join("、")} 无法从原文确定，请核对后修改。</p><button onClick={confirm}><Check size={14}/>确认无误</button></section>:null}<section><label>原文依据</label><blockquote>{selected.sourceQuote}</blockquote></section><details><summary>查看完整原始材料</summary><p>{source?.rawText}</p></details></>:<div className="empty"><span>选择一条信息查看来源</span></div>}</aside></div></section>}
  </section>{toast?<div className="signal-toast"><Check size={14}/>{toast}</div>:null}</main>;
}

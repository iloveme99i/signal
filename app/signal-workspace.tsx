"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Cat =
  | "deadline"
  | "task"
  | "job"
  | "knowledge"
  | "resource"
  | "project"
  | "contact"
  | "personal";
type SourceType = "image" | "note";
type Source = {
  id: string;
  type: SourceType;
  title: string;
  rawText: string;
  imageData?: string;
  createdAt: string;
};
type Item = {
  id: string;
  sourceId: string;
  category: Cat;
  customCategory?: string;
  unclassified?: boolean;
  title: string;
  content: string;
  note?: string;
  sourceQuote: string;
  favorite?: boolean;
  pinned?: boolean;
  trashed?: boolean;
  createdAt?: string;
};
type PageBlock = {
  id: string;
  text: string;
  depth: number;
  type: "text" | "toggle";
  open?: boolean;
};
type CustomCategory = {
  id: string;
  label: string;
  parentId: string;
  collapsed?: boolean;
  blocks?: PageBlock[];
};
type Draft = {
  title: string;
  content: string;
  categoryId: string;
  sourceQuote: string;
};
type ImportBatch = { source: Source; drafts: Draft[] };
type View =
  | "all"
  | "inbox"
  | "favorites"
  | "pinned"
  | "board"
  | "notes"
  | "trash";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const sampleCategories: CustomCategory[] = [
  {
    id: "career",
    label: "求职",
    parentId: "root",
    blocks: [
      {
        id: "b-career",
        text: "收纳岗位、面试和简历相关内容。",
        depth: 0,
        type: "text",
      },
    ],
  },
  { id: "career-jobs", label: "岗位收藏", parentId: "career", blocks: [] },
  {
    id: "career-product",
    label: "产品实习",
    parentId: "career-jobs",
    blocks: [],
  },
  {
    id: "career-interview",
    label: "面试与简历",
    parentId: "career",
    blocks: [],
  },
  {
    id: "learning",
    label: "学习",
    parentId: "root",
    blocks: [
      {
        id: "b-learning",
        text: "保存值得反复查找的方法、知识和案例。",
        depth: 0,
        type: "text",
      },
    ],
  },
  { id: "learning-ai", label: "AI 与开发", parentId: "learning", blocks: [] },
  {
    id: "learning-product",
    label: "产品方法",
    parentId: "learning",
    blocks: [],
  },
  { id: "resources", label: "工具与资源", parentId: "root", blocks: [] },
  {
    id: "resources-software",
    label: "软件与网站",
    parentId: "resources",
    blocks: [],
  },
  {
    id: "resources-template",
    label: "教程与模板",
    parentId: "resources",
    blocks: [],
  },
  { id: "ideas", label: "灵感与记录", parentId: "root", blocks: [] },
  { id: "ideas-project", label: "项目想法", parentId: "ideas", blocks: [] },
  { id: "ideas-later", label: "稍后处理", parentId: "ideas", blocks: [] },
];
const sampleSources: Source[] = [
  {
    id: "sample-source-mixed-note",
    type: "note",
    title: "混合备忘录｜周末集中整理",
    rawText:
      "1. 求职：收藏了一个上海的产品实习岗位，要求会做用户研究和数据分析，8 月 25 日前从官网投递。\n\n2. 学习：整理 DeepSeek 结构化输出的用法，重点是让模型只返回约定字段，不额外写长篇分析。\n\n3. 工具：试用 Tesseract OCR 和 HEIC 转换工具，后面用来识别手机截图里的文字。\n\n4. 项目灵感：给 Signal 增加手机分享入口，把小红书、抖音和网页收藏直接送进待整理区。",
    createdAt: "2026-08-16T12:00:00.000Z",
  },
];
const sampleItems: Item[] = [
  {
    id: "sample-item-job",
    sourceId: "sample-source-mixed-note",
    category: "job",
    customCategory: "career-product",
    title: "上海产品实习岗位",
    content:
      "上海产品实习，要求用户研究和数据分析能力；8 月 25 日前通过官网投递。",
    sourceQuote:
      "收藏了一个上海的产品实习岗位，要求会做用户研究和数据分析，8 月 25 日前从官网投递。",
    createdAt: sampleSources[0].createdAt,
  },
  {
    id: "sample-item-learning",
    sourceId: "sample-source-mixed-note",
    category: "knowledge",
    customCategory: "learning-ai",
    title: "DeepSeek 结构化输出方法",
    content: "让模型只返回约定字段，不额外生成长篇分析。",
    sourceQuote:
      "整理 DeepSeek 结构化输出的用法，重点是让模型只返回约定字段，不额外写长篇分析。",
    createdAt: sampleSources[0].createdAt,
  },
  {
    id: "sample-item-resource",
    sourceId: "sample-source-mixed-note",
    category: "resource",
    customCategory: "resources-software",
    title: "截图识别工具组合",
    content: "Tesseract OCR + HEIC 转换，用于识别手机截图中的文字。",
    sourceQuote:
      "试用 Tesseract OCR 和 HEIC 转换工具，后面用来识别手机截图里的文字。",
    createdAt: sampleSources[0].createdAt,
  },
  {
    id: "sample-item-idea",
    sourceId: "sample-source-mixed-note",
    category: "project",
    customCategory: "ideas-project",
    title: "Signal 手机分享入口",
    content: "把小红书、抖音和网页收藏直接送进 Signal 的待整理区。",
    sourceQuote:
      "给 Signal 增加手机分享入口，把小红书、抖音和网页收藏直接送进待整理区。",
    createdAt: sampleSources[0].createdAt,
  },
];

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function normalizeImage(file: File): Promise<File> {
  if (!/\.hei[cf]$/i.test(file.name) && !/heic|heif/i.test(file.type))
    return file;
  const module = await import("heic2any");
  const converted = await module.default({
    blob: file,
    toType: "image/jpeg",
    quality: 0.86,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), {
    type: "image/jpeg",
  });
}
async function compressImage(file: File) {
  const normalized = await normalizeImage(file);
  const originalDataUrl = await readFileAsDataUrl(normalized);
  const image = document.createElement("img");
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("无法读取这张图片"));
    image.src = originalDataUrl;
  });
  const maxSide = 1800,
    scale = Math.min(
      1,
      maxSide / Math.max(image.naturalWidth, image.naturalHeight),
    );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
  const ocrBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片压缩处理失败"))),
      "image/jpeg",
      0.84,
    ),
  );
  return { dataUrl, ocrBlob };
}

export default function SignalWorkspace() {
  const [items, setItems] = useState<Item[]>(sampleItems),
    [sources, setSources] = useState<Source[]>(sampleSources),
    [custom, setCustom] = useState<CustomCategory[]>(sampleCategories);
  const [hydrated, setHydrated] = useState(false),
    [view, setView] = useState<View>("all"),
    [selectedCategory, setSelectedCategory] = useState("all"),
    [selectedId, setSelectedId] = useState(""),
    [rightOpen, setRightOpen] = useState(false),
    [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({}),
    [importOpen, setImportOpen] = useState(false),
    [importMode, setImportMode] = useState<SourceType>("note"),
    [importTitle, setImportTitle] = useState(""),
    [importText, setImportText] = useState("");
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]),
    [processing, setProcessing] = useState(false),
    [progress, setProgress] = useState(""),
    [importError, setImportError] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(""),
    [categoryName, setCategoryName] = useState(""),
    [newCategoryFocusId, setNewCategoryFocusId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const resetKey = "signal-curated-taxonomy-20260817";
      const storedCategories = JSON.parse(
        localStorage.getItem("signal-categories") || "[]",
      );
      if (
        !localStorage.getItem(resetKey) ||
        !Array.isArray(storedCategories) ||
        storedCategories.length === 0
      ) {
        localStorage.setItem("signal-items", JSON.stringify(sampleItems));
        localStorage.setItem("signal-sources", JSON.stringify(sampleSources));
        localStorage.setItem(
          "signal-categories",
          JSON.stringify(sampleCategories),
        );
        localStorage.setItem(resetKey, "done");
      }
      const demoKey = "signal-mixed-note-demo-20260817";
      if (!localStorage.getItem(demoKey)) {
        const existingItems = JSON.parse(
          localStorage.getItem("signal-items") || "[]",
        );
        const existingSources = JSON.parse(
          localStorage.getItem("signal-sources") || "[]",
        );
        localStorage.setItem(
          "signal-items",
          JSON.stringify([
            ...sampleItems,
            ...existingItems.filter(
              (item: Item) => !String(item.id).startsWith("sample-item-"),
            ),
          ]),
        );
        localStorage.setItem(
          "signal-sources",
          JSON.stringify([
            ...sampleSources,
            ...existingSources.filter(
              (source: Source) =>
                !String(source.id).startsWith("sample-source-"),
            ),
          ]),
        );
        localStorage.setItem(demoKey, "done");
      }
      setItems(JSON.parse(localStorage.getItem("signal-items") || "[]"));
      setSources(JSON.parse(localStorage.getItem("signal-sources") || "[]"));
      setCustom(JSON.parse(localStorage.getItem("signal-categories") || "[]"));
    } catch {
      setImportError("浏览器中的数据读取失败，但不会影响已保存的 API Key。");
    } finally {
      setHydrated(true);
    }
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("signal-items", JSON.stringify(items));
      localStorage.setItem("signal-sources", JSON.stringify(sources));
      localStorage.setItem("signal-categories", JSON.stringify(custom));
    } catch {
      setImportError("浏览器存储空间不足，请删除不需要的大图后再试。");
    }
  }, [items, sources, custom, hydrated]);
  useEffect(() => {
    if (!newCategoryFocusId) return;
    const frame = requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(
        ".category-page-title",
      );
      input?.focus();
      input?.select();
      setNewCategoryFocusId("");
    });
    return () => cancelAnimationFrame(frame);
  }, [newCategoryFocusId]);

  const selected = items.find((item) => item.id === selectedId),
    selectedSource = sources.find((source) => source.id === selected?.sourceId),
    activeCategory = custom.find((node) => node.id === selectedCategory);
  const descendants = (id: string): string[] => {
    const direct = custom
      .filter((node) => node.parentId === id)
      .map((node) => node.id);
    return direct.flatMap((child) => [child, ...descendants(child)]);
  };
  const categoryPath = (id: string): CustomCategory[] => {
    const node = custom.find((category) => category.id === id);
    if (!node) return [];
    return node.parentId === "root"
      ? [node]
      : [...categoryPath(node.parentId), node];
  };
  const categoryMatches = (item: Item, id: string) => {
    if (id === "all") return true;
    const ids = new Set([id, ...descendants(id)]);
    return (
      ids.has(item.category) ||
      Boolean(item.customCategory && ids.has(item.customCategory))
    );
  };
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (view === "trash") return Boolean(item.trashed);
        if (item.trashed) return false;
        if (view === "inbox" && !item.unclassified) return false;
        if (view === "favorites" && !item.favorite) return false;
        if (view === "pinned" && !item.pinned) return false;
        if (
          view === "notes" &&
          sources.find((source) => source.id === item.sourceId)?.type !== "note"
        )
          return false;
        if (!categoryMatches(item, selectedCategory)) return false;
        return `${item.title}${item.content}${item.note || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      }),
    [items, sources, view, selectedCategory, query, custom],
  );
  const patchItem = (id: string, patch: Partial<Item>) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const patchSource = (id: string, patch: Partial<Source>) =>
    setSources((current) =>
      current.map((source) =>
        source.id === id ? { ...source, ...patch } : source,
      ),
    );
  const resetImporter = () => {
    setImportTitle("");
    setImportText("");
    setImportBatches([]);
    setImportError("");
    setProgress("");
    setProcessing(false);
  };
  const closeImporter = () => {
    if (processing) return;
    setImportOpen(false);
    resetImporter();
  };

  const analyzeText = async (
    title: string,
    content: string,
  ): Promise<Draft[]> => {
    const apiKey = localStorage.getItem("signal-deepseek-key") || "";
    if (!apiKey)
      throw new Error("DeepSeek Key 不在当前浏览器中，请重新连接后再试。");
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        title,
        content,
        categories: custom.map((node) => ({
          id: node.id,
          label: categoryPath(node.id)
            .map((part) => part.label)
            .join(" / "),
        })),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "DeepSeek 整理失败");
    const drafts = Array.isArray(payload.items) ? payload.items : [];
    if (!drafts.length) throw new Error("没有识别出可保存的内容");
    return drafts.map((draft: Partial<Draft> & { category?: string }) => ({
      title: String(draft.title || title || "未命名内容"),
      content: String(draft.content || content),
      categoryId: custom.some((node) => node.id === String(draft.category))
        ? String(draft.category)
        : "",
      sourceQuote: String(draft.sourceQuote || content),
    }));
  };
  const organizeNote = async () => {
    if (!importText.trim()) {
      setImportError("先粘贴或输入一段内容。");
      return;
    }
    setProcessing(true);
    setImportError("");
    setProgress("正在理解内容并匹配现有分类…");
    try {
      const source: Source = {
        id: uid(),
        type: "note",
        title: importTitle.trim() || "备忘录",
        rawText: importText.trim(),
        createdAt: new Date().toISOString(),
      };
      const drafts = await analyzeText(source.title, source.rawText);
      setImportBatches([{ source, drafts }]);
      setProgress("整理完成，请确认内容和分类");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "整理失败");
    } finally {
      setProcessing(false);
    }
  };
  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setProcessing(true);
    setImportError("");
    setImportBatches([]);
    const batches: ImportBatch[] = [];
    try {
      const { createWorker } = await import("tesseract.js");
      let currentIndex = 0;
      setProgress("正在载入截图识别引擎，后续图片会复用…");
      const worker = await createWorker("chi_sim+eng", undefined, {
        logger: (message) => {
          if (message.status === "recognizing text")
            setProgress(
              `正在识别第 ${currentIndex + 1} / ${files.length} 张 · ${Math.round((message.progress || 0) * 100)}%`,
            );
        },
      });
      try {
        for (let index = 0; index < files.length; index += 1) {
          currentIndex = index;
          const original = files[index];
          setProgress(
            `正在处理第 ${index + 1} / ${files.length} 张：${original.name}`,
          );
          const normalized = await compressImage(original);
          const ocr = await worker.recognize(normalized.ocrBlob);
          const rawText = ocr.data.text.trim();
          const source: Source = {
            id: uid(),
            type: "image",
            title: original.name,
            rawText,
            imageData: normalized.dataUrl,
            createdAt: new Date().toISOString(),
          };
          setProgress(
            `正在整理第 ${index + 1} / ${files.length} 张并匹配分类…`,
          );
          const drafts = rawText
            ? await analyzeText(original.name, rawText)
            : [
                {
                  title: original.name,
                  content: "图片中没有识别到清晰文字，请手动补充内容。",
                  categoryId: "",
                  sourceQuote: "",
                },
              ];
          batches.push({ source, drafts });
          setImportBatches([...batches]);
        }
      } finally {
        await worker.terminate();
      }
      setProgress("识别完成，请确认内容和分类");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "图片识别失败");
    } finally {
      setProcessing(false);
    }
  };
  const updateDraft = (
    batchIndex: number,
    draftIndex: number,
    patch: Partial<Draft>,
  ) =>
    setImportBatches((current) =>
      current.map((batch, bIndex) =>
        bIndex !== batchIndex
          ? batch
          : {
              ...batch,
              drafts: batch.drafts.map((draft, dIndex) =>
                dIndex === draftIndex ? { ...draft, ...patch } : draft,
              ),
            },
      ),
    );
  const saveImports = () => {
    const newSources = importBatches.map((batch) => batch.source);
    const newItems = importBatches.flatMap((batch) =>
      batch.drafts.map(
        (draft) =>
          ({
            id: uid(),
            sourceId: batch.source.id,
            category: "personal" as Cat,
            customCategory: draft.categoryId || undefined,
            unclassified: !draft.categoryId,
            title: draft.title.trim() || batch.source.title,
            content: draft.content.trim(),
            note: "",
            sourceQuote: draft.sourceQuote,
            createdAt: new Date().toISOString(),
          }) satisfies Item,
      ),
    );
    setSources((current) => [...newSources, ...current]);
    setItems((current) => [...newItems, ...current]);
    setSelectedId(newItems[0]?.id || "");
    setView("all");
    setSelectedCategory("all");
    setRightOpen(Boolean(newItems.length));
    closeImporter();
  };
  const addCategory = (parentId: string) => {
    const id = uid();
    setCustom((current) => [
      ...current,
      {
        id,
        label: "",
        parentId,
        blocks: [{ id: uid(), text: "", depth: 0, type: "text" }],
      },
    ]);
    setCollapsed((current) => ({ ...current, [parentId]: false }));
    setEditingCategoryId("");
    setNewCategoryFocusId(id);
    setSelectedCategory(id);
    setView("all");
  };
  const finishCategoryEdit = () => {
    if (!editingCategoryId) return;
    const name = categoryName.trim() || "未命名";
    setCustom((current) =>
      current.map((node) =>
        node.id === editingCategoryId ? { ...node, label: name } : node,
      ),
    );
    setEditingCategoryId("");
    setCategoryName("");
  };
  const patchCategory = (id: string, patch: Partial<CustomCategory>) =>
    setCustom((current) =>
      current.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    );
  const patchPageBlock = (
    categoryId: string,
    blockId: string,
    patch: Partial<PageBlock>,
  ) =>
    setCustom((current) =>
      current.map((node) =>
        node.id === categoryId
          ? {
              ...node,
              blocks: (node.blocks || []).map((block) =>
                block.id === blockId ? { ...block, ...patch } : block,
              ),
            }
          : node,
      ),
    );
  const addPageBlock = (categoryId: string, afterId?: string) =>
    setCustom((current) =>
      current.map((node) => {
        if (node.id !== categoryId) return node;
        const blocks = [...(node.blocks || [])],
          index = afterId
            ? blocks.findIndex((block) => block.id === afterId) + 1
            : blocks.length;
        blocks.splice(index, 0, {
          id: uid(),
          text: "",
          depth: 0,
          type: "text",
        });
        return { ...node, blocks };
      }),
    );
  const removePageBlock = (categoryId: string, blockId: string) =>
    setCustom((current) =>
      current.map((node) => {
        if (node.id !== categoryId || (node.blocks || []).length <= 1)
          return node;
        return {
          ...node,
          blocks: (node.blocks || []).filter((block) => block.id !== blockId),
        };
      }),
    );
  const deleteCategory = (id: string) => {
    const node = custom.find((category) => category.id === id);
    if (
      !node ||
      !window.confirm(
        `删除“${node.label}”及其子分类？分类中的内容会进入待分类。`,
      )
    )
      return;
    const ids = new Set([id, ...descendants(id)]);
    setCustom((current) => current.filter((category) => !ids.has(category.id)));
    setItems((current) =>
      current.map((item) =>
        item.customCategory && ids.has(item.customCategory)
          ? { ...item, customCategory: undefined, unclassified: true }
          : item,
      ),
    );
    if (ids.has(selectedCategory)) setSelectedCategory("all");
  };
  const dropIntoCategory = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/signal-item");
    if (itemId && custom.some((node) => node.id === targetId))
      patchItem(itemId, { customCategory: targetId, unclassified: false });
  };
  const renderTree = (parentId: string, depth = 0): React.ReactNode => {
    const children = custom.filter((node) => node.parentId === parentId);
    return children.map((node) => {
      const hasChildren = custom.some(
          (candidate) => candidate.parentId === node.id,
        ),
        isCollapsed = Boolean(collapsed[node.id]);
      return (
        <div key={node.id}>
          <div
            className={`tree-row ${selectedCategory === node.id ? "active" : ""}`}
            style={{ paddingLeft: 8 + depth * 15 }}
            onContextMenu={(event) => {
              event.preventDefault();
              deleteCategory(node.id);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => dropIntoCategory(event, node.id)}
          >
            {hasChildren ? (
              <button
                className="tree-toggle"
                type="button"
                onClick={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [node.id]: !current[node.id],
                  }))
                }
                aria-label={
                  isCollapsed ? `展开${node.label}` : `收起${node.label}`
                }
              >
                {isCollapsed ? <ChevronRight /> : <ChevronDown />}
              </button>
            ) : (
              <span className="tree-toggle-spacer" aria-hidden="true" />
            )}
            {editingCategoryId === node.id ? (
              <input
                className="tree-rename"
                autoFocus
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                onBlur={finishCategoryEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") finishCategoryEdit();
                  if (event.key === "Escape") {
                    setEditingCategoryId("");
                    setCategoryName("");
                  }
                }}
              />
            ) : (
              <button
                className="tree-main"
                type="button"
                onDoubleClick={(event) => {
                  event.preventDefault();
                  setEditingCategoryId(node.id);
                  setCategoryName(node.label);
                }}
                onClick={() => {
                  setSelectedCategory(node.id);
                  setView("all");
                }}
              >
                <FileText aria-hidden="true" />
                <span>{node.label || "未命名"}</span>
              </button>
            )}
            <button
              className="tree-add"
              type="button"
              onClick={() => addCategory(node.id)}
              aria-label={`在${node.label || "未命名"}下添加分类`}
            >
              <Plus />
            </button>
          </div>
          {hasChildren && !isCollapsed ? renderTree(node.id, depth + 1) : null}
        </div>
      );
    });
  };

  const viewTitle: Record<View, string> = {
    all:
      selectedCategory === "all"
        ? "全部内容"
        : custom.find((node) => node.id === selectedCategory)?.label || "内容",
    inbox: "待分类",
    favorites: "收藏",
    pinned: "置顶",
    board: "看板",
    notes: "备忘录",
    trash: "回收站",
  };
  const navItems = [
    {
      id: "all" as View,
      label: "全部内容",
      icon: BookOpen,
      count: items.filter((item) => !item.trashed).length,
    },
    {
      id: "inbox" as View,
      label: "待分类",
      icon: Inbox,
      count: items.filter((item) => !item.trashed && item.unclassified).length,
    },
    {
      id: "favorites" as View,
      label: "收藏",
      icon: Star,
      count: items.filter((item) => !item.trashed && item.favorite).length,
    },
    {
      id: "pinned" as View,
      label: "置顶",
      icon: Pin,
      count: items.filter((item) => !item.trashed && item.pinned).length,
    },
    { id: "board" as View, label: "看板", icon: LayoutDashboard },
    { id: "notes" as View, label: "备忘录", icon: NotebookPen },
  ];

  return (
    <main className="wk">
      <aside className="wk-side">
        <header>
          <b>S</b>
          <strong>Signal</strong>
        </header>
        <button
          className="primary-capture"
          type="button"
          onClick={() => setImportOpen(true)}
        >
          <Plus />
          添加内容
        </button>
        <label className="side-search">
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索内容"
          />
        </label>
        <nav>
          {navItems.map((nav) => (
            <button
              className={view === nav.id ? "active" : ""}
              key={nav.id}
              type="button"
              onClick={() => {
                setView(nav.id);
                setSelectedCategory("all");
              }}
            >
              <nav.icon />
              <span>{nav.label}</span>
              {typeof nav.count === "number" ? <em>{nav.count}</em> : null}
            </button>
          ))}
        </nav>
        <section className="category-tree">
          <header>
            <span>分类</span>
            <button
              type="button"
              onClick={() => addCategory("root")}
              aria-label="新建分类"
            >
              <Plus />
            </button>
          </header>
          {custom.some((node) => node.parentId === "root") ? (
            renderTree("root")
          ) : (
            <button
              className="empty-tree-create"
              type="button"
              onClick={() => addCategory("root")}
            >
              <Plus />
              新建分类
            </button>
          )}
        </section>
        <footer>
          <button
            className={view === "trash" ? "active" : ""}
            type="button"
            onClick={() => {
              setView("trash");
              setSelectedCategory("all");
            }}
          >
            <Trash2 />
            回收站
          </button>
        </footer>
      </aside>
      <section className="wk-list">
        <header>
          <div>
            <small>Signal / 信息库</small>
            <h1>{viewTitle[view]}</h1>
          </div>
          <div className="list-actions">
            <button
              className="upload-button"
              type="button"
              onClick={() => setImportOpen(true)}
            >
              <Upload />
              添加内容
            </button>
            <button
              type="button"
              onClick={() => setRightOpen((open) => !open)}
              aria-label="切换详情栏"
            >
              {rightOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </button>
          </div>
        </header>
        {view === "all" && activeCategory ? (
          <div className="category-canvas">
            <div className="page-breadcrumb">
              {categoryPath(activeCategory.id).map((part, index, path) => (
                <span key={part.id}>
                  {part.label}
                  {index < path.length - 1 ? " / " : ""}
                </span>
              ))}
            </div>
            <input
              className="category-page-title"
              autoFocus={newCategoryFocusId === activeCategory.id}
              value={activeCategory.label}
              onChange={(event) =>
                patchCategory(activeCategory.id, { label: event.target.value })
              }
              placeholder="未命名"
            />
            <div className="page-blocks">
              {(activeCategory.blocks || []).map((block) => (
                <div
                  className="page-block"
                  style={{ paddingLeft: block.depth * 20 }}
                  key={block.id}
                >
                  <GripVertical />
                  {block.type === "toggle" ? (
                    <button
                      type="button"
                      onClick={() =>
                        patchPageBlock(activeCategory.id, block.id, {
                          open: !block.open,
                        })
                      }
                    >
                      {block.open ? <ChevronDown /> : <ChevronRight />}
                    </button>
                  ) : null}
                  <textarea
                    rows={1}
                    value={block.text}
                    onChange={(event) => {
                      const becomesToggle = event.target.value === "/toggle";
                      patchPageBlock(activeCategory.id, block.id, {
                        text: becomesToggle ? "" : event.target.value,
                        type: becomesToggle ? "toggle" : block.type,
                        open: becomesToggle ? true : block.open,
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && !block.text) {
                        event.preventDefault();
                        removePageBlock(activeCategory.id, block.id);
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addPageBlock(activeCategory.id, block.id);
                      }
                      if (event.key === "Tab") {
                        event.preventDefault();
                        patchPageBlock(activeCategory.id, block.id, {
                          depth: Math.max(
                            0,
                            block.depth + (event.shiftKey ? -1 : 1),
                          ),
                        });
                      }
                    }}
                    placeholder="写点什么，Enter 新建区块，Tab 缩进…"
                  />
                </div>
              ))}
              {!(activeCategory.blocks || []).length ? (
                <button
                  className="add-first-block"
                  type="button"
                  onClick={() => addPageBlock(activeCategory.id)}
                >
                  写点什么…
                </button>
              ) : null}
            </div>
            <section className="subpages">
              <header>
                <span>子页面</span>
                <button
                  type="button"
                  onClick={() => addCategory(activeCategory.id)}
                >
                  <Plus />
                  新建子页面
                </button>
              </header>
              {custom
                .filter((node) => node.parentId === activeCategory.id)
                .map((child) => (
                  <button
                    className="subpage-link"
                    type="button"
                    key={child.id}
                    onClick={() => setSelectedCategory(child.id)}
                  >
                    <FileText />
                    <span>{child.label}</span>
                    <ChevronRight />
                  </button>
                ))}
            </section>
          </div>
        ) : null}
        {view === "board" ? (
          <Board
            items={filtered}
            sources={sources}
            categories={custom}
            onOpen={(id) => {
              setSelectedId(id);
              setRightOpen(true);
            }}
          />
        ) : (
          <div
            className={`material-list ${activeCategory && view === "all" ? "inside-page" : ""}`}
          >
            <div className="list-label">
              <span>内容</span>
              <span>{filtered.length} 条</span>
            </div>
            {filtered.length ? (
              filtered.map((item) => {
                const source = sources.find(
                  (candidate) => candidate.id === item.sourceId,
                );
                return (
                  <article
                    className={`material-row ${selectedId === item.id ? "selected" : ""}`}
                    key={item.id}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/signal-item", item.id)
                    }
                    onClick={() => {
                      setSelectedId(item.id);
                      setRightOpen(true);
                    }}
                  >
                    <GripVertical className="drag-handle" />
                    <div className="material-thumb">
                      {source?.imageData ? (
                        <img src={source.imageData} alt="" />
                      ) : (
                        <FileText />
                      )}
                    </div>
                    <div className="material-copy">
                      <strong>{item.title}</strong>
                      <p>{item.content || "暂无整理内容"}</p>
                      <small>
                        {item.customCategory
                          ? categoryPath(item.customCategory)
                              .map((part) => part.label)
                              .join(" / ")
                          : "待分类"}{" "}
                        · {source?.title || "手动记录"}
                      </small>
                    </div>
                    {item.favorite ? <Star className="row-mark" /> : null}
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <BookOpen />
                <strong>这里还没有内容</strong>
                <p>上传截图或粘贴备忘录，Signal 会整理后放到合适的分类。</p>
                <button type="button" onClick={() => setImportOpen(true)}>
                  添加第一条内容
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      <aside className={`wk-detail ${rightOpen && selected ? "open" : ""}`}>
        {selected ? (
          <>
            <header>
              <button
                type="button"
                onClick={() => setRightOpen(false)}
                aria-label="关闭详情"
              >
                <X />
              </button>
              <div>
                <button
                  className={selected.favorite ? "active" : ""}
                  type="button"
                  onClick={() =>
                    patchItem(selected.id, { favorite: !selected.favorite })
                  }
                  aria-label="收藏"
                >
                  <Star />
                </button>
                <button
                  className={selected.pinned ? "active" : ""}
                  type="button"
                  onClick={() =>
                    patchItem(selected.id, { pinned: !selected.pinned })
                  }
                  aria-label="置顶"
                >
                  <Pin />
                </button>
                {selected.trashed ? (
                  <button
                    className="danger"
                    type="button"
                    onClick={() => {
                      setItems((current) =>
                        current.filter((item) => item.id !== selected.id),
                      );
                      setSelectedId("");
                      setRightOpen(false);
                    }}
                    aria-label="彻底删除"
                  >
                    <Trash2 />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      patchItem(selected.id, { trashed: true });
                      setRightOpen(false);
                    }}
                    aria-label="移入回收站"
                  >
                    <Trash2 />
                  </button>
                )}
              </div>
            </header>
            <div className="wk-scroll">
              {selectedSource?.imageData ? (
                <div className="source-preview">
                  <img
                    src={selectedSource.imageData}
                    alt={selectedSource.title}
                  />
                </div>
              ) : null}
              <textarea
                className="wk-title"
                value={selected.title}
                onChange={(event) =>
                  patchItem(selected.id, { title: event.target.value })
                }
                aria-label="标题"
              />
              <label className="detail-property">
                <span>分类</span>
                <select
                  value={selected.customCategory || ""}
                  onChange={(event) =>
                    patchItem(selected.id, {
                      customCategory: event.target.value || undefined,
                      unclassified: !event.target.value,
                    })
                  }
                >
                  <option value="">待分类</option>
                  {custom.map((node) => (
                    <option key={node.id} value={node.id}>
                      {categoryPath(node.id)
                        .map((part) => part.label)
                        .join(" / ")}
                    </option>
                  ))}
                </select>
              </label>
              <section className="detail-section">
                <header>整理后的内容</header>
                <textarea
                  className="content-editor"
                  value={selected.content}
                  onChange={(event) =>
                    patchItem(selected.id, { content: event.target.value })
                  }
                  placeholder="整理后的完整内容"
                />
              </section>
              <section className="detail-section">
                <header>我的备注</header>
                <textarea
                  className="note-editor"
                  value={selected.note || ""}
                  onChange={(event) =>
                    patchItem(selected.id, { note: event.target.value })
                  }
                  placeholder="像备忘录一样直接记录，自动保存…"
                />
              </section>
              <section className="source">
                <header>
                  <span>数据来源</span>
                  {selectedSource ? (
                    <input
                      className="source-title-input"
                      value={selectedSource.title}
                      onChange={(event) =>
                        patchSource(selectedSource.id, {
                          title: event.target.value,
                        })
                      }
                      aria-label="来源名称"
                    />
                  ) : (
                    <strong>未知来源</strong>
                  )}
                </header>
                <p>
                  {selectedSource?.type === "image"
                    ? "截图识别原文"
                    : "原始备忘录"}{" "}
                  ·{" "}
                  {selectedSource?.createdAt
                    ? new Date(selectedSource.createdAt).toLocaleString("zh-CN")
                    : ""}
                </p>
                <textarea
                  value={selectedSource?.rawText || selected.sourceQuote}
                  onChange={(event) =>
                    selectedSource &&
                    patchSource(selectedSource.id, {
                      rawText: event.target.value,
                    })
                  }
                  aria-label="识别原文"
                />
              </section>
              {selected.trashed ? (
                <button
                  className="restore-button"
                  type="button"
                  onClick={() => patchItem(selected.id, { trashed: false })}
                >
                  恢复这条内容
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
      {importOpen ? (
        <div
          className="import-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeImporter()
          }
        >
          <section
            className="import-panel"
            role="dialog"
            aria-modal="true"
            aria-label="添加内容"
          >
            <header>
              <div>
                <small>ADD TO SIGNAL</small>
                <h2>添加内容</h2>
              </div>
              <button
                type="button"
                onClick={closeImporter}
                disabled={processing}
                aria-label="关闭"
              >
                <X />
              </button>
            </header>
            <div className="import-tabs">
              <button
                className={importMode === "note" ? "active" : ""}
                type="button"
                onClick={() => {
                  setImportMode("note");
                  setImportBatches([]);
                }}
              >
                <NotebookPen />
                粘贴备忘录
              </button>
              <button
                className={importMode === "image" ? "active" : ""}
                type="button"
                onClick={() => {
                  setImportMode("image");
                  setImportBatches([]);
                }}
              >
                <ImageIcon />
                上传截图
              </button>
            </div>
            {!importBatches.length ? (
              importMode === "note" ? (
                <div className="note-import">
                  <input
                    value={importTitle}
                    onChange={(event) => setImportTitle(event.target.value)}
                    placeholder="标题（可以不填）"
                  />
                  <textarea
                    autoFocus
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder="把备忘录、收藏文字或其他材料粘贴到这里。Signal 只做轻度整理和分类，不写额外的长篇分析。"
                  />
                  <button
                    className="organize-button"
                    type="button"
                    onClick={organizeNote}
                    disabled={processing}
                  >
                    {processing ? (
                      <LoaderCircle className="spinning" />
                    ) : (
                      <Check />
                    )}
                    {processing ? "正在整理" : "整理并分类"}
                  </button>
                </div>
              ) : (
                <div
                  className="image-drop"
                  onClick={() => !processing && fileInput.current?.click()}
                >
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
                    multiple
                    onChange={uploadImages}
                  />
                  {processing ? (
                    <LoaderCircle className="spinning" />
                  ) : (
                    <Upload />
                  )}
                  <strong>
                    {processing ? "正在识别截图" : "选择一张或多张截图"}
                  </strong>
                  <p>支持 PNG、JPG、WebP 和 HEIC；识别后再确认分类。</p>
                </div>
              )
            ) : (
              <div className="review-list">
                <div className="review-hint">
                  <Check />
                  已整理为{" "}
                  {importBatches.reduce(
                    (sum, batch) => sum + batch.drafts.length,
                    0,
                  )}{" "}
                  条完整内容。请确认标题、正文和分类。
                </div>
                {importBatches.map((batch, batchIndex) => (
                  <section className="review-source" key={batch.source.id}>
                    <header>
                      {batch.source.imageData ? (
                        <img src={batch.source.imageData} alt="" />
                      ) : (
                        <FileText />
                      )}
                      <div>
                        <strong>{batch.source.title}</strong>
                        <small>原始来源已保留</small>
                      </div>
                    </header>
                    {batch.drafts.map((draft, draftIndex) => (
                      <article key={`${batch.source.id}-${draftIndex}`}>
                        <input
                          value={draft.title}
                          onChange={(event) =>
                            updateDraft(batchIndex, draftIndex, {
                              title: event.target.value,
                            })
                          }
                          aria-label="整理后的标题"
                        />
                        <textarea
                          value={draft.content}
                          onChange={(event) =>
                            updateDraft(batchIndex, draftIndex, {
                              content: event.target.value,
                            })
                          }
                          aria-label="整理后的正文"
                        />
                        <label>
                          <span>保存到</span>
                          <select
                            value={draft.categoryId}
                            onChange={(event) =>
                              updateDraft(batchIndex, draftIndex, {
                                categoryId: event.target.value,
                              })
                            }
                          >
                            <option value="">待分类</option>
                            {custom.map((node) => (
                              <option key={node.id} value={node.id}>
                                {node.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
            {progress ? <p className="import-progress">{progress}</p> : null}
            {importError ? <p className="import-error">{importError}</p> : null}
            {importBatches.length ? (
              <footer>
                <button type="button" onClick={() => setImportBatches([])}>
                  重新导入
                </button>
                <button
                  className="save-import"
                  type="button"
                  onClick={saveImports}
                >
                  确认保存
                </button>
              </footer>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Board({
  items,
  sources,
  categories,
  onOpen,
}: {
  items: Item[];
  sources: Source[];
  categories: CustomCategory[];
  onOpen: (id: string) => void;
}) {
  const columns = categories.filter((node) => node.parentId === "root");
  const descendantsOf = (id: string): string[] => {
    const children = categories
      .filter((node) => node.parentId === id)
      .map((node) => node.id);
    return children.flatMap((child) => [child, ...descendantsOf(child)]);
  };
  return (
    <div className="board-view">
      {columns.map((column) => {
        const ids = new Set([column.id, ...descendantsOf(column.id)]);
        const columnItems = items.filter(
          (item) => item.customCategory && ids.has(item.customCategory),
        );
        return (
          <section key={column.id}>
            <header>
              <strong>{column.label}</strong>
              <span>{columnItems.length}</span>
            </header>
            {columnItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item.id)}
              >
                <strong>{item.title}</strong>
                <small>
                  {sources.find((source) => source.id === item.sourceId)?.title}
                </small>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

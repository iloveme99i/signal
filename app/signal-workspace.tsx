"use client";

import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  Folder,
  GraduationCap,
  GripVertical,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  MoveRight,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wrench,
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
import { createWorker } from "tesseract.js";

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
  categoryRefs?: string[];
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
  emoji?: string;
  icon?: CategoryIcon;
  color?: string;
  favorite?: boolean;
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
  | "recent"
  | "favorites"
  | "pinned"
  | "board"
  | "notes"
  | "trash";
type QuickNavId =
  "inbox" | "recent" | "favorites" | "pinned" | "board" | "notes";
type CategoryIcon =
  "file" | "folder" | "briefcase" | "learning" | "tools" | "idea" | "sparkles";
type LibraryMode = "overview" | "list" | "board";
type SortMode = "manual" | "recent" | "title";
type CategoryDrop = {
  targetId: string;
  position: "before" | "inside" | "after";
};
type UndoState = {
  items: Item[];
  categories: CustomCategory[];
  message: string;
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const hostedAnalyzeEndpoint =
  "https://signal-inbox.oliverruby788.chatgpt.site/api/analyze";
const defaultQuickNav: QuickNavId[] = [
  "inbox",
  "recent",
  "favorites",
  "pinned",
  "board",
  "notes",
];
const categoryColors = [
  "#6b7280",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#d97706",
  "#059669",
  "#0891b2",
];
const categoryEmojis = [
  "💼",
  "🎓",
  "🧰",
  "💡",
  "📚",
  "🧠",
  "🗂️",
  "📌",
  "🌱",
  "🚀",
  "✨",
  "📝",
];
const sampleCategories: CustomCategory[] = [
  {
    id: "career",
    label: "求职",
    parentId: "root",
    emoji: "💼",
    color: "#2563eb",
    blocks: [
      {
        id: "b-career",
        text: "收纳岗位、面试和简历相关内容。",
        depth: 0,
        type: "text",
      },
    ],
  },
  {
    id: "career-jobs",
    label: "岗位收藏",
    parentId: "career",
    emoji: "📌",
    color: "#2563eb",
    blocks: [],
  },
  {
    id: "career-product",
    label: "产品实习",
    parentId: "career-jobs",
    emoji: "🧑‍💻",
    color: "#2563eb",
    blocks: [],
  },
  {
    id: "career-interview",
    label: "面试与简历",
    parentId: "career",
    emoji: "📝",
    color: "#2563eb",
    blocks: [],
  },
  {
    id: "learning",
    label: "学习",
    parentId: "root",
    emoji: "🎓",
    color: "#7c3aed",
    blocks: [
      {
        id: "b-learning",
        text: "保存值得反复查找的方法、知识和案例。",
        depth: 0,
        type: "text",
      },
    ],
  },
  {
    id: "learning-ai",
    label: "AI 与开发",
    parentId: "learning",
    emoji: "🧠",
    color: "#7c3aed",
    blocks: [],
  },
  {
    id: "learning-product",
    label: "产品方法",
    parentId: "learning",
    emoji: "📚",
    color: "#7c3aed",
    blocks: [],
  },
  {
    id: "resources",
    label: "工具与资源",
    parentId: "root",
    emoji: "🧰",
    color: "#059669",
    blocks: [],
  },
  {
    id: "resources-software",
    label: "软件与网站",
    parentId: "resources",
    emoji: "🛠️",
    color: "#059669",
    blocks: [],
  },
  {
    id: "resources-template",
    label: "教程与模板",
    parentId: "resources",
    emoji: "🗂️",
    color: "#059669",
    blocks: [],
  },
  {
    id: "ideas",
    label: "灵感与记录",
    parentId: "root",
    emoji: "💡",
    color: "#d97706",
    blocks: [],
  },
  {
    id: "ideas-project",
    label: "项目想法",
    parentId: "ideas",
    emoji: "🚀",
    color: "#d97706",
    blocks: [],
  },
  {
    id: "ideas-later",
    label: "稍后处理",
    parentId: "ideas",
    emoji: "🌱",
    color: "#d97706",
    blocks: [],
  },
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

function cleanScreenshotText(input: string) {
  const lines = input
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[|丨¦]{2,}/g, " ").trim())
    .filter(Boolean);
  const isMetadata = (line: string) =>
    /^(?:ip\s*属地|发布于|编辑于|来自|刚刚|昨天|今天|\d+\s*(?:秒|分钟|小时|天)前|\d{1,4}[年./-]\d{1,2}(?:[月./-]\d{1,2}日?)?)/i.test(
      line,
    );
  const isInterfaceText = (line: string) =>
    /^(?:点赞|赞|收藏|已收藏|评论|转发|分享|回复|关注|已关注|私信|举报|更多|展开|收起|查看原文|查看全部|写评论|说点什么|码住|蹲|mark|copy|复制链接|不感兴趣)(?:\s*[·:：]?\s*\d+(?:\.\d+)?[万wk]?)?$/i.test(
      line,
    ) ||
    /^(?:点赞|赞|收藏|评论|转发|分享)\s*\d+(?:\.\d+)?[万wk]?(?:\s+(?:点赞|赞|收藏|评论|转发|分享)\s*\d+(?:\.\d+)?[万wk]?)*$/i.test(
      line,
    ) ||
    /^(?:共\s*)?\d+\s*条(?:评论|回复)$/.test(line);

  return lines
    .filter((line, index) => {
      if (!/[\p{L}\p{N}]/u.test(line)) return false;
      if (/^@[\p{L}\p{N}_.-]{1,40}$/u.test(line)) return false;
      if (/^(?:小红书号|抖音号|微信号|用户\s*id|uid)\s*[:：]/i.test(line))
        return false;
      if (/^\d{1,2}:\d{2}.*(?:4g|5g|lte|wi-?fi|\d+%)/i.test(line))
        return false;
      if (isMetadata(line) || isInterfaceText(line)) return false;
      const nextLine = lines[index + 1] || "";
      const looksLikeShortNickname =
        line.length <= 24 &&
        !/[。！？!?；;，,：:]$/.test(line) &&
        isMetadata(nextLine);
      return !looksLikeShortNickname;
    })
    .map((line) => line.replace(/^[•·▪︎■□◆◇▶▷►›>—–-]+\s*/, ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function normalizeImage(file: File): Promise<File> {
  return file;
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

function CategoryGlyph({ category }: { category: CustomCategory }) {
  if (category.emoji)
    return <span className="category-emoji">{category.emoji}</span>;
  const icons = {
    file: FileText,
    folder: Folder,
    briefcase: BriefcaseBusiness,
    learning: GraduationCap,
    tools: Wrench,
    idea: Lightbulb,
    sparkles: Sparkles,
  } satisfies Record<CategoryIcon, typeof FileText>;
  const Icon = icons[category.icon || "file"];
  return (
    <span
      className="category-icon"
      style={{ color: category.color || categoryColors[0] }}
    >
      <Icon />
    </span>
  );
}

export default function SignalWorkspace() {
  const hostedAI =
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".github.io");
  const [items, setItems] = useState<Item[]>(sampleItems),
    [sources, setSources] = useState<Source[]>(sampleSources),
    [custom, setCustom] = useState<CustomCategory[]>(sampleCategories);
  const [hydrated, setHydrated] = useState(false),
    [view, setView] = useState<View>("all"),
    [selectedCategory, setSelectedCategory] = useState("all"),
    [selectedId, setSelectedId] = useState(""),
    [selectedCategoryDetailId, setSelectedCategoryDetailId] = useState(""),
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false),
    [hasDeepSeekKey, setHasDeepSeekKey] = useState(false),
    [deepSeekKeyInput, setDeepSeekKeyInput] = useState(""),
    [changingDeepSeekKey, setChangingDeepSeekKey] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(""),
    [categoryName, setCategoryName] = useState(""),
    [newCategoryFocusId, setNewCategoryFocusId] = useState("");
  const [quickNav, setQuickNav] = useState<QuickNavId[]>(defaultQuickNav),
    [hiddenNav, setHiddenNav] = useState<QuickNavId[]>([]),
    [recentCategories, setRecentCategories] = useState<string[]>([]),
    [quickSettingsOpen, setQuickSettingsOpen] = useState(false),
    [libraryMode, setLibraryMode] = useState<LibraryMode>("overview"),
    [sortMode, setSortMode] = useState<SortMode>("manual");
  const [categoryMenu, setCategoryMenu] = useState<{
      id: string;
      x: number;
      y: number;
    } | null>(null),
    [categoryDrop, setCategoryDrop] = useState<CategoryDrop | null>(null),
    [undoState, setUndoState] = useState<UndoState | null>(null),
    [toast, setToast] = useState(""),
    [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      const savedCategories = JSON.parse(
        localStorage.getItem("signal-categories") || "[]",
      );
      setCustom(
        savedCategories.map((category: CustomCategory, index: number) => {
          const sample = sampleCategories.find(
            (item) => item.id === category.id,
          );
          return {
            ...category,
            emoji: category.emoji ?? sample?.emoji,
            icon: category.icon ?? sample?.icon,
            color:
              category.color ??
              sample?.color ??
              categoryColors[index % categoryColors.length],
          };
        }),
      );
      const savedQuickNav = JSON.parse(
        localStorage.getItem("signal-quick-nav") || "null",
      );
      if (Array.isArray(savedQuickNav)) setQuickNav(savedQuickNav);
      const savedHiddenNav = JSON.parse(
        localStorage.getItem("signal-hidden-nav") || "[]",
      );
      if (Array.isArray(savedHiddenNav)) setHiddenNav(savedHiddenNav);
      const savedRecentCategories = JSON.parse(
        localStorage.getItem("signal-recent-categories") || "[]",
      );
      if (Array.isArray(savedRecentCategories))
        setRecentCategories(savedRecentCategories);
      setLibraryMode(
        (localStorage.getItem("signal-library-mode") as LibraryMode) ||
          "overview",
      );
      setSortMode(
        (localStorage.getItem("signal-sort-mode") as SortMode) || "manual",
      );
      setHasDeepSeekKey(
        window.location.hostname.endsWith(".github.io") ||
          Boolean(localStorage.getItem("signal-deepseek-key")?.trim()),
      );
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
    if (!hydrated) return;
    localStorage.setItem("signal-quick-nav", JSON.stringify(quickNav));
    localStorage.setItem("signal-hidden-nav", JSON.stringify(hiddenNav));
    localStorage.setItem(
      "signal-recent-categories",
      JSON.stringify(recentCategories),
    );
    localStorage.setItem("signal-library-mode", libraryMode);
    localStorage.setItem("signal-sort-mode", sortMode);
  }, [quickNav, hiddenNav, recentCategories, libraryMode, sortMode, hydrated]);
  useEffect(() => {
    if (selectedCategory === "all") return;
    setRecentCategories((current) =>
      [
        selectedCategory,
        ...current.filter((id) => id !== selectedCategory),
      ].slice(0, 3),
    );
  }, [selectedCategory]);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [view, selectedCategory]);
  useEffect(() => {
    if (!categoryMenu) return;
    const close = () => setCategoryMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [categoryMenu]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!newCategoryFocusId) return;
    const frame = requestAnimationFrame(() => {
      const input = document.querySelector<HTMLTextAreaElement>(
        ".category-detail-title",
      );
      input?.focus();
      input?.select();
      setNewCategoryFocusId("");
    });
    return () => cancelAnimationFrame(frame);
  }, [newCategoryFocusId]);

  const selected = items.find((item) => item.id === selectedId),
    selectedSource = sources.find((source) => source.id === selected?.sourceId),
    activeCategory = custom.find((node) => node.id === selectedCategory),
    selectedCategoryDetail = custom.find(
      (node) => node.id === selectedCategoryDetailId,
    ),
    menuCategory = custom.find((node) => node.id === categoryMenu?.id);
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
      Boolean(item.customCategory && ids.has(item.customCategory)) ||
      Boolean(item.categoryRefs?.some((categoryId) => ids.has(categoryId)))
    );
  };
  const filtered = useMemo(() => {
    const result = items.filter((item) => {
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
      const searchablePath = item.customCategory
        ? categoryPath(item.customCategory)
            .map((part) => part.label)
            .join(" ")
        : "待分类";
      return `${item.title}${item.content}${item.note || ""}${searchablePath}`
        .toLowerCase()
        .includes(query.toLowerCase());
    });
    if (sortMode === "recent" || view === "recent")
      return [...result].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
    if (sortMode === "title")
      return [...result].sort((a, b) =>
        a.title.localeCompare(b.title, "zh-CN"),
      );
    return result;
  }, [items, sources, view, selectedCategory, query, custom, sortMode]);
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
  const saveDeepSeekKey = () => {
    const key = deepSeekKeyInput.trim();
    if (!key) {
      setImportError("请输入 DeepSeek API Key。");
      return;
    }
    localStorage.setItem("signal-deepseek-key", key);
    setDeepSeekKeyInput("");
    setHasDeepSeekKey(true);
    setChangingDeepSeekKey(false);
    setImportError("");
    setToast("DeepSeek 已连接到当前浏览器");
  };

  const organizeLocally = (title: string, content: string): Draft[] => {
    const material = `${title}\n${content}`.toLowerCase();
    const keywordGroups: Array<[RegExp, string[]]> = [
      [/实习|岗位|招聘|求职|面试|简历|投递|boss|牛客/i, ["求职", "岗位", "面试", "简历"]],
      [/学习|课程|教程|知识|方法|论文|读书|ai|开发/i, ["学习", "教程", "知识", "AI", "开发"]],
      [/工具|软件|网站|资源|链接|模板|插件/i, ["工具", "资源", "软件", "网站", "模板"]],
      [/灵感|想法|创意|项目|记录|备忘/i, ["灵感", "想法", "项目", "记录"]],
    ];
    const scored = custom.map((node) => {
      const path = categoryPath(node.id);
      let score = material.includes(node.label.toLowerCase()) ? 20 : 0;
      for (const [pattern, labels] of keywordGroups) {
        if (
          pattern.test(material) &&
          labels.some((label) =>
            path.some((part) => part.label.toLowerCase().includes(label.toLowerCase())),
          )
        )
          score += 8;
      }
      score += path
        .flatMap((part) => part.blocks || [])
        .filter((block) =>
          block.text
            .split(/[，。；、\s]/)
            .filter((word) => word.length >= 2)
            .some((word) => material.includes(word.toLowerCase())),
        ).length;
      if (score > 0) score += path.length * 0.1;
      return { id: node.id, score };
    });
    const best = scored.sort((a, b) => b.score - a.score)[0];
    const firstLine = content
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean);
    return [
      {
        title: title.trim() || firstLine?.slice(0, 42) || "未命名内容",
        content: content.trim(),
        categoryId: best?.score > 0 ? best.id : "",
        sourceQuote: content.trim(),
      },
    ];
  };

  const analyzeText = async (
    title: string,
    content: string,
  ): Promise<Draft[]> => {
    const apiKey = localStorage.getItem("signal-deepseek-key") || "";
    if (!apiKey && !hostedAI)
      throw new Error("DeepSeek Key 不在当前浏览器中，请重新连接后再试。");
    const categories = custom.map((node) => ({
      id: node.id,
      label: categoryPath(node.id)
        .map((part) => part.label)
        .join(" / "),
    }));
    let response: Response;
    try {
      response = await fetch(hostedAI ? hostedAnalyzeEndpoint : "/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(hostedAI ? {} : { apiKey }),
          title,
          content,
          categories,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        hostedAI &&
        /load failed|failed to fetch|network|internet|offline/i.test(message)
      ) {
        setToast("AI 服务当前不可达，已使用本地整理并保留原文");
        return organizeLocally(title, content);
      }
      throw error;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        payload.error?.message || payload.error || "DeepSeek 整理失败",
      );
    const analyzed = payload;
    const drafts = Array.isArray(analyzed.items) ? analyzed.items : [];
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
    if (!hasDeepSeekKey && !hostedAI) {
      setImportError("请先在下方连接 DeepSeek，再整理内容。");
      return;
    }
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
    if (!hasDeepSeekKey && !hostedAI) {
      setImportError("请先连接 DeepSeek，再选择截图。");
      return;
    }
    setProcessing(true);
    setImportError("");
    setImportBatches([]);
    const batches: ImportBatch[] = [];
    try {
      const ocrBase = window.location.hostname.endsWith(".github.io")
        ? "/signal/ocr"
        : "/ocr";
      let currentIndex = 0;
      setProgress("正在从 Signal 载入手机识别组件…");
      const worker = await createWorker("chi_sim+eng", undefined, {
        workerPath: `${ocrBase}/worker.min.js`,
        corePath: `${ocrBase}/core`,
        langPath: `${ocrBase}/lang`,
        workerBlobURL: false,
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
          const rawText = cleanScreenshotText(ocr.data.text);
          const source: Source = {
            id: uid(),
            type: "image",
            title: original.name,
            rawText,
            imageData: normalized.dataUrl,
            createdAt: new Date().toISOString(),
          };
          setProgress(
            `正在过滤网名、图标和互动信息，并整理第 ${index + 1} / ${files.length} 张…`,
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
      const message = error instanceof Error ? error.message : "";
      setImportError(
        /module script|importing|worker|network|fetch/i.test(message)
          ? "手机识别组件加载失败。请刷新页面后重试；Signal 已不再依赖外部 OCR 网站。"
          : message || "图片识别失败，请确认图片格式后重试。",
      );
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
    setSelectedCategoryDetailId("");
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
        icon: "file",
        color: categoryColors[custom.length % categoryColors.length],
        blocks: [{ id: uid(), text: "", depth: 0, type: "text" }],
      },
    ]);
    setCollapsed((current) => ({ ...current, [parentId]: false }));
    setEditingCategoryId("");
    setNewCategoryFocusId(id);
    setSelectedId("");
    setSelectedCategoryDetailId(id);
    setSelectedCategory(parentId === "root" ? id : parentId);
    setView("all");
    setRightOpen(true);
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
  const remember = (message: string) => {
    setUndoState({ items, categories: custom, message });
    setToast(message);
  };
  const undoLastAction = () => {
    if (!undoState) return;
    setItems(undoState.items);
    setCustom(undoState.categories);
    setToast("已撤销");
    setUndoState(null);
  };
  const deleteCategory = (id: string) => {
    const node = custom.find((category) => category.id === id);
    if (!node) return;
    remember(`已删除“${node.label}”`);
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
    if (ids.has(selectedCategoryDetailId)) {
      setSelectedCategoryDetailId("");
      setRightOpen(false);
    }
    setCategoryMenu(null);
  };
  const duplicateCategory = (id: string) => {
    const root = custom.find((category) => category.id === id);
    if (!root) return;
    remember(`已复制“${root.label}”的分类结构`);
    const cloneBranch = (
      sourceId: string,
      parentId: string,
    ): CustomCategory[] => {
      const source = custom.find((category) => category.id === sourceId);
      if (!source) return [];
      const newId = uid();
      const clone: CustomCategory = {
        ...source,
        id: newId,
        parentId,
        label: sourceId === id ? `${source.label} 副本` : source.label,
        favorite: false,
        blocks: (source.blocks || []).map((block) => ({ ...block, id: uid() })),
      };
      return [
        clone,
        ...custom
          .filter((category) => category.parentId === sourceId)
          .flatMap((child) => cloneBranch(child.id, newId)),
      ];
    };
    setCustom((current) => [...current, ...cloneBranch(id, root.parentId)]);
    setCategoryMenu(null);
  };
  const moveCategory = (
    draggedId: string,
    targetId: string,
    position: CategoryDrop["position"],
  ) => {
    if (draggedId === targetId || descendants(draggedId).includes(targetId))
      return;
    const target = custom.find((category) => category.id === targetId);
    if (!target) return;
    remember("已调整分类位置");
    setCustom((current) => {
      const dragged = current.find((category) => category.id === draggedId);
      if (!dragged) return current;
      const remaining = current.filter((category) => category.id !== draggedId);
      const next = {
        ...dragged,
        parentId: position === "inside" ? targetId : target.parentId,
      };
      if (position === "inside") return [...remaining, next];
      const targetIndex = remaining.findIndex(
        (category) => category.id === targetId,
      );
      remaining.splice(targetIndex + (position === "after" ? 1 : 0), 0, next);
      return remaining;
    });
    if (position === "inside")
      setCollapsed((current) => ({ ...current, [targetId]: false }));
  };
  const dropIntoCategory = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const categoryId = event.dataTransfer.getData("text/signal-category");
    if (categoryId) {
      const position =
        categoryDrop?.targetId === targetId ? categoryDrop.position : "inside";
      moveCategory(categoryId, targetId, position);
      setCategoryDrop(null);
      return;
    }
    const itemId = event.dataTransfer.getData("text/signal-item");
    if (itemId && custom.some((node) => node.id === targetId)) {
      remember(event.altKey ? "已添加分类引用" : "已移动内容");
      const movingIds = selectedIds.includes(itemId) ? selectedIds : [itemId];
      setItems((current) =>
        current.map((item) => {
          if (!movingIds.includes(item.id)) return item;
          if (event.altKey) {
            const refs = new Set(item.categoryRefs || []);
            if (item.customCategory !== targetId) refs.add(targetId);
            return { ...item, categoryRefs: [...refs], unclassified: false };
          }
          return { ...item, customCategory: targetId, unclassified: false };
        }),
      );
      setSelectedIds([]);
    }
  };
  const reorderQuickNav = (draggedId: QuickNavId, targetId: QuickNavId) => {
    setQuickNav((current) => {
      const next = current.filter((id) => id !== draggedId);
      next.splice(next.indexOf(targetId), 0, draggedId);
      return next;
    });
  };
  const reorderItems = (draggedId: string, targetId: string) => {
    if (sortMode !== "manual") {
      setToast("切换到手动排序后才能拖动内容");
      return;
    }
    if (draggedId === targetId) return;
    remember("已调整内容顺序");
    setItems((current) => {
      const dragged = current.find((item) => item.id === draggedId);
      if (!dragged) return current;
      const next = current.filter((item) => item.id !== draggedId);
      next.splice(
        next.findIndex((item) => item.id === targetId),
        0,
        dragged,
      );
      return next;
    });
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
            className={`tree-row ${selectedCategory === node.id ? "active" : ""} ${categoryDrop?.targetId === node.id ? `drop-${categoryDrop.position}` : ""}`}
            style={{ paddingLeft: 8 + depth * 15 }}
            draggable={editingCategoryId !== node.id}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/signal-category", node.id);
            }}
            onDragEnd={() => setCategoryDrop(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setCategoryMenu({
                id: node.id,
                x: Math.max(
                  8,
                  Math.min(event.clientX, window.innerWidth - 286),
                ),
                y: Math.max(
                  8,
                  Math.min(event.clientY, window.innerHeight - 430),
                ),
              });
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!event.dataTransfer.types.includes("text/signal-category"))
                return;
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientY - rect.top) / rect.height;
              setCategoryDrop({
                targetId: node.id,
                position:
                  ratio < 0.28 ? "before" : ratio > 0.72 ? "after" : "inside",
              });
            }}
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
                  setSelectedCategoryDetailId("");
                }}
              >
                <CategoryGlyph category={node} />
                <span className="tree-label">{node.label || "未命名"}</span>
                <em>
                  {
                    items.filter(
                      (item) => !item.trashed && categoryMatches(item, node.id),
                    ).length
                  }
                </em>
              </button>
            )}
            <div className="tree-tools">
              <button
                type="button"
                onClick={() => addCategory(node.id)}
                aria-label={`在${node.label || "未命名"}下添加分类`}
              >
                <Plus />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setCategoryMenu({
                    id: node.id,
                    x: Math.max(
                      8,
                      Math.min(rect.right, window.innerWidth - 286),
                    ),
                    y: Math.max(
                      8,
                      Math.min(rect.bottom, window.innerHeight - 430),
                    ),
                  });
                }}
                aria-label={`${node.label || "未命名"}更多操作`}
              >
                <MoreHorizontal />
              </button>
            </div>
          </div>
          {hasChildren && !isCollapsed ? renderTree(node.id, depth + 1) : null}
        </div>
      );
    });
  };

  const viewTitle: Record<View, string> = {
    all:
      selectedCategory === "all"
        ? "信息库"
        : custom.find((node) => node.id === selectedCategory)?.label || "内容",
    inbox: "待分类",
    recent: "最近使用",
    favorites: "收藏",
    pinned: "置顶",
    board: "看板",
    notes: "备忘录",
    trash: "回收站",
  };
  const navItems: Record<
    QuickNavId,
    { label: string; icon: typeof BookOpen; count?: number }
  > = {
    inbox: {
      label: "待分类",
      icon: Inbox,
      count: items.filter((item) => !item.trashed && item.unclassified).length,
    },
    recent: { label: "最近使用", icon: Clock3 },
    favorites: {
      label: "收藏",
      icon: Star,
      count: items.filter((item) => !item.trashed && item.favorite).length,
    },
    pinned: {
      label: "置顶",
      icon: Pin,
      count: items.filter((item) => !item.trashed && item.pinned).length,
    },
    board: { label: "看板", icon: LayoutDashboard },
    notes: { label: "备忘录", icon: NotebookPen },
  };

  return (
    <main className="wk">
      <aside className={`wk-side ${mobileNavOpen ? "mobile-open" : ""}`}>
        <header
          role="button"
          tabIndex={0}
          onClick={() => {
            setView("all");
            setSelectedCategory("all");
            setLibraryMode("overview");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setView("all");
              setSelectedCategory("all");
              setLibraryMode("overview");
            }
          }}
        >
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
        <div className="quick-nav-heading">
          <span>快捷入口</span>
          <button
            type="button"
            onClick={() => setQuickSettingsOpen((open) => !open)}
            aria-label="编辑快捷入口"
          >
            <Settings2 />
          </button>
          {quickSettingsOpen ? (
            <div
              className="quick-settings"
              onClick={(event) => event.stopPropagation()}
            >
              <strong>显示快捷入口</strong>
              {defaultQuickNav.map((id) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={!hiddenNav.includes(id)}
                    onChange={() =>
                      setHiddenNav((current) =>
                        current.includes(id)
                          ? current.filter((item) => item !== id)
                          : [...current, id],
                      )
                    }
                  />
                  {navItems[id].label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
        <nav>
          {quickNav
            .filter((id) => !hiddenNav.includes(id))
            .map((id) => {
              const nav = navItems[id];
              return (
                <button
                  className={view === id ? "active" : ""}
                  key={id}
                  type="button"
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData("text/signal-nav", id)
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const dragged = event.dataTransfer.getData(
                      "text/signal-nav",
                    ) as QuickNavId;
                    if (dragged) reorderQuickNav(dragged, id);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setHiddenNav((current) =>
                      current.includes(id) ? current : [...current, id],
                    );
                  }}
                  onClick={() => {
                    setView(id as View);
                    setSelectedCategory("all");
                  }}
                >
                  <GripVertical className="nav-drag" />
                  <nav.icon />
                  <span>{nav.label}</span>
                  {typeof nav.count === "number" ? <em>{nav.count}</em> : null}
                </button>
              );
            })}
        </nav>
        {recentCategories.some((id) =>
          custom.some((node) => node.id === id),
        ) ? (
          <section className="favorite-categories recent-categories">
            <header>最近分类</header>
            {recentCategories.map((id) => {
              const node = custom.find((category) => category.id === id);
              return node ? (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    setView("all");
                    setSelectedCategory(node.id);
                  }}
                >
                  <CategoryGlyph category={node} />
                  <span>{node.label}</span>
                </button>
              ) : null;
            })}
          </section>
        ) : null}
        {custom.some((node) => node.favorite) ? (
          <section className="favorite-categories">
            <header>收藏分类</header>
            {custom
              .filter((node) => node.favorite)
              .map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    setView("all");
                    setSelectedCategory(node.id);
                  }}
                >
                  <CategoryGlyph category={node} />
                  <span>{node.label}</span>
                </button>
              ))}
          </section>
        ) : null}
        <section className="category-tree">
          <header>
            <span>我的分类</span>
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
      {mobileNavOpen ? (
        <button
          className="mobile-nav-backdrop"
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="关闭导航"
        />
      ) : null}
      <section className="wk-list">
        <header>
          <div className="list-heading">
            <button
              className="mobile-nav-trigger"
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="打开导航"
            >
              <Menu />
            </button>
            <div>
              <small>Signal / 信息库</small>
              <h1>{viewTitle[view]}</h1>
            </div>
          </div>
          <div className="list-actions">
            {view === "all" && selectedCategory === "all" ? (
              <div className="view-switch" aria-label="信息库视图">
                <button
                  className={libraryMode === "overview" ? "active" : ""}
                  type="button"
                  onClick={() => setLibraryMode("overview")}
                >
                  概览
                </button>
                <button
                  className={libraryMode === "list" ? "active" : ""}
                  type="button"
                  onClick={() => setLibraryMode("list")}
                >
                  列表
                </button>
                <button
                  className={libraryMode === "board" ? "active" : ""}
                  type="button"
                  onClick={() => setLibraryMode("board")}
                >
                  看板
                </button>
              </div>
            ) : null}
            {(libraryMode === "list" ||
              selectedCategory !== "all" ||
              view !== "all") &&
            view !== "board" ? (
              <select
                className="sort-select"
                value={sortMode}
                onChange={(event) =>
                  setSortMode(event.target.value as SortMode)
                }
                aria-label="内容排序"
              >
                <option value="manual">手动排序</option>
                <option value="recent">最近添加</option>
                <option value="title">标题排序</option>
              </select>
            ) : null}
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
          <section className="category-browser">
            <header className="category-browser-heading">
              <div>
                <button
                  className="category-browser-icon"
                  type="button"
                  style={{
                    background: `${activeCategory.color || categoryColors[0]}14`,
                  }}
                  onClick={() => {
                    setSelectedId("");
                    setSelectedCategoryDetailId(activeCategory.id);
                    setRightOpen(true);
                  }}
                  aria-label={`编辑${activeCategory.label}`}
                >
                  <CategoryGlyph category={activeCategory} />
                </button>
                <div>
                  <span className="category-browser-path">
                    {categoryPath(activeCategory.id)
                      .map((part) => part.label)
                      .join(" / ")}
                  </span>
                  <p>
                    {activeCategory.blocks?.find((block) => block.text)?.text ||
                      "点击右侧详情，为这个分类补充说明。"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => addCategory(activeCategory.id)}
              >
                <Plus />
                新建子分类
              </button>
            </header>
            {custom.some((node) => node.parentId === activeCategory.id) ? (
              <div className="category-child-list">
                <div className="category-section-label">
                  <span>子分类</span>
                  <span>
                    {
                      custom.filter(
                        (node) => node.parentId === activeCategory.id,
                      ).length
                    }
                  </span>
                </div>
                {custom
                  .filter((node) => node.parentId === activeCategory.id)
                  .map((child) => {
                    const childCount = items.filter(
                      (item) =>
                        !item.trashed && categoryMatches(item, child.id),
                    ).length;
                    return (
                      <button
                        className={`category-child-row ${selectedCategoryDetailId === child.id ? "selected" : ""}`}
                        type="button"
                        key={child.id}
                        onClick={() => {
                          setSelectedId("");
                          setSelectedCategoryDetailId(child.id);
                          setRightOpen(true);
                        }}
                      >
                        <span
                          className="category-child-icon"
                          style={{
                            background: `${child.color || categoryColors[0]}12`,
                          }}
                        >
                          <CategoryGlyph category={child} />
                        </span>
                        <span className="category-child-copy">
                          <strong>{child.label || "未命名"}</strong>
                          <small>
                            {child.blocks?.find((block) => block.text)?.text ||
                              "点击后在右侧写说明和内容"}
                          </small>
                        </span>
                        <span className="category-child-count">
                          {childCount} 条
                        </span>
                        <ChevronRight />
                      </button>
                    );
                  })}
              </div>
            ) : null}
          </section>
        ) : null}
        {view === "all" &&
        selectedCategory === "all" &&
        libraryMode === "overview" ? (
          <LibraryOverview
            items={items.filter((item) => !item.trashed)}
            sources={sources}
            categories={custom}
            onOpenCategory={(id) => setSelectedCategory(id)}
            onOpenItem={(id) => {
              setSelectedCategoryDetailId("");
              setSelectedId(id);
              setRightOpen(true);
            }}
            onOpenInbox={() => setView("inbox")}
          />
        ) : view === "board" ||
          (view === "all" &&
            selectedCategory === "all" &&
            libraryMode === "board") ? (
          <Board
            items={filtered}
            sources={sources}
            categories={custom}
            onOpen={(id) => {
              setSelectedCategoryDetailId("");
              setSelectedId(id);
              setRightOpen(true);
            }}
          />
        ) : (
          <div
            className={`material-list ${activeCategory && view === "all" ? "inside-page" : ""}`}
          >
            <div className="list-label">
              {selectedIds.length ? (
                <>
                  <span>已选择 {selectedIds.length} 条</span>
                  <div className="bulk-actions">
                    <select
                      defaultValue=""
                      aria-label="批量移动到分类"
                      onChange={(event) => {
                        const categoryId = event.target.value;
                        if (!categoryId) return;
                        remember(`已移动 ${selectedIds.length} 条内容`);
                        setItems((current) =>
                          current.map((entry) =>
                            selectedIds.includes(entry.id)
                              ? {
                                  ...entry,
                                  customCategory: categoryId,
                                  unclassified: false,
                                }
                              : entry,
                          ),
                        );
                        setSelectedIds([]);
                      }}
                    >
                      <option value="">移动到分类…</option>
                      {custom.map((node) => (
                        <option key={node.id} value={node.id}>
                          {categoryPath(node.id)
                            .map((part) => part.label)
                            .join(" / ")}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setSelectedIds([])}>
                      取消
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span>内容</span>
                  <span>{filtered.length} 条</span>
                </>
              )}
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
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copyMove";
                      event.dataTransfer.setData("text/signal-item", item.id);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedId =
                        event.dataTransfer.getData("text/signal-item");
                      if (draggedId) reorderItems(draggedId, item.id);
                    }}
                    onClick={() => {
                      setSelectedCategoryDetailId("");
                      setSelectedId(item.id);
                      setRightOpen(true);
                    }}
                  >
                    <div
                      className="row-leading"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() =>
                          setSelectedIds((current) =>
                            current.includes(item.id)
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          )
                        }
                        aria-label={`选择${item.title}`}
                      />
                      <GripVertical className="drag-handle" />
                    </div>
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
                        {item.categoryRefs?.length
                          ? ` +${item.categoryRefs.length} 个分类`
                          : ""}{" "}
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
      <aside
        className={`wk-detail ${rightOpen && (selected || selectedCategoryDetail) ? "open" : ""}`}
      >
        {selectedCategoryDetail ? (
          <>
            <header>
              <button
                type="button"
                onClick={() => setRightOpen(false)}
                aria-label="关闭分类详情"
              >
                <X />
              </button>
              <div>
                <button
                  className={selectedCategoryDetail.favorite ? "active" : ""}
                  type="button"
                  onClick={() =>
                    patchCategory(selectedCategoryDetail.id, {
                      favorite: !selectedCategoryDetail.favorite,
                    })
                  }
                  aria-label="收藏分类"
                >
                  <Star />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setCategoryMenu({
                      id: selectedCategoryDetail.id,
                      x: Math.max(8, rect.right - 280),
                      y: rect.bottom,
                    });
                  }}
                  aria-label="分类设置"
                >
                  <MoreHorizontal />
                </button>
              </div>
            </header>
            <div className="wk-scroll category-detail-scroll">
              <div className="category-detail-path">
                {categoryPath(selectedCategoryDetail.id)
                  .map((part) => part.label)
                  .join(" / ")}
              </div>
              <div className="category-detail-heading">
                <button
                  type="button"
                  style={{
                    background: `${selectedCategoryDetail.color || categoryColors[0]}14`,
                  }}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setCategoryMenu({
                      id: selectedCategoryDetail.id,
                      x: rect.left,
                      y: rect.bottom,
                    });
                  }}
                  aria-label="修改分类图标和颜色"
                >
                  <CategoryGlyph category={selectedCategoryDetail} />
                </button>
                <textarea
                  className="category-detail-title"
                  rows={1}
                  value={selectedCategoryDetail.label}
                  onChange={(event) =>
                    patchCategory(selectedCategoryDetail.id, {
                      label: event.target.value,
                    })
                  }
                  placeholder="未命名分类"
                  aria-label="分类名称"
                />
              </div>
              <div className="category-detail-meta">
                <span>
                  {
                    items.filter(
                      (item) =>
                        !item.trashed &&
                        categoryMatches(item, selectedCategoryDetail.id),
                    ).length
                  }{" "}
                  条内容
                </span>
                <span>
                  {
                    custom.filter(
                      (node) => node.parentId === selectedCategoryDetail.id,
                    ).length
                  }{" "}
                  个子分类
                </span>
              </div>
              <section className="category-detail-editor">
                <header>分类说明</header>
                <div className="page-blocks">
                  {(selectedCategoryDetail.blocks || []).map((block) => (
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
                            patchPageBlock(
                              selectedCategoryDetail.id,
                              block.id,
                              { open: !block.open },
                            )
                          }
                        >
                          {block.open ? <ChevronDown /> : <ChevronRight />}
                        </button>
                      ) : null}
                      <textarea
                        rows={1}
                        value={block.text}
                        onChange={(event) => {
                          const becomesToggle =
                            event.target.value === "/toggle";
                          patchPageBlock(selectedCategoryDetail.id, block.id, {
                            text: becomesToggle ? "" : event.target.value,
                            type: becomesToggle ? "toggle" : block.type,
                            open: becomesToggle ? true : block.open,
                          });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Backspace" && !block.text) {
                            event.preventDefault();
                            removePageBlock(
                              selectedCategoryDetail.id,
                              block.id,
                            );
                          }
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addPageBlock(selectedCategoryDetail.id, block.id);
                          }
                          if (event.key === "Tab") {
                            event.preventDefault();
                            patchPageBlock(
                              selectedCategoryDetail.id,
                              block.id,
                              {
                                depth: Math.max(
                                  0,
                                  block.depth + (event.shiftKey ? -1 : 1),
                                ),
                              },
                            );
                          }
                        }}
                        placeholder="直接写内容，Enter 新建一行，Tab 缩进…"
                      />
                    </div>
                  ))}
                  {!(selectedCategoryDetail.blocks || []).length ? (
                    <button
                      className="add-first-block"
                      type="button"
                      onClick={() => addPageBlock(selectedCategoryDetail.id)}
                    >
                      写下这个分类要收纳什么…
                    </button>
                  ) : null}
                </div>
              </section>
              <button
                className="open-category-button"
                type="button"
                onClick={() => {
                  setSelectedCategory(selectedCategoryDetail.id);
                  setView("all");
                  setRightOpen(false);
                }}
              >
                查看这个分类中的全部内容
                <ChevronRight />
              </button>
            </div>
          </>
        ) : selected ? (
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
                  type="button"
                  onClick={() => {
                    remember(`已复制“${selected.title}”`);
                    const duplicate = {
                      ...selected,
                      id: uid(),
                      title: `${selected.title} 副本`,
                      createdAt: new Date().toISOString(),
                    };
                    setItems((current) => [duplicate, ...current]);
                    setSelectedId(duplicate.id);
                  }}
                  aria-label="复制内容"
                >
                  <Copy />
                </button>
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
              {selected.categoryRefs?.length ? (
                <div className="category-reference-list">
                  <span>同时归入</span>
                  <div>
                    {selected.categoryRefs.map((categoryId) => {
                      const category = custom.find(
                        (node) => node.id === categoryId,
                      );
                      return category ? (
                        <button
                          type="button"
                          key={categoryId}
                          onClick={() =>
                            patchItem(selected.id, {
                              categoryRefs: selected.categoryRefs?.filter(
                                (id) => id !== categoryId,
                              ),
                            })
                          }
                          title="点击移除关联分类"
                        >
                          <CategoryGlyph category={category} />
                          {category.label}
                          <X />
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : null}
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
      {categoryMenu && menuCategory ? (
        <section
          className="category-menu"
          style={{ left: categoryMenu.x, top: categoryMenu.y }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label={`${menuCategory.label}分类设置`}
        >
          <header>
            <CategoryGlyph category={menuCategory} />
            <strong>{menuCategory.label || "未命名"}</strong>
            <button
              type="button"
              onClick={() => setCategoryMenu(null)}
              aria-label="关闭"
            >
              <X />
            </button>
          </header>
          <label className="menu-label">Emoji</label>
          <div className="emoji-picker">
            {categoryEmojis.map((emoji) => (
              <button
                className={menuCategory.emoji === emoji ? "active" : ""}
                type="button"
                key={emoji}
                onClick={() => patchCategory(menuCategory.id, { emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>
          <label className="menu-label">线性图标</label>
          <div className="icon-picker">
            {(
              [
                "file",
                "folder",
                "briefcase",
                "learning",
                "tools",
                "idea",
                "sparkles",
              ] as CategoryIcon[]
            ).map((icon) => {
              const preview = { ...menuCategory, emoji: "", icon };
              return (
                <button
                  className={
                    !menuCategory.emoji && menuCategory.icon === icon
                      ? "active"
                      : ""
                  }
                  type="button"
                  key={icon}
                  onClick={() =>
                    patchCategory(menuCategory.id, { emoji: "", icon })
                  }
                >
                  <CategoryGlyph category={preview} />
                </button>
              );
            })}
          </div>
          <label className="menu-label">强调色</label>
          <div className="color-picker">
            {categoryColors.map((color) => (
              <button
                className={menuCategory.color === color ? "active" : ""}
                type="button"
                key={color}
                style={{ background: color }}
                onClick={() => patchCategory(menuCategory.id, { color })}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
          </div>
          <div className="category-menu-actions">
            <button
              type="button"
              onClick={() => {
                setEditingCategoryId(menuCategory.id);
                setCategoryName(menuCategory.label);
                setCategoryMenu(null);
              }}
            >
              <FileText />
              重命名
            </button>
            <button
              type="button"
              onClick={() =>
                patchCategory(menuCategory.id, {
                  favorite: !menuCategory.favorite,
                })
              }
            >
              <Star />
              {menuCategory.favorite ? "取消收藏" : "收藏分类"}
            </button>
            <button
              type="button"
              onClick={() => duplicateCategory(menuCategory.id)}
            >
              <Copy />
              复制分类结构
            </button>
            <label className="move-category">
              <MoveRight />
              移动到
              <select
                value={menuCategory.parentId}
                onChange={(event) => {
                  remember("已移动分类");
                  patchCategory(menuCategory.id, {
                    parentId: event.target.value,
                  });
                  setCategoryMenu(null);
                }}
              >
                <option value="root">最外层</option>
                {custom
                  .filter(
                    (node) =>
                      node.id !== menuCategory.id &&
                      !descendants(menuCategory.id).includes(node.id),
                  )
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {categoryPath(node.id)
                        .map((part) => part.label)
                        .join(" / ")}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="danger"
              type="button"
              onClick={() => deleteCategory(menuCategory.id)}
            >
              <Trash2 />
              删除分类
            </button>
          </div>
        </section>
      ) : null}
      {toast ? (
        <div className="action-toast">
          <span>{toast}</span>
          {undoState ? (
            <button type="button" onClick={undoLastAction}>
              <RotateCcw />
              撤销
            </button>
          ) : null}
        </div>
      ) : null}
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
            {hostedAI ? (
              <div className="deepseek-status">
                <span>
                  <Check /> AI 服务已连接
                </span>
              </div>
            ) : !hasDeepSeekKey || changingDeepSeekKey ? (
              <div className="deepseek-connect">
                <div>
                  <strong>连接 DeepSeek</strong>
                  <span>Key 只保存在当前浏览器，不会写入 GitHub。</span>
                </div>
                <label>
                  <input
                    type="password"
                    value={deepSeekKeyInput}
                    onChange={(event) =>
                      setDeepSeekKeyInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveDeepSeekKey();
                    }}
                    placeholder="输入 DeepSeek API Key"
                    autoComplete="off"
                    aria-label="DeepSeek API Key"
                  />
                  <button type="button" onClick={saveDeepSeekKey}>
                    保存并连接
                  </button>
                </label>
              </div>
            ) : (
              <div className="deepseek-status">
                <span>
                  <Check /> DeepSeek 已连接
                </span>
                <button
                  type="button"
                  onClick={() => setChangingDeepSeekKey(true)}
                >
                  更换 Key
                </button>
              </div>
            )}
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
                  className={`image-drop ${!hasDeepSeekKey && !hostedAI ? "disabled" : ""}`}
                  onClick={() => {
                    if (processing) return;
                    if (!hasDeepSeekKey && !hostedAI) {
                      setImportError("请先连接 DeepSeek，再选择截图。");
                      return;
                    }
                    fileInput.current?.click();
                  }}
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

function LibraryOverview({
  items,
  sources,
  categories,
  onOpenCategory,
  onOpenItem,
  onOpenInbox,
}: {
  items: Item[];
  sources: Source[];
  categories: CustomCategory[];
  onOpenCategory: (id: string) => void;
  onOpenItem: (id: string) => void;
  onOpenInbox: () => void;
}) {
  const roots = categories.filter((category) => category.parentId === "root");
  const descendantsOf = (id: string): string[] => {
    const children = categories
      .filter((category) => category.parentId === id)
      .map((category) => category.id);
    return children.flatMap((child) => [child, ...descendantsOf(child)]);
  };
  const recentItems = [...items]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 5);
  return (
    <div className="library-overview">
      <section className="overview-summary">
        <div>
          <span>已整理内容</span>
          <strong>{items.filter((item) => !item.unclassified).length}</strong>
        </div>
        <button type="button" onClick={onOpenInbox}>
          <span>等待分类</span>
          <strong>{items.filter((item) => item.unclassified).length}</strong>
        </button>
        <div>
          <span>我的分类</span>
          <strong>{categories.length}</strong>
        </div>
      </section>
      <section className="overview-section">
        <header>
          <div>
            <strong>分类概览</strong>
            <span>进入一个分类，继续查看和整理其中的内容</span>
          </div>
        </header>
        <div className="category-grid">
          {roots.map((category) => {
            const ids = new Set([category.id, ...descendantsOf(category.id)]);
            const categoryItems = items.filter(
              (item) =>
                Boolean(item.customCategory && ids.has(item.customCategory)) ||
                Boolean(item.categoryRefs?.some((id) => ids.has(id))),
            );
            return (
              <button
                className="category-card"
                type="button"
                key={category.id}
                onClick={() => onOpenCategory(category.id)}
              >
                <span
                  className="category-card-icon"
                  style={{
                    background: `${category.color || categoryColors[0]}18`,
                  }}
                >
                  <CategoryGlyph category={category} />
                </span>
                <span className="category-card-copy">
                  <strong>{category.label}</strong>
                  <small>{categoryItems.length} 条内容</small>
                </span>
                <span className="category-card-recents">
                  {categoryItems.slice(0, 2).map((item) => (
                    <small key={item.id}>{item.title}</small>
                  ))}
                  {!categoryItems.length ? <small>还没有内容</small> : null}
                </span>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      </section>
      <section className="overview-section recent-overview">
        <header>
          <div>
            <strong>最近整理</strong>
            <span>继续处理刚刚进入 Signal 的信息</span>
          </div>
        </header>
        <div>
          {recentItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onOpenItem(item.id)}
            >
              <FileText />
              <span>
                <strong>{item.title}</strong>
                <small>
                  {sources.find((source) => source.id === item.sourceId)
                    ?.title || "手动记录"}
                </small>
              </span>
              <ChevronRight />
            </button>
          ))}
        </div>
      </section>
    </div>
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
          (item) =>
            Boolean(item.customCategory && ids.has(item.customCategory)) ||
            Boolean(item.categoryRefs?.some((id) => ids.has(id))),
        );
        return (
          <section key={column.id}>
            <header>
              <strong>
                <CategoryGlyph category={column} />
                {column.label}
              </strong>
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

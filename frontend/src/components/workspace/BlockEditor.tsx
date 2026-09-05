"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent, type ComponentType, type KeyboardEvent } from "react";
import type { BlockType, NoteBlock } from "../../types";
import { 
  Braces, CheckSquare2, Copy, Heading1, Heading2, Heading3, StickyNote, Sigma, Text, 
  Trash2, Palette, Highlighter, Square, RotateCcw, X, PenTool, MousePointer2, Eraser,
  List, ListOrdered, Quote, Image as ImageIcon, FileText, Link2, ExternalLink, Download, Eye, Paperclip,
  Undo2, Redo2
} from "lucide-react";
import * as fabric from "fabric";
import { HexColorPicker } from "react-colorful";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Editor } from "@monaco-editor/react";

/* ───────────── Constants ───────────── */

export const formatBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return "Unknown size";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface BlockEditorProps { 
  blocks: NoteBlock[]; 
  onChange: (blocks: NoteBlock[]) => void; 
  onDirty: () => void; 
  onTriggerImageUpload?: (targetBlockId?: string) => void;
  onTriggerFileUpload?: (targetBlockId?: string) => void;
  onTriggerLinkModal?: (targetBlockId?: string) => void;
  onReplaceImage?: (blockId: string) => void;
  onPreviewImage?: (url: string) => void;
}

type MenuOption = { type: BlockType; label: string; command: string; icon: ComponentType<{ size?: number }>; };

const options: MenuOption[] = [
  { type: "paragraph", label: "Paragraph", command: "#p", icon: Text },
  { type: "h1", label: "Heading 1", command: "#h1", icon: Heading1 },
  { type: "h2", label: "Heading 2", command: "#h2", icon: Heading2 },
  { type: "h3", label: "Heading 3", command: "#h3", icon: Heading3 },
  { type: "bullet", label: "Bullet list", command: "#bullet", icon: List },
  { type: "numbered", label: "Numbered list", command: "#numbered", icon: ListOrdered },
  { type: "todo", label: "To-do checklist", command: "#to-do", icon: CheckSquare2 },
  { type: "quote", label: "Quote block", command: "#quote", icon: Quote },
  { type: "code", label: "Code block", command: "#code", icon: Braces },
  { type: "math", label: "Math equation", command: "#math", icon: Sigma },
  { type: "sticky", label: "Sticky note", command: "#sticky note", icon: StickyNote },
  { type: "image", label: "Image", command: "#image", icon: ImageIcon },
  { type: "file", label: "PDF / Document", command: "#file", icon: FileText },
  { type: "link", label: "External link", command: "#link", icon: Link2 },
];

const TEXT_COLORS = [
  "#ffffff", "#f8fafc", "#e2e8f0", "#94a3b8", "#475569", "#000000",
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981", 
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e",
  "linear-gradient(45deg, #f97316, #eab308)",
  "linear-gradient(45deg, #06b6d4, #3b82f6)",
  "linear-gradient(45deg, #8b5cf6, #d946ef)",
  "linear-gradient(45deg, #10b981, #06b6d4)",
  "linear-gradient(45deg, #f43f5e, #f97316)",
  "linear-gradient(45deg, #ef4444, #8b5cf6)"
];
const HIGHLIGHT_COLORS = [
  "#7f1d1d", "#78350f", "#713f12", "#3f6212", "#14532d", "#064e3b", 
  "#164e63", "#1e3a8a", "#312e81", "#4c1d95", "#701a75", "#881337",
  "#27272a", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8"
];
const BOX_COLORS = [
  "#450a0a", "#431407", "#422006", "#223318", "#052e16", "#022c22", 
  "#083344", "#172554", "#1e1b4b", "#2e1065", "#4a044e", "#4c0519",
  "#18181b", "#27272a", "#3f3f46", "#52525b", "#71717a", "#a1a1aa"
];

const newId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
const newBlock = (type: BlockType = "paragraph"): NoteBlock => ({ id: newId(), type, content: "", ...(type === "todo" ? { isCompleted: false } : {}), ...(type === "code" ? { language: "javascript" } : {}) });

/* ───────────── Main Editor ───────────── */

export default function BlockEditor({ 
  blocks, 
  onChange, 
  onDirty,
  onTriggerImageUpload,
  onTriggerFileUpload,
  onTriggerLinkModal,
  onReplaceImage,
  onPreviewImage
}: BlockEditorProps) {
  const [menu, setMenu] = useState({ visible: false, index: -1, query: "", selected: 0, top: 0, left: 0 });
  const [colorToolbar, setColorToolbar] = useState<{ visible: boolean; index: number }>({ visible: false, index: -1 });

  useEffect(() => { if (!blocks.length) onChange([newBlock()]); }, [blocks.length, onChange]);
  
  // Compute consecutive numbered list indices (resets to 1 whenever interrupted by another block type)
  const listNumbers = useMemo(() => {
    const nums: number[] = [];
    let currentNum = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === "numbered") {
        currentNum++;
        nums.push(currentNum);
      } else {
        currentNum = 0;
        nums.push(0);
      }
    }
    return nums;
  }, [blocks]);

  const visibleOptions = useMemo(() => options.filter((o) => {
    const q = menu.query.toLowerCase().trim();
    if (o.type === "numbered" && (q === "1" || q === "num" || q === "number" || q === "ordered")) return true;
    return `${o.command} ${o.label}`.toLowerCase().includes(q);
  }), [menu.query]);

  const update = (index: number, patch: Partial<NoteBlock>) => { onDirty(); onChange(blocks.map((b, i) => i === index ? { ...b, ...patch } : b)); };
  const focus = (id: string) => window.setTimeout(() => document.getElementById(`block-${id}`)?.focus(), 0);
  const insertAfter = (index: number, type: BlockType) => { const next = newBlock(type); onDirty(); onChange([...blocks.slice(0, index + 1), next, ...blocks.slice(index + 1)]); focus(next.id); };
  const remove = (index: number) => { if (blocks.length === 1) { update(0, { type: "paragraph", content: "" }); return; } const prev = blocks[index - 1]; onDirty(); onChange(blocks.filter((_, i) => i !== index)); if (prev) focus(prev.id); };
  const duplicate = (index: number) => { const copy = { ...blocks[index], id: newId() }; onDirty(); onChange([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]); };

  const choose = (type: BlockType) => {
    if (menu.index < 0) return;
    const targetBlockId = blocks[menu.index]?.id;

    if (type === "image") {
      update(menu.index, { content: "" });
      setMenu((c) => ({ ...c, visible: false }));
      onTriggerImageUpload?.(targetBlockId);
      return;
    }
    if (type === "file") {
      update(menu.index, { content: "" });
      setMenu((c) => ({ ...c, visible: false }));
      onTriggerFileUpload?.(targetBlockId);
      return;
    }
    if (type === "link") {
      update(menu.index, { content: "" });
      setMenu((c) => ({ ...c, visible: false }));
      onTriggerLinkModal?.(targetBlockId);
      return;
    }
    update(menu.index, { type, content: "", isCompleted: type === "todo" ? false : undefined, language: type === "code" ? "javascript" : undefined });
    const id = blocks[menu.index].id;
    setMenu((c) => ({ ...c, visible: false }));
    focus(id);
  };



  const handleInput = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, index: number) => {
    const value = event.target.value;

    // Quick markdown shortcuts for numbered list and other list types
    if (blocks[index].type === "paragraph") {
      if (value === "1. " || value.startsWith("1. ")) {
        update(index, { type: "numbered", content: value.slice(3) });
        setMenu((c) => ({ ...c, visible: false }));
        return;
      }
      if (value === "- " || value === "* ") {
        update(index, { type: "bullet", content: "" });
        setMenu((c) => ({ ...c, visible: false }));
        return;
      }
      if (value === "[] ") {
        update(index, { type: "todo", content: "", isCompleted: false });
        setMenu((c) => ({ ...c, visible: false }));
        return;
      }
    }

    update(index, { content: value });
    const isCommand = blocks[index].type === "paragraph" && /^#[\w\s-]*$/.test(value);
    if (!isCommand) { setMenu((c) => ({ ...c, visible: false })); return; }
    const rect = event.target.getBoundingClientRect();
    setMenu({ visible: true, index, query: value.slice(1).trim(), selected: 0, top: Math.min(rect.bottom + 8, window.innerHeight - 300), left: Math.min(rect.left, window.innerWidth - 280) });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>, index: number) => {
    const block = blocks[index];
    if (menu.visible) {
      if (event.key === "Escape") { event.preventDefault(); setMenu((c) => ({ ...c, visible: false })); return; }
      if (event.key === "ArrowDown") { event.preventDefault(); setMenu((c) => ({ ...c, selected: Math.min(c.selected + 1, visibleOptions.length - 1) })); return; }
      if (event.key === "ArrowUp") { event.preventDefault(); setMenu((c) => ({ ...c, selected: Math.max(c.selected - 1, 0) })); return; }
      if (event.key === "Enter" && visibleOptions[menu.selected]) { event.preventDefault(); choose(visibleOptions[menu.selected].type); return; }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      if (block.type === "code") return;
      event.preventDefault();
      if (block.type === "math" || block.type === "sticky" || block.type === "image" || block.type === "file" || block.type === "link") { 
        insertAfter(index, "paragraph"); 
        return; 
      }
      if (!block.content.trim() && (block.type === "bullet" || block.type === "numbered" || block.type === "todo")) {
        update(index, { type: "paragraph", isCompleted: undefined });
        return;
      }
      if (!block.content.trim() && block.type !== "paragraph") { 
        update(index, { type: "paragraph", isCompleted: undefined }); 
        return; 
      }
      insertAfter(index, block.type === "quote" ? "paragraph" : block.type);
      return;
    }
    if (event.key === "Backspace" && !block.content) {
      event.preventDefault();
      if (block.type !== "paragraph") update(index, { type: "paragraph", isCompleted: undefined });
      else remove(index);
    }
  };

  return <div className="note-page-editor">
    {blocks.map((block, index) => (
      <EditorBlock
        key={block.id}
        index={index}
        listNumber={listNumbers[index]}
        block={block}
        onInput={(e) => handleInput(e, index)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        onToggle={() => update(index, { isCompleted: !block.isCompleted })}
        onDelete={() => remove(index)}
        onDuplicate={() => duplicate(index)}
        onLanguage={(lang) => update(index, { language: lang })}
        onColorToolbar={() => setColorToolbar({ visible: true, index })}
        colorToolbarOpen={colorToolbar.visible && colorToolbar.index === index}
        onCloseColorToolbar={() => setColorToolbar({ visible: false, index: -1 })}
        onUpdateColor={(patch) => { update(index, patch); onDirty(); }}
        onReplaceImage={onReplaceImage}
        onPreviewImage={onPreviewImage}
      />
    ))}
    {menu.visible && visibleOptions.length > 0 && <CommandMenu options={visibleOptions} selected={menu.selected} top={menu.top} left={menu.left} onChoose={choose} />}
    <div 
      className="mt-4 pb-32 cursor-text min-h-[150px]" 
      onClick={() => {
        const newBlk: NoteBlock = newBlock("paragraph");
        onChange([...blocks, newBlk]);
        setTimeout(() => document.getElementById(`block-${newBlk.id}`)?.focus(), 50);
      }}
    />
  </div>;
}

/* ───────────── Command Menu ───────────── */

function CommandMenu({ options: shown, selected, top, left, onChoose }: { options: MenuOption[]; selected: number; top: number; left: number; onChoose: (type: BlockType) => void; }) {
  return <div className="note-command-menu" style={{ top, left }}><p>What do you want to add?</p><div>{shown.map((option, index) => { const Icon = option.icon; return <button key={option.type} type="button" className={index === selected ? "is-selected" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => onChoose(option.type)}><Icon size={16} /><span>{option.label}</span><kbd>{option.command}</kbd></button>; })}</div></div>;
}

/* ───────────── Color Toolbar ───────────── */

function CustomColorPickerPopover({ color, onChange, onClose }: { color: string; onChange: (c: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rgb, setRgb] = useState({ r: 0, g: 0, b: 0 });

  useEffect(() => {
    let hex = color;
    if (hex.length === 4) {
      hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      setRgb({ r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) });
    }
  }, [color]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleRgbChange = (e: ChangeEvent<HTMLInputElement>, channel: "r" | "g" | "b") => {
    const val = Math.max(0, Math.min(255, Number(e.target.value) || 0));
    const newRgb = { ...rgb, [channel]: val };
    setRgb(newRgb);
    const newHex = "#" + (1 << 24 | newRgb.r << 16 | newRgb.g << 8 | newRgb.b).toString(16).slice(1);
    onChange(newHex);
  };

  const handleEyedropper = async () => {
    if ("EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        onChange(result.sRGBHex);
      } catch (e) {
        // Ignore user cancellation
      }
    }
  };

  return (
    <div className="custom-color-popover" ref={ref}>
      <HexColorPicker color={color} onChange={onChange} />
      <div className="ccp-controls">
        {"EyeDropper" in window && (
          <button type="button" className="ccp-eyedropper" onClick={handleEyedropper} title="Pick color from screen">
            <PenTool size={14} />
          </button>
        )}
        <div className="ccp-rgb-inputs">
          <label><span>R</span><input type="number" min="0" max="255" value={rgb.r} onChange={e => handleRgbChange(e, "r")} /></label>
          <label><span>G</span><input type="number" min="0" max="255" value={rgb.g} onChange={e => handleRgbChange(e, "g")} /></label>
          <label><span>B</span><input type="number" min="0" max="255" value={rgb.b} onChange={e => handleRgbChange(e, "b")} /></label>
        </div>
      </div>
    </div>
  );
}

function ColorToolbar({ block, onUpdate, onClose }: { block: NoteBlock; onUpdate: (patch: Partial<NoteBlock>) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"text" | "highlight" | "box">("text");
  const [customColor, setCustomColor] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { 
      // Do not close if clicking inside the color toolbar
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose(); 
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const applyColor = (color: string) => {
    if (tab === "text") onUpdate({ textColor: color });
    else if (tab === "highlight") onUpdate({ highlightColor: color });
    else onUpdate({ boxColor: color });
  };

  const resetColors = () => {
    if (tab === "text") onUpdate({ textColor: "" });
    else if (tab === "highlight") onUpdate({ highlightColor: "" });
    else onUpdate({ boxColor: "" });
  };

  const activeColor = tab === "text" ? block.textColor : tab === "highlight" ? block.highlightColor : block.boxColor;
  const isGradient = (c?: string) => c?.includes("gradient");
  const pickerColor = activeColor && !isGradient(activeColor) ? activeColor : (tab === "text" ? "#ffffff" : "#000000");

  const colors = {
    text: ["#ffffff", "#e2e8f0", "#94a3b8", "#fca5a5", "#fcd34d", "#86efac", "#93c5fd", "#c4b5fd", "#f9a8d4"],
    highlight: ["transparent", "#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#94a3b8"],
    box: ["transparent", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"]
  };

  return (
    <div className="block-color-toolbar" ref={ref}>
      <div className="bct-tabs"><button type="button" className={tab === "text" ? "is-active" : ""} onClick={() => setTab("text")}>Text</button><button type="button" className={tab === "highlight" ? "is-active" : ""} onClick={() => setTab("highlight")}>Highlight</button><button type="button" className={tab === "box" ? "is-active" : ""} onClick={() => setTab("box")}>Box</button></div>
      <div className="bct-scroll-area">
        <div className="bct-grid">
          {colors[tab].map((c) => (
            <button key={c} type="button" title={c} className={activeColor === c ? "is-active" : ""} style={{ background: c }} onClick={() => applyColor(c)} aria-label={`Color ${c}`} />
          ))}
        </div>
      </div>
      <div className="bct-custom">
        <div style={{ position: "relative" }}>
          <button 
            type="button" 
            className="bct-custom-btn" 
            onClick={() => setShowCustomPicker(!showCustomPicker)}
          >
            <div className="bct-custom-swatch" style={{ background: pickerColor }} />
            Custom
          </button>
          
          {showCustomPicker && (
            <CustomColorPickerPopover 
              color={pickerColor} 
              onChange={applyColor} 
              onClose={() => setShowCustomPicker(false)} 
            />
          )}
        </div>
        <input type="text" placeholder="#HEX" value={customColor} onChange={(e) => setCustomColor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && /^#[0-9a-fA-F]{3,8}$/.test(customColor)) applyColor(customColor); }} />
      </div>
      <button type="button" className="bct-reset" onClick={resetColors}><RotateCcw size={12} /> Reset {tab}</button>
    </div>
  );
}

/* ───────────── Sticky Block with Drawing ───────────── */

type Point = { x: number; y: number };
type Stroke = Point[];

function StickyBlock({ block, control, input, textareaRef, onDelete, onUpdate }: any) {
  const [mode, setMode] = useState<"text" | "draw" | "select">("text");
  const [hasSelection, setHasSelection] = useState(false);
  const [hasCanvasObjects, setHasCanvasObjects] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const redoStackRef = useRef<fabric.Object[]>([]);

  const hasDrawing = useMemo(() => {
    if (!block.drawingData || block.drawingData === "" || block.drawingData === "[]" || block.drawingData === "{}") {
      return false;
    }
    try {
      const parsed = JSON.parse(block.drawingData);
      return Array.isArray(parsed?.objects) ? parsed.objects.length > 0 : false;
    } catch {
      return false;
    }
  }, [block.drawingData]);

  const hidePlaceholder = mode === "draw" || hasDrawing || hasCanvasObjects;

  // Save on drawing end or object modified
  const saveState = useCallback(() => {
    if (!fabricRef.current) return;
    const json = fabricRef.current.toJSON();
    const count = json.objects ? json.objects.length : 0;
    setHasCanvasObjects(count > 0);
    setCanUndo(count > 0);
    if (count === 0) {
      onUpdate({ drawingData: "" });
    } else {
      onUpdate({ drawingData: JSON.stringify(json) });
    }
  }, [onUpdate]);

  const undoDrawing = useCallback(() => {
    if (!fabricRef.current) return;
    const objects = fabricRef.current.getObjects();
    if (objects.length > 0) {
      const last = objects[objects.length - 1];
      redoStackRef.current.push(last);
      fabricRef.current.remove(last);
      fabricRef.current.discardActiveObject();
      fabricRef.current.requestRenderAll();
      saveState();
      setCanUndo(fabricRef.current.getObjects().length > 0);
      setCanRedo(true);
    } else if (redoStackRef.current.length > 0) {
      while (redoStackRef.current.length > 0) {
        const item = redoStackRef.current.pop();
        if (item) fabricRef.current.add(item);
      }
      fabricRef.current.requestRenderAll();
      saveState();
      setCanUndo(true);
      setCanRedo(false);
    }
  }, [saveState]);

  const redoDrawing = useCallback(() => {
    if (!fabricRef.current || redoStackRef.current.length === 0) return;
    const item = redoStackRef.current.pop();
    if (item) {
      fabricRef.current.add(item);
      fabricRef.current.discardActiveObject();
      fabricRef.current.requestRenderAll();
      saveState();
      setCanUndo(true);
      setCanRedo(redoStackRef.current.length > 0);
    }
  }, [saveState]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Only initialize once
    if (!fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: false,
        width: canvasRef.current.parentElement?.clientWidth || 500,
        height: Math.max(100, canvasRef.current.parentElement?.clientHeight || 100),
        backgroundColor: "transparent",
        selection: true,
      });

      // Configure brush
      fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
      fabricRef.current.freeDrawingBrush.color = "#f3e8ff";
      fabricRef.current.freeDrawingBrush.width = 3;

      // Load existing drawing data if any
      if (block.drawingData && block.drawingData !== "[]" && block.drawingData !== "{}") {
        try {
          const parsed = JSON.parse(block.drawingData);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.objects) {
            if (parsed.objects.length > 0) {
              setHasCanvasObjects(true);
              setCanUndo(true);
            }
            fabricRef.current.loadFromJSON(parsed, () => {
              fabricRef.current?.renderAll();
            });
          }
        } catch (e) {
          console.error("Failed to parse drawingData", e);
        }
      }

      // Handle window resize to adjust canvas
      const handleResize = () => {
        if (!fabricRef.current || !canvasRef.current?.parentElement) return;
        const parent = canvasRef.current.parentElement;
        const width = parent.clientWidth;
        (fabricRef.current as any).setWidth(width);
        fabricRef.current.renderAll();
      };
      window.addEventListener("resize", handleResize as any);

      fabricRef.current.on("path:created", () => {
        redoStackRef.current = [];
        setCanRedo(false);
        setCanUndo(true);
        saveState();
      });
      fabricRef.current.on("object:modified", saveState);
      fabricRef.current.on("object:removed", saveState);
      fabricRef.current.on("object:added", saveState);
      
      fabricRef.current.on("selection:created", () => setHasSelection(true));
      fabricRef.current.on("selection:updated", () => setHasSelection(true));
      fabricRef.current.on("selection:cleared", () => setHasSelection(false));

      return () => {
        window.removeEventListener("resize", handleResize as any);
        fabricRef.current?.dispose();
        fabricRef.current = null;
      };
    }
  }, [block.drawingData, saveState]);

  // Update mode
  useEffect(() => {
    if (!fabricRef.current) return;
    
    if (mode === "draw") {
      fabricRef.current.isDrawingMode = true;
      fabricRef.current.selection = false;
      fabricRef.current.discardActiveObject();
      fabricRef.current.requestRenderAll();
    } else if (mode === "select") {
      fabricRef.current.isDrawingMode = false;
      fabricRef.current.selection = true;
    } else {
      // Text mode: canvas should not intercept clicks
      fabricRef.current.isDrawingMode = false;
      fabricRef.current.selection = false;
      fabricRef.current.discardActiveObject();
      fabricRef.current.requestRenderAll();
    }
  }, [mode]);

  // Handle keyboard shortcuts (Ctrl+Z Undo, Ctrl+Y Redo, Delete, Copy) for drawing & fabric objects
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((mode !== "draw" && mode !== "select") || !fabricRef.current) return;

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        undoDrawing();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (((e.key === "z" || e.key === "Z") && e.shiftKey) || e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        e.stopPropagation();
        redoDrawing();
        return;
      }

      if (mode === "select") {
        const activeObject = fabricRef.current.getActiveObject();
        if (!activeObject) return;

        // Delete
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          const activeObjects = fabricRef.current.getActiveObjects();
          if (activeObjects.length) {
            activeObjects.forEach(obj => {
              redoStackRef.current.push(obj);
              fabricRef.current?.remove(obj);
            });
            fabricRef.current.discardActiveObject();
            saveState();
            setCanRedo(true);
          }
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, undoDrawing, redoDrawing, saveState]);

  const clearDrawing = () => {
    if (fabricRef.current) {
      const currentObjects = fabricRef.current.getObjects();
      if (currentObjects.length > 0) {
        redoStackRef.current = [...currentObjects];
        setCanRedo(true);
      }
      fabricRef.current.clear();
      (fabricRef.current as any).backgroundColor = "transparent";
      setHasCanvasObjects(false);
      setCanUndo(false);
      onUpdate({ drawingData: "" });
    }
  };

  const deleteSelected = () => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => {
        redoStackRef.current.push(obj);
        fabricRef.current?.remove(obj);
      });
      fabricRef.current.discardActiveObject();
      setHasSelection(false);
      saveState();
      setCanRedo(true);
    }
  };

  return (
    <div className="editor-block editor-block--sticky relative group">
      {control}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-30">
        <div className="flex bg-black/20 p-1 rounded-md border border-white/5">
          <button 
            type="button" 
            onClick={() => setMode(mode === "text" ? "draw" : "text")} 
            className={`p-1 rounded transition-colors ${mode === "text" ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            title="Text Mode"
          >
            <Text size={14} />
          </button>
          <button 
            type="button" 
            onClick={() => setMode("draw")} 
            className={`p-1 rounded transition-colors ${mode === "draw" ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-purple-400 hover:bg-purple-500/20'}`}
            title="Draw Mode"
          >
            <PenTool size={14} />
          </button>
          <button 
            type="button" 
            onClick={() => setMode("select")} 
            className={`p-1 rounded transition-colors ${mode === "select" ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-blue-400 hover:bg-blue-500/20'}`}
            title="Select & Edit Drawing"
          >
            <MousePointer2 size={14} />
          </button>
        </div>

        {(mode === "draw" || mode === "select") && (
          <div className="flex bg-black/20 p-1 rounded-md border border-white/5 items-center gap-0.5">
            <button 
              type="button" 
              onClick={undoDrawing} 
              disabled={!canUndo}
              className={`p-1 rounded transition-colors ${canUndo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 cursor-not-allowed opacity-40'}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button 
              type="button" 
              onClick={redoDrawing} 
              disabled={!canRedo}
              className={`p-1 rounded transition-colors ${canRedo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 cursor-not-allowed opacity-40'}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </button>
          </div>
        )}
        
        {mode === "select" && hasSelection && (
          <button 
            type="button" 
            onClick={deleteSelected} 
            className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 p-1.5 rounded-md transition-colors"
            title="Delete Selected"
          >
            <Eraser size={14} />
          </button>
        )}

        {block.drawingData && block.drawingData !== "" && (
          <button 
            type="button" 
            onClick={clearDrawing} 
            className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 p-1.5 rounded-md transition-colors"
            title="Clear Drawing"
          >
            <RotateCcw size={14} />
          </button>
        )}
        <button type="button" onClick={onDelete} className="text-yellow-600/50 hover:text-red-500 bg-yellow-500/10 hover:bg-red-500/10 p-1.5 rounded-md transition-colors" title="Delete Sticky Note"><Trash2 size={14} /></button>
      </div>

      <div className="sticky-label"><StickyNote size={14} /> QUICK NOTE</div>
      
      <div className="relative mt-2" style={{ minHeight: "150px" }}>
        <textarea 
          ref={textareaRef} 
          {...input} 
          rows={1} 
          placeholder={hidePlaceholder ? "" : "Write a sticky note... (Shift+Enter for newline)"} 
          className={mode !== "text" ? "opacity-30" : ""}
          style={{ position: "relative", zIndex: 10, minHeight: "150px", width: "100%", background: "transparent" }}
          disabled={mode !== "text"}
        />
        <div 
          className="absolute top-0 left-0 w-full h-full"
          style={{ 
            zIndex: 20, 
            pointerEvents: mode === "text" ? "none" : "auto",
            touchAction: "none"
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Editor Block ───────────── */

function EditorBlock({ 
  block, 
  index,
  listNumber = 1,
  onInput, 
  onKeyDown, 
  onToggle, 
  onDelete, 
  onDuplicate, 
  onLanguage, 
  onColorToolbar, 
  colorToolbarOpen, 
  onCloseColorToolbar, 
  onUpdateColor,
  onReplaceImage,
  onPreviewImage
}: {
  block: NoteBlock;
  index: number;
  listNumber?: number;
  onInput: (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>) => void;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onLanguage: (language: NonNullable<NoteBlock["language"]>) => void;
  onColorToolbar: () => void;
  colorToolbarOpen: boolean;
  onCloseColorToolbar: () => void;
  onUpdateColor: (patch: Partial<NoteBlock>) => void;
  onReplaceImage?: (blockId: string) => void;
  onPreviewImage?: (url: string) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (textarea.current && block.type !== "code") { textarea.current.style.height = "0px"; textarea.current.style.height = `${textarea.current.scrollHeight}px`; } }, [block.content, block.type]);
  const input = { id: `block-${block.id}`, value: block.content, onChange: onInput, onKeyDown };

  const control = (
    <div className="block-controls" style={{ zIndex: colorToolbarOpen ? 50 : 3 }}>
      <button type="button" onClick={onColorToolbar} aria-label="Style block"><Palette size={13} /></button>
      <button type="button" onClick={onDuplicate} aria-label="Duplicate block"><Copy size={13} /></button>
      <button type="button" onClick={onDelete} aria-label="Delete block"><Trash2 size={13} /></button>
      {colorToolbarOpen && <ColorToolbar block={block} onUpdate={onUpdateColor} onClose={onCloseColorToolbar} />}
    </div>
  );

  // Compute inline styles for the block
  const textStyle: React.CSSProperties = {};
  if (block.textColor) {
    if (block.textColor.includes("gradient")) {
      textStyle.backgroundImage = block.textColor;
      textStyle.WebkitBackgroundClip = "text";
      textStyle.WebkitTextFillColor = "transparent";
      textStyle.backgroundClip = "text";
      textStyle.color = "transparent";
    } else {
      textStyle.color = block.textColor;
      textStyle.WebkitTextFillColor = block.textColor;
    }
  }

  const highlightStyle: React.CSSProperties = {};
  if (block.highlightColor) {
    highlightStyle.backgroundColor = block.highlightColor;
    highlightStyle.borderRadius = "4px";
    highlightStyle.padding = "2px 6px";
    highlightStyle.margin = "-2px -6px";
  }

  // Box wrapper
  const isBoxed = !!block.boxColor;
  const boxStyle: React.CSSProperties = isBoxed ? {
    backgroundColor: block.boxColor,
    border: `1px solid ${block.boxBorderColor || "rgba(255,255,255,0.1)"}`,
    borderRadius: "12px",
    padding: "16px 18px",
    margin: "8px 0",
  } : {};

  const wrapWithBox = (content: React.ReactNode) => {
    if (isBoxed) return <div className="block-box" style={boxStyle}>{content}</div>;
    return content;
  };

  // ── Headings ──
  if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
    return <div className={`editor-block editor-block--${block.type}`}>
      {control}
      {wrapWithBox(
        <div style={highlightStyle}>
          <input {...input} placeholder={`Heading ${block.type.slice(1)}`} style={textStyle} />
        </div>
      )}
    </div>;
  }

  // ── Bullet List ──
  if (block.type === "bullet") {
    return (
      <div className="editor-block editor-block--bullet my-0.5">
        {control}
        {wrapWithBox(
          <div className="flex items-start gap-2.5 w-full" style={highlightStyle}>
            <span className="text-blue-400 font-bold select-none text-base leading-snug mt-0.5">•</span>
            <textarea ref={textarea} {...input} rows={1} placeholder="List item" style={textStyle} />
          </div>
        )}
      </div>
    );
  }

  // ── Numbered List ──
  if (block.type === "numbered") {
    return (
      <div className="editor-block editor-block--numbered my-0.5">
        {control}
        {wrapWithBox(
          <div className="flex items-start gap-2.5 w-full" style={highlightStyle}>
            <span className="text-zinc-500 font-semibold font-mono text-xs select-none min-w-[20px] pt-1.5">
              {listNumber || 1}.
            </span>
            <textarea ref={textarea} {...input} rows={1} placeholder="List item" style={textStyle} />
          </div>
        )}
      </div>
    );
  }

  // ── Quote ──
  if (block.type === "quote") {
    return (
      <div className="editor-block editor-block--quote my-2.5">
        {control}
        {wrapWithBox(
          <div className="border-l-2 border-blue-500/80 bg-blue-500/5 rounded-r-xl pl-4 pr-3 py-2.5 italic" style={highlightStyle}>
            <textarea ref={textarea} {...input} rows={1} placeholder="Quote or key takeaway..." style={textStyle} />
          </div>
        )}
      </div>
    );
  }

  // ── Image Block ──
  if (block.type === "image") {
    const size = block.imageSize || "medium";
    const sizeConfig = {
      small: { container: "max-w-[280px]", imgMaxH: "max-h-[200px]" },
      medium: { container: "max-w-[420px]", imgMaxH: "max-h-[320px]" },
      large: { container: "max-w-[620px]", imgMaxH: "max-h-[460px]" },
    }[size];

    const isRawHashCaption = block.caption && /^file_[0-9a-f]{16,}$/i.test(block.caption);
    const captionValue = isRawHashCaption ? "" : (block.caption || "");

    return (
      <div className={`editor-block editor-block--image my-4 p-2.5 rounded-2xl border border-white/10 bg-black/20 group relative w-full ${sizeConfig.container} mx-auto transition-all duration-200 shadow-lg shadow-black/20`}>
        {control}
        <div className={`relative rounded-xl overflow-hidden ${sizeConfig.imgMaxH} flex items-center justify-center bg-black/40`}>
          {block.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={block.url} 
              alt={captionValue || "Note image"} 
              className={`w-auto h-auto max-w-full ${sizeConfig.imgMaxH} object-contain rounded-xl cursor-pointer select-none transition-transform duration-200 hover:scale-[1.01]`}
              onClick={() => onPreviewImage?.(block.url!)} 
              title="Click to view full size"
            />
          ) : (
            <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
              <ImageIcon size={32} />
              <span className="text-xs">Image loading...</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-2 px-1">
          <input
            type="text"
            value={captionValue}
            onChange={(e) => onUpdateColor({ caption: e.target.value })}
            placeholder="Add an image caption..."
            className="text-xs text-zinc-400 placeholder-zinc-600 bg-transparent outline-none flex-1 py-1 min-w-0"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/5">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onUpdateColor({ imageSize: s })}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                    (block.imageSize || "medium") === s 
                      ? "bg-blue-600 text-white shadow-xs" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                  title={`${s.charAt(0).toUpperCase() + s.slice(1)} size`}
                >
                  {s === "small" ? "S" : s === "medium" ? "M" : "L"}
                </button>
              ))}
            </div>
            {onReplaceImage && (
              <button
                type="button"
                onClick={() => onReplaceImage(block.id)}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer"
              >
                Replace
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── File / PDF Attachment Block ──
  if (block.type === "file") {
    const isPdf = (block.fileName || "").toLowerCase().endsWith(".pdf") || (block.fileType && block.fileType.includes("pdf"));
    const fileExt = block.fileName ? block.fileName.split('.').pop()?.toUpperCase() : (isPdf ? "PDF" : "DOC");
    const fileLabel = isPdf ? "PDF Document" : `${fileExt} Document`;

    const handleOpenFile = () => {
      if (!block.url) return;
      if (block.url.startsWith("data:")) {
        try {
          const arr = block.url.split(",");
          const mime = arr[0].match(/:(.*?);/)?.[1] || (isPdf ? "application/pdf" : "application/octet-stream");
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
          return;
        } catch {
          // fallback to direct open
        }
      }
      window.open(block.url, "_blank");
    };

    return (
      <div className="editor-block editor-block--file my-3 p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group">
        {control}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`p-2.5 rounded-xl shrink-0 ${isPdf ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
            <FileText size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md" title={block.fileName}>
              {block.fileName || "Document Resource"}
            </h4>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${isPdf ? 'bg-rose-500/15 text-rose-300' : 'bg-blue-500/15 text-blue-300'}`}>
                {fileLabel}
              </span>
              {block.fileSize ? (
                <span className="text-zinc-400 text-[11px]">{formatBytes(block.fileSize)}</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {block.url && (
            <>
              <button
                type="button"
                onClick={handleOpenFile}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View in new tab"
              >
                <Eye size={13} />
                <span>View</span>
              </button>
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                download={block.fileName || (isPdf ? "document.pdf" : "document")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/80 hover:bg-blue-600 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Download document"
              >
                <Download size={13} />
                <span>Download</span>
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Link Preview Card Block ──
  if (block.type === "link") {
    return (
      <div className="editor-block editor-block--link my-3 p-4 rounded-2xl border border-white/10 bg-black/20 hover:border-blue-500/40 transition-all flex items-center justify-between gap-4 group">
        {control}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 rounded-xl shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
            <Link2 size={22} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate max-w-md">
              {block.linkTitle || block.linkDomain || "External Resource"}
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 truncate">
              <span className="text-blue-400 font-medium">{block.linkDomain}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 truncate">{block.url}</span>
            </p>
          </div>
        </div>
        {block.url && (
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <span>Open</span>
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    );
  }

  // ── Todo ──
  if (block.type === "todo") {
    return <div className="editor-block editor-block--todo">
      {control}
      {wrapWithBox(
        <div className="editor-todo-inner" style={highlightStyle}>
          <button type="button" className={block.isCompleted ? "todo-toggle done" : "todo-toggle"} onClick={onToggle} aria-label="Toggle task">{block.isCompleted && "✓"}</button>
          <textarea ref={textarea} {...input} rows={1} placeholder="To-do item" className={block.isCompleted ? "is-complete" : ""} style={textStyle} />
        </div>
      )}
    </div>;
  }

  // ── Code ──
  if (block.type === "code") {
    const lines = Math.max(6, (block.content || "").split("\n").length);
    const editorHeight = Math.max(160, lines * 21 + 32);

    return (
      <div className="editor-block editor-block--code relative">
        {control}
        <div className="code-toolbar z-20">
          <span>CODE</span>
          <div className="flex items-center gap-2">
            <select aria-label="Code language" value={block.language ?? "javascript"} onChange={(event) => onLanguage(event.target.value as NonNullable<NoteBlock["language"]>)}>
              {["javascript", "typescript", "java", "python", "c", "cpp", "html", "css", "json"].map((language) => <option key={language} value={language}>{language === "cpp" ? "C++" : language.toUpperCase()}</option>)}
            </select>
            <button type="button" onClick={onDelete} className="text-zinc-500 hover:text-red-400 bg-zinc-800/50 hover:bg-red-500/10 p-1.5 rounded-md transition-colors" title="Delete Code Block"><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="code-editor relative bg-[#1e1e1e] rounded-xl overflow-hidden" style={{ height: `${editorHeight}px` }} onKeyDown={onKeyDown}>
          {!block.content && (
            <div className="absolute top-[16px] left-[62px] text-zinc-500 font-mono text-[14px] pointer-events-none z-10 select-none">
              // Start your code here
            </div>
          )}
          <Editor
            height="100%"
            language={block.language ?? "javascript"}
            theme="vs-dark"
            value={block.content}
            onChange={(value) => onInput({ target: { value: value || '' } } as any)}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              lineHeight: 21,
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbersMinChars: 3,
              renderLineHighlight: "none",
              contextmenu: false,
            }}
          />
        </div>
      </div>
    );
  }

  // ── Math ──
  if (block.type === "math") {
    const mathContent = block.content || "x^2 + y^2 = z^2";
    const formattedMath = mathContent.includes('\n') && !mathContent.includes('\\begin{') ? `\\begin{aligned} ${mathContent.replace(/\n/g, '\\\\')} \\end{aligned}` : mathContent;
    const output = katex.renderToString(formattedMath, { throwOnError: false, displayMode: true });
    return <div className="editor-block editor-block--math relative">
      {control}
      <button type="button" onClick={onDelete} className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 bg-zinc-900/50 hover:bg-red-500/10 p-1.5 rounded-md transition-colors z-30" title="Delete Math Block"><Trash2 size={14} /></button>
      <div className="math-preview" dangerouslySetInnerHTML={{ __html: output }} />
      <textarea ref={textarea} {...input} rows={1} placeholder="x^2 + y^2 = z^2 (Shift+Enter for newline)" />
    </div>;
  }

  // ── Sticky ──
  if (block.type === "sticky") {
    return <StickyBlock 
      block={block} 
      control={control} 
      input={input} 
      textareaRef={textarea} 
      onDelete={onDelete} 
      onUpdate={onUpdateColor} 
    />;
  }

  // ── Paragraph (default) ──
  return <div className="editor-block editor-block--paragraph">
    {control}
    {wrapWithBox(
      <div style={highlightStyle}>
        <textarea ref={textarea} {...input} rows={1} placeholder="Type # to add a block, or start writing..." style={textStyle} />
      </div>
    )}
  </div>;
}

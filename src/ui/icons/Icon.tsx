import {
  Sparkles,
  CheckCircle2,
  Trash2,
  Pencil,
  GitMerge,
  Square,
  Columns2,
  SlidersHorizontal,
  BookOpen,
  Settings,
  Link2,
  ArrowLeft,
  ArrowLeftRight,
  Plus,
  GraduationCap,
  Bookmark,
} from "lucide-react";

export type IconName =
  | "generate"
  | "accept"
  | "delete"
  | "edit"
  | "single"
  | "split"
  | "workbench"
  | "reader"
  | "admin"
  | "sync"
  | "back"
  | "swap"
  | "add"
  | "merge"
  | "onboarding"
  | "bookmark";

const ICON_MAP = {
  generate: Sparkles,
  accept: CheckCircle2,
  delete: Trash2,
  edit: Pencil,
  single: Square,
  split: Columns2,
  workbench: SlidersHorizontal,
  reader: BookOpen,
  admin: Settings,
  sync: Link2,
  back: ArrowLeft,
  swap: ArrowLeftRight,
  add: Plus,
  merge: GitMerge,
  onboarding: GraduationCap,
  bookmark: Bookmark,
} as const;

type Props = {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
};

export function Icon({ name, size = 18, className, title }: Props) {
  const LucideIcon = ICON_MAP[name];

  return (
    <LucideIcon
      size={size}
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
      aria-label={title}
    />
  );
}

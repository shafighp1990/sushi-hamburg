import type { ReactNode } from "react";
import type { Article } from "@/lib/knowledge";
import type { Language, Product } from "@/lib/catalog";

export type ShellProps = {
  lang: Language;
  setLang: (l: Language) => void;
  children: ReactNode;
};

export type ArticleCardProps = { article: Article; lang: Language };

export type TopicLinksProps = { items: Article[]; lang: Language };

export type SourceListProps = { ids: string[]; lang: Language };

export type KnowledgeArticleProps = { id: string };

export type MiniProductProps = { product: Product; lang: Language };

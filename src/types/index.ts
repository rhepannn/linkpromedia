export type ArticleStatus = "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Author {
  id: string;
  name: string;
  image?: string | null;
  slug?: string | null;
  isVerified?: boolean;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  wordCount: number;
  thumbnailUrl?: string | null;
  status: ArticleStatus;
  isBreaking: boolean;
  isEditorsPick: boolean;
  viewCount: number;
  previewToken?: string | null;
  previewTokenExpiresAt?: Date | string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  aiSummary?: string | null;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  /** Kode bahasa ISO 639-1; "id" untuk artikel asli */
  language?: string;
  /** Terisi bila artikel ini hasil terjemahan dari artikel lain */
  translationOfId?: string | null;
  category: Category;
  author: Author;
  tags?: { tag: Tag }[];
}

export interface ArticleCard {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  thumbnailUrl?: string | null;
  status: ArticleStatus;
  isBreaking: boolean;
  isEditorsPick: boolean;
  viewCount: number;
  publishedAt?: Date | string | null;
  category: Category;
  author: Author;
}

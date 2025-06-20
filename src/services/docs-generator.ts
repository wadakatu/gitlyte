import type { RepoData } from "../types.js";
import type { DesignStrategy } from "./ai-analyzer.js";

/** Markdownコンテンツの構造分析結果 */
export interface DocumentStructure {
  title: string;
  sections: Section[];
  tableOfContents: TocItem[];
  metadata: {
    estimatedReadTime: number;
    wordCount: number;
    codeBlocks: number;
  };
}

/** ドキュメントセクション */
export interface Section {
  id: string;
  title: string;
  level: number; // h1=1, h2=2, etc.
  content: string;
  hasCodeBlocks: boolean;
  subsections: Section[];
}

/** 目次アイテム */
export interface TocItem {
  id: string;
  title: string;
  level: number;
  anchor: string;
}

/** Docsページ生成結果 */
export interface GeneratedDocsPage {
  docsPage: string;
  searchData: string; // 検索用データJSON
  navigation: string; // サイドバーナビゲーション
}

/**
 * README.mdからドキュメント構造を分析
 */
export function analyzeDocumentStructure(readme: string): DocumentStructure {
  const lines = readme.split("\n");
  const sections: Section[] = [];
  const tableOfContents: TocItem[] = [];

  let currentSection: Section | null = null;
  let currentContent: string[] = [];
  let codeBlockCount = 0;
  let wordCount = 0;

  for (const line of lines) {
    // ヘッダー行の検出
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // 前のセクションを保存
      if (currentSection) {
        currentSection.content = currentContent.join("\n").trim();
        sections.push(currentSection);
      }

      // 新しいセクション開始
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      const id = generateAnchorId(title);

      currentSection = {
        id,
        title,
        level,
        content: "",
        hasCodeBlocks: false,
        subsections: [],
      };

      // 目次に追加
      tableOfContents.push({
        id,
        title,
        level,
        anchor: `#${id}`,
      });

      currentContent = [];
    } else {
      // コンテンツ行
      currentContent.push(line);

      // コードブロック検出
      if (line.trim().startsWith("```")) {
        codeBlockCount++;
        if (currentSection) {
          currentSection.hasCodeBlocks = true;
        }
      }

      // 単語数カウント
      wordCount += line.split(/\s+/).filter((word) => word.length > 0).length;
    }
  }

  // 最後のセクションを保存
  if (currentSection) {
    currentSection.content = currentContent.join("\n").trim();
    sections.push(currentSection);
  }

  // ネストした構造を構築
  const structuredSections = buildNestedSections(sections);

  return {
    title: extractDocumentTitle(readme),
    sections: structuredSections,
    tableOfContents,
    metadata: {
      estimatedReadTime: Math.ceil(wordCount / 200), // 200語/分で推定
      wordCount,
      codeBlocks: Math.floor(codeBlockCount / 2), // 開始・終了ペアで割る
    },
  };
}

/**
 * セクションをネスト構造に変換
 */
function buildNestedSections(flatSections: Section[]): Section[] {
  if (flatSections.length === 0) return [];

  const result: Section[] = [];
  const stack: Section[] = [];

  for (const section of flatSections) {
    // 現在のレベルより深いか同じレベルのスタックアイテムを削除
    while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
      stack.pop();
    }

    if (stack.length === 0 || section.level <= 2) {
      // トップレベルセクション（h1, h2を基本トップレベルとする）
      result.push(section);
    } else {
      // 親セクションのサブセクションとして追加
      stack[stack.length - 1].subsections.push(section);
    }

    stack.push(section);
  }

  return result;
}

/**
 * タイトルからアンカーIDを生成
 */
function generateAnchorId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[&]/g, "") // &を削除
    .replace(/[()]/g, "") // 括弧を削除
    .replace(/[^\w\s-]/g, "") // 英数字、スペース、ハイフン以外を削除
    .replace(/\s+/g, "-") // スペースをハイフンに
    .replace(/-+/g, "-") // 連続ハイフンを単一に
    .replace(/^-|-$/g, ""); // 先頭末尾のハイフンを削除
}

/**
 * ドキュメントのメインタイトルを抽出
 */
function extractDocumentTitle(readme: string): string {
  const lines = readme.split("\n");

  // 最初のh1を探す
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }

  return "Documentation";
}

/**
 * Docsページ生成
 */
export async function generateDocsPage(
  repoData: RepoData,
  design: DesignStrategy
): Promise<GeneratedDocsPage> {
  const readme = repoData.readme || "";
  const docStructure = analyzeDocumentStructure(readme);

  // 検索用データ生成
  const searchData = generateSearchData(docStructure);

  // ナビゲーション生成
  const navigation = generateNavigation(docStructure);

  // メインDocsページ生成
  const docsPage = await generateDocsPageContent(
    repoData,
    docStructure,
    design
  );

  return {
    docsPage,
    searchData,
    navigation,
  };
}

/**
 * 検索用データ生成
 */
function generateSearchData(structure: DocumentStructure): string {
  const searchItems = structure.sections.map((section) => ({
    id: section.id,
    title: section.title,
    content: section.content,
    anchor: `#${section.id}`,
    level: section.level,
  }));

  return JSON.stringify(
    {
      title: structure.title,
      items: searchItems,
      metadata: structure.metadata,
    },
    null,
    2
  );
}

/**
 * サイドバーナビゲーション生成
 */
function generateNavigation(structure: DocumentStructure): string {
  const renderTocItems = (items: TocItem[], maxLevel = 3): string => {
    return items
      .filter((item) => item.level <= maxLevel)
      .map((item) => {
        const indent = "  ".repeat(item.level - 1);
        return `${indent}<a href="${item.anchor}" class="toc-link level-${item.level}" data-level="${item.level}">
${indent}  ${item.title}
${indent}</a>`;
      })
      .join("\n");
  };

  return `
<nav class="docs-navigation">
  <div class="docs-nav-header">
    <h3>📖 Documentation</h3>
    <div class="reading-time">
      ⏱️ ${structure.metadata.estimatedReadTime} min read
    </div>
  </div>
  
  <div class="search-container">
    <input type="text" id="docs-search" placeholder="Search documentation..." class="search-input">
    <div id="search-results" class="search-results"></div>
  </div>
  
  <div class="table-of-contents">
    <h4>Table of Contents</h4>
    <div class="toc-items">
${renderTocItems(structure.tableOfContents)}
    </div>
  </div>
  
  <div class="docs-stats">
    <div class="stat">
      <span class="stat-label">Words</span>
      <span class="stat-value">${structure.metadata.wordCount.toLocaleString()}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Code Examples</span>
      <span class="stat-value">${structure.metadata.codeBlocks}</span>
    </div>
  </div>
</nav>`;
}

/**
 * メインDocsページコンテンツ生成
 */
async function generateDocsPageContent(
  repoData: RepoData,
  structure: DocumentStructure,
  design: DesignStrategy
): Promise<string> {
  const processedContent = await processMarkdownContent(structure, repoData);

  return `---
import Layout from '../layouts/Layout.astro';

const repoData = ${JSON.stringify(repoData)};
const docStructure = ${JSON.stringify(structure)};
---

<Layout title="${structure.title} - ${repoData.repo.name}" description="Complete documentation for ${repoData.repo.name}">
  <header class="site-header">
    <div class="container">
      <nav class="main-nav">
        <div class="nav-brand">
          <h1>{repoData.repo.name}</h1>
        </div>
        <div class="nav-links">
          <a href="../" class="nav-link">🏠 Home</a>
          <a href="./" class="nav-link nav-active">📖 Docs</a>
          <a href={repoData.repo.html_url} class="nav-link" target="_blank" rel="noopener">🔗 GitHub</a>
        </div>
      </nav>
    </div>
  </header>
  
  <div class="docs-container">
    <!-- サイドバーナビゲーション -->
    <aside class="docs-sidebar">
      ${generateNavigation(structure)}
    </aside>
    
    <!-- メインコンテンツ -->
    <main class="docs-content">
      <article class="documentation">
        <header class="docs-header">
          <h1>${structure.title}</h1>
          <div class="docs-meta">
            <span class="repo-link">
              <a href="{repoData.repo.html_url}" target="_blank" rel="noopener">
                📂 View on GitHub
              </a>
            </span>
            <span class="last-updated">
              Updated: ${new Date().toLocaleDateString()}
            </span>
          </div>
        </header>
        
        <div class="docs-body">
          ${processedContent}
        </div>
        
        <footer class="docs-footer">
          <div class="edit-link">
            <a href="{repoData.repo.html_url}/edit/main/README.md" target="_blank" rel="noopener">
              ✏️ Edit this page on GitHub
            </a>
          </div>
        </footer>
      </article>
    </main>
  </div>
</Layout>

<style>
  .site-header {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .site-header .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .main-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    min-height: 4rem;
  }

  .nav-brand {
    flex-shrink: 0;
  }

  .nav-brand h1 {
    margin: 0;
    font-size: 1.5rem;
    color: ${design.colorScheme.primary};
    font-family: ${design.typography.heading};
    font-weight: 700;
    white-space: nowrap;
  }

  .nav-links {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .nav-link {
    text-decoration: none;
    color: #374151;
    font-weight: 500;
    font-size: 0.9rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: all 0.2s ease;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav-link:hover {
    background: ${design.colorScheme.primary}15;
    color: ${design.colorScheme.primary};
    transform: translateY(-1px);
  }
  
  .nav-active {
    background: ${design.colorScheme.primary};
    color: white !important;
  }
  
  .nav-active:hover {
    background: ${design.colorScheme.primary};
    transform: none;
  }
  
  html {
    scroll-behavior: smooth;
  }

  .docs-container {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: calc(100vh - 80px); /* ヘッダー分を引く */
    gap: 0;
  }
  
  /* モバイル・タブレット対応 */
  @media (max-width: 1024px) {
    .main-nav {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 0;
    }
    
    .nav-brand h1 {
      font-size: 1.25rem;
    }
    
    .nav-links {
      gap: 0.25rem;
      justify-content: center;
    }
    
    .nav-link {
      font-size: 0.85rem;
      padding: 0.4rem 0.8rem;
    }
    
    .docs-container {
      grid-template-columns: 1fr;
      min-height: calc(100vh - 120px);
    }
    
    .docs-sidebar {
      position: relative;
      height: auto;
      border-right: none;
      border-bottom: 1px solid #e2e8f0;
      padding: 1.5rem;
    }
  }
  
  @media (max-width: 640px) {
    .site-header .container {
      padding: 0 0.75rem;
    }
    
    .main-nav {
      padding: 0.75rem 0;
    }
    
    .nav-brand h1 {
      font-size: 1.1rem;
    }
    
    .nav-links {
      gap: 0.25rem;
    }
    
    .nav-link {
      font-size: 0.8rem;
      padding: 0.35rem 0.6rem;
    }
  }
  
  .docs-sidebar {
    background: ${design.style === "glassmorphism" ? "rgba(255,255,255,0.95)" : "#f8fafc"};
    border-right: 1px solid #e2e8f0;
    padding: 2rem 1.5rem;
    position: sticky;
    top: 80px; /* ヘッダー高さ分のオフセット */
    height: calc(100vh - 80px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
  
  .docs-sidebar::-webkit-scrollbar {
    width: 6px;
  }
  
  .docs-sidebar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .docs-sidebar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 3px;
  }
  
  .docs-sidebar::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
  }
  
  .docs-nav-header h3 {
    margin-bottom: 0.5rem;
    color: ${design.colorScheme.primary};
    font-size: 1.1rem;
  }
  
  .reading-time {
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 1.5rem;
  }
  
  .search-container {
    margin-bottom: 1.5rem;
    position: relative;
  }
  
  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }
  
  .search-input:focus {
    outline: none;
    border-color: ${design.colorScheme.primary};
    box-shadow: 0 0 0 3px ${design.colorScheme.primary}20;
  }
  
  .table-of-contents h4 {
    font-size: 0.9rem;
    margin-bottom: 1rem;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .toc-items {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .toc-link {
    display: block;
    padding: 0.5rem 0.75rem;
    color: #64748b;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.9rem;
    line-height: 1.4;
    transition: all 0.2s ease;
  }
  
  .toc-link:hover, .toc-link.active {
    background: ${design.colorScheme.primary}10;
    color: ${design.colorScheme.primary};
    border-left: 3px solid ${design.colorScheme.primary};
    padding-left: calc(0.75rem - 3px);
  }
  
  .toc-link.level-1 {
    font-weight: 600;
    margin-top: 0.5rem;
  }
  
  .toc-link.level-2 {
    padding-left: 1.5rem;
  }
  
  .toc-link.level-3 {
    padding-left: 2.25rem;
    font-size: 0.85rem;
  }
  
  .docs-stats {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
  }
  
  .stat-label {
    color: #6b7280;
  }
  
  .stat-value {
    font-weight: 600;
    color: ${design.colorScheme.primary};
  }
  
  .docs-content {
    padding: 2rem 3rem;
    max-width: none;
    overflow-x: auto;
    min-height: calc(100vh - 80px);
  }
  
  @media (max-width: 1024px) {
    .docs-content {
      padding: 1.5rem;
    }
  }
  
  @media (max-width: 640px) {
    .docs-content {
      padding: 1rem;
    }
  }
  
  .docs-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }
  
  .docs-header h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: ${design.colorScheme.primary};
    font-family: ${design.typography.heading};
  }
  
  .docs-meta {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    font-size: 0.9rem;
  }
  
  .repo-link a {
    color: ${design.colorScheme.primary};
    text-decoration: none;
    font-weight: 500;
  }
  
  .last-updated {
    color: #6b7280;
  }
  
  .docs-body {
    line-height: 1.7;
    color: #374151;
  }
  
  .docs-body h2 {
    margin: 2rem 0 1rem;
    color: ${design.colorScheme.primary};
    font-size: 1.75rem;
    scroll-margin-top: 2rem;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0.5rem;
  }
  
  .docs-body h3 {
    margin: 1.5rem 0 0.75rem;
    color: #374151;
    font-size: 1.25rem;
    scroll-margin-top: 2rem;
    position: relative;
  }
  
  .docs-body h3::before {
    content: "";
    position: absolute;
    left: -1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 1.2em;
    background: ${design.colorScheme.accent};
    border-radius: 2px;
  }
  
  .docs-body .code-block-container {
    margin: 1.5rem 0;
    border: 1px solid #334155;
    border-radius: 8px;
    overflow: hidden;
    background: #0f172a;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .docs-body .code-block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }
  
  .docs-body .code-language {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .docs-body .copy-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: 1px solid #475569;
    color: #cbd5e1;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .docs-body .copy-button:hover {
    background: #475569;
    color: white;
    border-color: #64748b;
  }
  
  .docs-body .copy-button.copied {
    background: #059669;
    border-color: #10b981;
    color: white;
  }
  
  .docs-body .code-block-container pre {
    background: transparent;
    color: #f1f5f9;
    padding: 1.5rem;
    margin: 0;
    border: none;
    border-radius: 0;
    overflow-x: auto;
    font-family: ${design.typography.code};
    box-shadow: none;
  }
  
  .docs-body .code-block-container pre code {
    background: transparent !important;
    color: inherit !important;
    padding: 0 !important;
    border-radius: 0 !important;
    font-size: 0.9rem;
    line-height: 1.6;
  }
  
  .docs-body code {
    background: #e2e8f0;
    color: #1e293b;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: ${design.typography.code};
    font-size: 0.9em;
    font-weight: 600;
    border: 1px solid #cbd5e1;
  }
  
  .docs-body blockquote {
    border-left: 4px solid ${design.colorScheme.primary};
    padding: 1rem 1.5rem;
    background: ${design.colorScheme.primary}10;
    margin: 1.5rem 0;
    font-style: italic;
  }
  
  .docs-body .markdown-image {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin: 1.5rem 0;
    border: 1px solid #e2e8f0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .docs-body .markdown-image:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .docs-body ul {
    margin: 1rem 0;
    padding-left: 2rem;
  }
  
  .docs-body li {
    margin: 0.5rem 0;
    line-height: 1.6;
  }
  
  .docs-body h1, .docs-body h2, .docs-body h3, .docs-body h4 {
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  
  .docs-body h1:first-child,
  .docs-body h2:first-child,
  .docs-body h3:first-child,
  .docs-body h4:first-child {
    margin-top: 0;
  }
  
  .docs-footer {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
    text-align: center;
  }
  
  .edit-link a {
    color: ${design.colorScheme.primary};
    text-decoration: none;
    font-weight: 500;
    padding: 0.75rem 1.5rem;
    border: 1px solid ${design.colorScheme.primary};
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .edit-link a:hover {
    background: ${design.colorScheme.primary};
    color: white;
  }
  
  @media (max-width: 1024px) {
    .docs-container {
      grid-template-columns: 1fr;
    }
    
    .docs-sidebar {
      position: relative;
      height: auto;
      border-right: none;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .docs-content {
      padding: 1.5rem;
    }
  }
</style>

<script>
  // コードコピー機能
  window.copyCodeToClipboard = function(codeId) {
    try {
      const codeElement = document.getElementById(codeId);
      const button = document.querySelector('button[onclick*="' + codeId + '"]');
      
      if (!codeElement) {
        alert('コードブロックが見つかりませんでした');
        return;
      }
      
      const code = codeElement.textContent || codeElement.innerText;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          // 成功時のアラート
          alert('コードをクリップボードにコピーしました！');
          
          // ボタンの状態を変更
          if (button) {
            const originalContent = button.innerHTML;
            button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg> Copied!';
            button.classList.add('copied');
            
            // 2秒後に元に戻す
            setTimeout(() => {
              button.innerHTML = originalContent;
              button.classList.remove('copied');
            }, 2000);
          }
        }).catch(err => {
          console.error('Clipboard API failed: ', err);
          fallbackCopy(code, codeElement);
        });
      } else {
        fallbackCopy(code, codeElement);
      }
    } catch (error) {
      console.error('Copy function error: ', error);
      alert('コピーに失敗しました');
    }
  };
  
  // フォールバック機能
  function fallbackCopy(code, codeElement) {
    try {
      // 古いブラウザ向けのフォールバック
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        alert('コードをクリップボードにコピーしました！');
      } else {
        // 最終フォールバック: テキストを選択状態にする
        const range = document.createRange();
        range.selectNodeContents(codeElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        alert('コードを選択しました。Ctrl+C (Cmd+C) でコピーしてください');
      }
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      alert('コピーに失敗しました。手動でコードを選択してコピーしてください');
    }
  }

  // 検索機能
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('docs-search');
    const searchResults = document.getElementById('search-results');
    
    if (searchInput && searchResults) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (query.length < 2) {
          searchResults.innerHTML = '';
          searchResults.style.display = 'none';
          return;
        }
        
        // 簡単な検索実装（実際のプロジェクトではより高度な検索が必要）
        const headings = document.querySelectorAll('.docs-body h1, .docs-body h2, .docs-body h3');
        const results = Array.from(headings)
          .filter(heading => heading.textContent.toLowerCase().includes(query))
          .slice(0, 5);
        
        if (results.length > 0) {
          searchResults.innerHTML = results
            .map(heading => {
              const id = heading.id || '';
              return \`<a href="#\${id}" class="search-result">\${heading.textContent}</a>\`;
            })
            .join('');
          searchResults.style.display = 'block';
        } else {
          searchResults.innerHTML = '<div class="no-results">No results found</div>';
          searchResults.style.display = 'block';
        }
      });
      
      // 検索結果外クリックで閉じる
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.style.display = 'none';
        }
      });
    }
    
    // アクティブなナビゲーション項目のハイライト
    const observerOptions = {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const navLink = document.querySelector(\`.toc-link[href="#\${id}"]\`);
        
        if (entry.isIntersecting) {
          document.querySelectorAll('.toc-link').forEach(link => 
            link.classList.remove('active'));
          if (navLink) {
            navLink.classList.add('active');
          }
        }
      });
    }, observerOptions);
    
    // スムーズスクロールの改善
    document.querySelectorAll('.toc-link[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          
          // URLを更新
          history.pushState(null, '', \`#\${targetId}\`);
        }
      });
    });
    
    // すべての見出しを監視
    document.querySelectorAll('.docs-body h1, .docs-body h2, .docs-body h3').forEach(heading => {
      if (heading.id) {
        observer.observe(heading);
      }
    });
  });
</script>`;
}

/**
 * Markdownコンテンツを処理してHTMLに変換
 */
async function processMarkdownContent(
  structure: DocumentStructure,
  _repoData: RepoData
): Promise<string> {
  let html = "";

  for (const section of structure.sections) {
    html += await renderSection(section, _repoData);
  }

  return html;
}

/**
 * セクションをHTMLに変換
 */
async function renderSection(
  section: Section,
  repoData: RepoData
): Promise<string> {
  const headingTag = `h${Math.min(section.level, 6)}`;
  const processedContent = await processMarkdownText(section.content, repoData);

  let html = `
    <section class="doc-section" id="${section.id}">
      <${headingTag} id="${section.id}">${section.title}</${headingTag}>
      <div class="section-content">
        ${processedContent}
      </div>
    </section>
  `;

  // サブセクションも処理
  for (const subsection of section.subsections) {
    html += await renderSection(subsection, repoData);
  }

  return html;
}

/**
 * MarkdownテキストをHTMLに変換（簡易版）
 */
async function processMarkdownText(
  markdown: string,
  repoData: RepoData
): Promise<string> {
  let html = markdown;

  // コードブロック
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
    const language = lang || "text";
    const escapedCode = escapeHtml(code.trim());

    return `<div class="code-block-container">
      <div class="code-block-header">
        <span class="code-language">${language}</span>
        <button class="copy-button" onclick="copyCodeToClipboard('${codeId}')" title="Copy code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
      </div>
      <pre><code id="${codeId}" class="language-${language}">${escapedCode}</code></pre>
    </div>`;
  });

  // インラインコード
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 画像記法（リンク記法より先に処理）
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    let imageUrl = url;

    // 相対パスの場合はGitHubの絶対パスに変換
    if (!url.startsWith("http")) {
      // GitHubのrawコンテンツURLに変換
      imageUrl = `${repoData.repo.html_url}/raw/main/${url}`;
    }

    return `<img src="${imageUrl}" alt="${alt || "Image"}" class="markdown-image" loading="lazy" />`;
  });

  // リンク記法（相対パスをGitHubの絶対パスに変換）
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    if (url.startsWith("http")) {
      return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
    }
    // 相対パスをGitHubリンクに変換
    const fullUrl = `${repoData.repo.html_url}/blob/main/${url}`;
    return `<a href="${fullUrl}" target="_blank" rel="noopener">${text}</a>`;
  });

  // 太字
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // イタリック
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // 見出し（h4-h6レベル）
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // リスト項目をマーク
  html = html.replace(/^[-*+]\s+(.+)$/gm, "<li>$1</li>");

  // 連続するリスト項目をulでラップ
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");

  // 段落
  const paragraphs = html.split("\n\n").filter((p) => p.trim());
  html = paragraphs
    .map((p) => {
      if (p.startsWith("<") || p.trim() === "") return p;
      return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n\n");

  return html;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

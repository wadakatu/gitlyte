// Generated Site Types

export interface GeneratedSite {
  pages: {
    "index.html": string;
    "docs.html"?: string;
    "api.html"?: string;
    "examples.html"?: string;
    "changelog.html"?: string;
  };
  assets: {
    "style.css": string;
    "navigation.js": string;
  };
  meta: {
    sitemap: string;
    robotsTxt: string;
  };
}

export interface SiteContent {
  hero: HeroContent;
  features: FeaturesContent;
  stats: StatsContent;
  metadata: SiteMetadata;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
  badge?: {
    text: string;
    emoji?: string;
  };
  ctaButtons: CTAButton[];
}

export interface CTAButton {
  text: string;
  url: string;
  type: "primary" | "secondary";
  emoji?: string;
}

export interface FeaturesContent {
  sectionTitle: string;
  sectionSubtitle: string;
  features: Feature[];
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
  highlight?: string;
}

export interface StatsContent {
  stats: StatItem[];
}

export interface StatItem {
  value: string | number;
  label: string;
  emoji?: string;
  source: "github" | "custom";
}

export interface SiteMetadata {
  title: string;
  description: string;
  githubUrl?: string;
  logoUrl?: string;
  theme: ThemeVariant;
}

export interface ThemeVariant {
  colorScheme: "primary" | "secondary" | "accent" | "custom";
  style: "minimal" | "modern" | "gradient" | "glassmorphism";
  layout: "hero-focused" | "minimal" | "grid" | "sidebar" | "content-heavy";
}

export interface DesignSystem {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    surface: string;
    border: string;
  };
  typography: {
    headings: string;
    body: string;
    mono: string;
  };
  effects: {
    borderRadius: string;
    shadow: string;
    transition: string;
    blur?: string;
  };
  spacing: {
    unit: string;
    scale: Record<string, string>;
  };
}

export interface LayoutConfig {
  title: string;
  description: string;
  theme: string;
  navigation: NavigationConfig;
  footer: FooterConfig;
  customHead?: string;
  customScripts?: string;
}

export interface NavigationConfig {
  items: Array<{
    text: string;
    url: string;
    active?: boolean;
  }>;
  logo?: {
    src: string;
    alt: string;
  };
}

export interface FooterConfig {
  copyright: string;
  links: Array<{
    text: string;
    url: string;
  }>;
}

// Deployment Types
export interface DeploymentResult {
  success: boolean;
  outputPath: string;
  deployedFiles: DeployedFile[];
  errors: string[];
  warnings: string[];
  summary: DeploymentSummary;
}

export interface DeployedFile {
  name: string;
  path: string;
  size: number;
  type: "page" | "asset" | "meta";
  checksum?: string;
}

export interface DeploymentSummary {
  totalFiles: number;
  totalSize: number;
  duration: number;
  filesPerSecond: number;
}

export interface DeploymentManifest {
  timestamp: string;
  version: string;
  files: DeployedFile[];
  config: Record<string, unknown>;
  checksum: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DeploymentOptions {
  clean?: boolean;
  optimize?: boolean;
  compress?: boolean;
}

// Theme and Design Types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeConfig {
  colorScheme: "blue" | "green" | "purple" | "red" | "orange" | "teal" | "pink";
  style: "modern" | "classic" | "minimalist" | "gradient" | "glassmorphism";
  layout:
    | "hero-focused"
    | "content-focused"
    | "docs-focused"
    | "minimal"
    | "grid"
    | "sidebar"
    | "content-heavy";
  colors: ThemeColors;
  typography: {
    fontFamily: {
      sans: string[];
      mono: string[];
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
      "4xl": string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

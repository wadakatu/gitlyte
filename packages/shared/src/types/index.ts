export interface RepoData {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
  hasReadme?: boolean;
  repoUrl?: string;
  hasLogo?: boolean;
  logoUrl?: string;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    fontFamily: {
      heading: string;
      body: string;
      code: string;
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
      "5xl": string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
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
    "4xl": string;
    "5xl": string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    wide: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
}

export interface LayoutType {
  id: string;
  name: string;
  description: string;
}

export interface ComponentProps {
  className?: string;
  children?: any;
}

// AI Generated Content Types
export interface AIGeneratedContent {
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
  type: 'primary' | 'secondary';
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
  icon: string; // emoji or icon identifier
  highlight?: string; // e.g., "10x faster", "5-minute setup"
}

export interface StatsContent {
  stats: StatItem[];
}

export interface StatItem {
  value: string | number;
  label: string;
  emoji?: string;
  source: 'github' | 'custom';
}

export interface SiteMetadata {
  title: string;
  description: string;
  githubUrl?: string;
  logoUrl?: string;
  theme: ThemeVariant;
}

export interface ThemeVariant {
  colorScheme: 'primary' | 'secondary' | 'accent' | 'custom';
  style: 'minimal' | 'modern' | 'gradient' | 'glassmorphism';
  layout: 'hero-focused' | 'minimal' | 'grid' | 'sidebar' | 'content-heavy';
}

// Template Props Interface
export interface TemplateProps {
  content: AIGeneratedContent;
  repoData: RepoData;
  designTokens?: Partial<DesignTokens>;
  customization?: {
    enableAnimations?: boolean;
    showGithubStats?: boolean;
    enableGradients?: boolean;
  };
}
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
# GitLyte 設定ファイル

GitLyteは`.gitlyte.json`設定ファイルまたは`package.json`内の`gitlyte`セクションを使用してロゴやテーマをカスタマイズできます。

## 設定ファイルの作成

### 方法1: .gitlyte.json ファイル（推奨）

リポジトリのルートディレクトリに`.gitlyte.json`ファイルを作成します：

```json
{
  "logo": {
    "path": "./assets/logo.svg",
    "alt": "MyProject Logo"
  },
  "favicon": {
    "path": "./assets/favicon.ico"
  },
  "site": {
    "theme": {
      "primary": "#3b82f6",
      "secondary": "#8b5cf6",
      "accent": "#06b6d4"
    }
  }
}
```

### 方法2: package.json 内設定

`package.json`の`gitlyte`セクションで設定することも可能です：

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "gitlyte": {
    "logo": {
      "path": "./logo.png"
    }
  }
}
```

## 設定項目詳細

### logo
ロゴ画像の設定

- **path** (string, 必須): ロゴ画像のパス
  - 相対パス（例: `./assets/logo.svg`）
  - 絶対URL（例: `https://example.com/logo.png`）
- **alt** (string, 任意): ロゴのalt属性

### favicon
faviconの設定

- **path** (string, 必須): faviconファイルのパス
  - 相対パス（例: `./favicon.ico`）
  - 絶対URL（例: `https://example.com/favicon.ico`）

### site.theme
サイトテーマカラーの設定

- **primary** (string, 任意): プライマリカラー（16進数形式）
- **secondary** (string, 任意): セカンダリカラー（16進数形式）
- **accent** (string, 任意): アクセントカラー（16進数形式）

## 優先順位

設定は以下の優先順位で適用されます：

1. **設定ファイル** - `.gitlyte.json` > `package.json`内gitlyteセクション
2. **自動検出** - 一般的なロゴファイル名の検出
3. **README画像** - README内のロゴっぽい画像の検出

## 例

### 基本設定
```json
{
  "logo": {
    "path": "./logo.png"
  }
}
```

### フル設定
```json
{
  "logo": {
    "path": "./assets/images/logo.svg",
    "alt": "MyProject - The Future of Development"
  },
  "favicon": {
    "path": "./assets/favicon.png"
  },
  "site": {
    "theme": {
      "primary": "#2563eb",
      "secondary": "#7c3aed",
      "accent": "#059669"
    }
  }
}
```

### 外部URL使用
```json
{
  "logo": {
    "path": "https://cdn.example.com/myproject-logo.svg",
    "alt": "MyProject Logo"
  },
  "favicon": {
    "path": "https://cdn.example.com/favicon.ico"
  }
}
```

## 注意事項

- 相対パスは自動的にGitHubの`raw`URLに変換されます
- カラーコードは16進数形式（`#rrggbb`）である必要があります
- 設定ファイルが存在しない場合は自動検出が実行されます
- 無効な設定項目は自動的に除外されます
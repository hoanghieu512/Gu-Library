# Gú's Library

App Android (Capacitor + Ionic React + Vite) lưu/đọc/đồng bộ tài liệu học luật qua Syncthing, build hoàn toàn bằng CLI (không Android Studio). appId `com.gulibrary.app`.

## Build APK debug (nghiệm thu)

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Build APK release (đã ký)

Yêu cầu: JDK 21 + Android SDK 36 (xem toolchain), và **keystore + `android/keystore.properties`** (KHÔNG có trong git — xem backup bên dưới).

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk (đã ký)
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Cập nhật bản ký **cùng keystore** = cài đè được, không cần gỡ. Kiểm chữ ký:
`$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs <apk>`.

### ⚠ Keystore — phải backup, mất là không update được app

- Keystore: `~/keystores/gu-library/gu-library-release.jks` (ngoài repo).
- Credential: `android/keystore.properties` (gitignored) — `storePassword`, `keyPassword`, `keyAlias=gu-library`.
- **Backup cả hai** vào nơi an toàn (password manager / cloud riêng).
- Mất keystore hoặc quên mật khẩu ⇒ không ký được bản update ⇒ phải đổi applicationId / gỡ cài lại từ đầu (mất dữ liệu app).

## Version

Một nguồn duy nhất = `package.json`. `android/app/build.gradle` lấy `versionName` từ đó; Vite inject `__APP_VERSION__` (fallback web). Cài đặt → "Phiên bản X.Y.Z" đọc qua `@capacitor/app` `App.getInfo()`. Bump version = sửa `package.json` rồi build lại (không sửa hai chỗ).

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

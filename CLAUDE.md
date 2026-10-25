# Gú's Library

App Android (Capacitor 8, Ionic React, Vite, TypeScript) để Gú đọc, tra và gom tài liệu học luật. Tài liệu nằm trong một folder "kho" do Syncthing đồng bộ giữa điện thoại và mini PC; app đọc ghi kho qua plugin SAF tự viết. Worker Python ở repo riêng `Gu-Library-Worker` (mini PC) convert file và sinh sidecar JSON cho mỗi PDF. Prod là máy của Gú; QA là hai máy test UBS1 và dGen1. Repo này **public**.

File này chỉ chứa luật của dự án. Thói quen cá nhân (cách xưng hô, ngôn ngữ trả lời) nằm ở `~/.claude/CLAUDE.md` của từng máy hoặc environment, đừng chép vào đây.

## Đọc trước khi làm

- `Docs/claude/lessons.md`: quyết định đã chốt, bẫy đã cắn, việc còn mở. Đọc trước khi đụng code.
- `Docs/gu-library-design-spec.md` (spec), `Docs/gu-library-sidecar-schema.md` (hợp đồng sidecar với worker), `Docs/gu-library-ops-qa-prod.md` (vận hành QA/Prod; §8.1 ghi kiểm chứng từng bản), `CHANGELOG.md`.
- Spec và plan của từng beat: `Docs/superpowers/specs/`, `Docs/superpowers/plans/`. Brief cho beat sắp làm: `Docs/claude/briefs/`.

## Lệnh

- `npm test` (vitest), `npx tsc -b` (vitest không typecheck), `npm run lint` (cổng cứng: 0 lỗi; 10 cảnh báo có lý do ghi trong `eslint.config.js`), `npm run build`.
- JUnit cho phần native: `cd android && ./gradlew testReleaseUnitTest` (cần JDK 21 và Android SDK 36). Sau lệnh có `cd android`, mọi lệnh tiếp theo dùng đường dẫn tuyệt đối.
- e2e: `npm run e2e`, chạy trên máy thật UBS1 qua USB, chỉ ở local. Đọc `e2e/README.md` trước.

## Quy ước

- Code, comment, commit message, tên biến bằng tiếng Anh. Chữ hiện trên màn cho Gú bằng tiếng Việt. Comment tiếng Việt cũ cứ để nguyên; phần mới viết bằng tiếng Anh.
- Không dùng em dash trong bất kỳ văn bản nào: code, comment, chữ trên màn, tài liệu. Đụng vào đoạn nào đang có em dash thì viết lại đoạn đó.
- TDD: test đỏ trước rồi mới viết code. Với bản sửa lỗi, chứng minh test bắt được lỗi bằng một đột biến tạm rồi trả code về.
- Plugin SAF: code app import `Saf` từ `src/plugins/saf.ts` (lớp này đổi `KHO_HIDDEN` thành `KhoUnreadableError` cho mọi lệnh). Không import `SafNative` ngoài `src/plugins` và test; `src/plugins` không import `src/storage`. ESLint chặn cả hai.
- Test: giả plugin bằng `vi.mock('../plugins/safNative', () => ({ SafNative: {} }))` rồi `Object.assign(SafNative, fakeKho().saf)` (`src/test/fakeSaf.ts`, có cờ `hideAll`, `rejectHidden`, `caseInsensitive`); giả Preferences bằng `vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'))`; spy trên global trả lại trong `afterEach(() => vi.restoreAllMocks())`.
- UI: lề `IonContent` đặt bằng biến `--padding-*` (`ion-padding` không có tác dụng); sheet và modal dùng `GuSheet`, `GuDialog`; hàng danh sách dùng `KhoRow`; chữ nhỏ hơn 8 px vẽ trong SVG có `viewBox`; cảnh báo cần thấy ở bản release dùng `logWarn` (`src/plugins/appLog.ts`), không bật `loggingBehavior`.
- Markdown: `Docs/gu-library-ops-qa-prod.md` cắt dòng khoảng 100 ký tự theo quy ước của nó; file Markdown mới viết mỗi đoạn, mỗi mục trên một dòng.
- Repo public: không commit thông tin riêng tư, khoá, mật khẩu, API key, nội dung kho của Gú.

## Phát hành (chỉ ở local, có máy thật)

1. Nhánh `release/X.Y.Z`: bump `package.json` cùng commit với mục mới trong `src/whatsNew/notes.ts` (`notes.test` đỏ nếu thiếu). Ghi chú viết cho "Pé", chỉ điều Pé thấy được; huynh duyệt câu chữ trước khi merge.
2. `CHANGELOG.md`, rồi ops doc §8.1 sau khi kiểm: APK nghiệm thu cài UBS1 và dGen1 (mở lần đầu bằng `monkey`, dGen1 không force-stop), bảng "Có gì mới" hiện, e2e đạt hết (10/10 từ khi có test Mục lục). Kiểm xong chép ngay APK đó từ `android/app/build/outputs/apk/release/` (Gradle ghi đè mỗi lần build) vào `releases/`, thêm dòng `SHA1SUMS` và dòng "QA, waiting for Gu" trong `releases/README.txt`.
3. Merge `--no-ff` vào `main`, tag nhẹ `vX.Y.Z`, push. Sửa dòng trạng thái App trong ops doc, chạy `scripts/sync-ops-doc.sh` rồi `scripts/sync-ops-doc.sh --publish` (đồng bộ sang repo worker và vault).
4. `releases/` (gitignored) là chỗ duy nhất cất APK, mỗi bản đã nghiệm thu một file. Gú cài bản nào thì sửa dòng của bản đó trong `README.txt` thành "Prod since <ngày>" và sửa dòng Prod trong ops doc; bản Gú bỏ qua thì xoá (cần thì build lại từ tag). Không cất APK ở chỗ khác, không để bản build thử trên nhánh tính năng vào đây.

## Phiên cloud (biến môi trường `CLAUDE_CODE_REMOTE=true`)

- Làm được: đọc và sửa code, `npm test`, `npx tsc -b`, `npm run lint`, `npm run build`, commit, push một nhánh riêng. `node_modules` do hook SessionStart (`scripts/cloud-install.sh`) cài.
- Không làm: build release hay ký APK (keystore chỉ có trên Mac), e2e và mọi việc cần máy thật, đụng kho QA hay Prod, chạy `sync-ops-doc.sh`, sửa dòng trạng thái trong ops doc, bump version, sửa `notes.ts` hay `CHANGELOG.md`, gắn tag, merge hay push `main`.
- Không có dữ liệu kho: dựng sidecar mẫu trong test theo `Docs/gu-library-sidecar-schema.md`.
- Kết thúc phiên: nhánh đã push; `npm test`, `npx tsc -b`, `npm run lint` xanh; có file bàn giao `Docs/claude/handoff/<tên-nhánh>.md` theo mẫu `Docs/claude/handoff/README.md`. Phiên local nhận nhánh sẽ đọc file đó, làm phần cần máy, chép vào log phiên trong vault và xoá file khi merge.

## Cuối mỗi phiên

- Có quyết định mới, bẫy mới, hay việc còn mở đổi đi thì cập nhật `Docs/claude/lessons.md` trong cùng nhánh (giữ ngắn, chỉ điều kỹ thuật, nhớ repo public).

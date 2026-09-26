# Coin · 离线端侧决策助手

把 [Laya](https://github.com/NandhaKishorM/laya)（System 1 决策模型）装进 Android 手机：**全程离线、不联网、不申请网络权限**。
输入一段文字 + 若干候选选项，模型在**单次前向传播**内直接给出决策结论与各选项概率——不做文本生成，因此没有幻觉，也不需要解析模型输出。

> Coin: an offline on-device decision assistant for Android.
> Laya (typed decisions) → ONNX int8 → onnxruntime-web (WASM) → React + Vite → Capacitor → APK.

> [!IMPORTANT]
> **本仓库只包含应用代码，不含模型权重**（单个文件最大 296 MB，超过 GitHub 100 MB 单文件上限）：
> 克隆后请按 [第 5 步](#5-准备-laya-模型本仓库不包含模型权重) 自备权重。
> 第三方组件的许可与署名义务见 **[CREDITS.md](CREDITS.md)**（含翻译模型 CC-BY-4.0 的署名要求）。

---

## 特性

- **完全离线**：模型与 WASM 运行时全部打包进 APK，装上之后开飞行模式照样用。APK 里唯一的权限是 AndroidX 自动添加的 `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`，**没有 INTERNET**。
- **端侧推理**：onnxruntime-web 走 WASM（强制），不依赖任何托管服务。
- **自定义决策问题**：自己填写待决策内容，并添加任意候选项（最多 8 个），模型给出选中项与每个选项的概率。
- **英文输入开关**：内置离线中英翻译模型（opus-mt-zh-en 量化版），可先把问题与选项翻成英文再送入 Laya 做对比；结论仍映射回你填写的中文选项展示。
- **10 套主题**：墨绿（默认）/ 暗夜蓝 / 石墨 / 暗紫 / 橄榄 / 深棕 / 曜黑 / 浅色 / 暖沙 / 樱粉，选择写入 localStorage，重启后保留且不会闪默认色。
- **移动端优先 UI**：固定顶栏与底部导航（仅内容区滚动）、卡片式选项输入、按钮底部 Loading 动效、结果卡片（结论 + 置信度 + 概率条）、一键重置、刘海屏安全区适配。

## 架构

```
┌──────────────────────────────────────────┐
│  Android APK（Capacitor 壳，无 Kotlin/Java）│
│  ┌────────────────────────────────────┐  │
│  │  React + Vite 界面（移动端优先）      │  │
│  └───────────────┬────────────────────┘  │
│                  │ import                 │
│  ┌───────────────▼────────────────────┐  │
│  │ laya-ts（官方 TS 推理库）             │  │
│  │ onnxruntime-web（WASM，强制）         │  │
│  └───────────────▲────────────────────┘  │
│                  │ 读取打包内的本地文件    │
│  │ encoder.onnx + head.onnx              │  │
│  │ tokenizer.json + rl_agent_config.json │  │
│  │ （英文模式另加 opus-mt-zh-en 量化模型） │  │
│  └───────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Python 只在「一次性导出 + 量化模型」时用到，运行时没有任何 Python；Android 侧不写 Kotlin/Java，全部是 Web 技术栈 + Capacitor 壳。

## 目录结构

```
.
├── src/
│   ├── lib/laya.ts          # 模型加载 + 决策调用（接口与预设问题封装）
│   ├── lib/translate.ts     # 离线中英翻译（transformers.js + 本地量化模型）
│   ├── lib/theme.ts         # 10 套主题的清单与持久化
│   ├── components/          # 首页 / 设置 / 底部导航 / 选项卡片 / 结果卡片
│   └── App.tsx              # 启动加载页 + 页面容器 + 底部导航
├── scripts/
│   ├── prepare-assets.mjs   # 一键准备大文件资源（运行时 + 翻译模型）
│   ├── postbuild.mjs        # 构建后删除重复的 ORT wasm（省约 85 MB）
│   └── laya-model/          # 模型导出后处理：int8 量化 / head 合并 / 精度验证
├── patches/                 # 上游 laya-ts 的必需补丁（见下）
├── public/                  # 大文件资源目录（不入库，用脚本准备）
└── android/                 # Capacitor 生成的 Android 工程
```

## 快速开始

### 前置条件

| 工具 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | 22+ | 构建与开发 |
| JDK | 21 | Capacitor 8 必需 |
| Android SDK | platform 36 + build-tools 36.0.0 | `compileSdk/targetSdk = 36`，`minSdk = 24` |
| Python | 3.12（可选） | 仅当需要自行导出/量化模型时 |

### 1. 拉代码

本仓库依赖上游 laya 仓库里的 `laya-ts`（以本地依赖 `file:../laya/laya-ts` 引入），所以两者要放在同级目录：

```bash
git clone <本仓库> laya-app
git clone https://github.com/NandhaKishorM/laya.git laya
```

### 2. 给上游 laya-ts 打补丁（**必需**）

上游 `laya-ts` 在浏览器路径上用的是 `import(/* @vite-ignore */ "onnxruntime-" + "web")`，打包器无法解析，页面会报
`Failed to resolve module specifier 'onnxruntime-web'`；并且它优先用 WebGPU，而这个模型在 WebGPU 上会因
`SkipLayerNormalization` kernel 报 `Beta must be 1D`（运行时错误，catch 不住，回退不了）。补丁做两件事：改成**静态 import** + **强制 WASM EP**。

```bash
cd laya
git apply ../laya-app/patches/laya-ts-static-ort-import.patch
cd laya-ts && npm install && npm run build   # laya-ts 需要重新编译出 dist
```

> 补丁若因行尾差异（CRLF/LF）应用失败，手动改两处即可：`laya-ts/src/providers.ts` 的
> `createWebProvider` 里把 `import(/* @vite-ignore */ "onnxruntime-" + "web")` 改成静态
> `import("onnxruntime-web")`，并把 encoder 会话的 `executionProviders` 固定为 `["wasm"]`。

### 3. 安装依赖

```bash
cd laya-app
npm install
# 国内网络建议：npm install --registry=https://registry.npmmirror.com
```

### 4. 准备大文件资源（约 590 MB，不入库）

```bash
npm run prepare:assets
```

脚本会做三件事：
1. `public/runtime/` ← 从 `node_modules/onnxruntime-web/dist` 复制 ORT 的 4 对 WASM 运行时（约 86 MB）；
2. `public/translate/opus-mt-zh-en/` ← 从 HF 镜像下载翻译模型量化版（约 116 MB，可用 `HF_ENDPOINT` 换源）；
3. 检查 `public/model/`（Laya 模型，约 386 MB）——没有就打印第 5 步的做法。

### 5. 准备 Laya 模型（本仓库不包含模型权重）

**为什么仓库里没有模型**：Laya 权重是 Apache-2.0，允许再分发，但量化后的 `encoder.onnx` 有 296 MB，远超 GitHub 单文件 100 MB 上限，而且它是可复现的一次性导出产物。所以本仓库只放应用代码，权重由使用者按下面任一方式自备。

需要这 4 个文件（**缺一不可、文件名不能改**，`laya-ts` 按固定名加载）：

| 文件 | 说明 | 参考大小 |
| --- | --- | --- |
| `encoder.onnx` | int8 动态量化后的编码器 | 295.6 MiB |
| `head.onnx` | 决策头（保留 FP32，合并为单文件） | 57.4 MiB |
| `tokenizer.json` | 分词器 | 32.8 MiB |
| `rl_agent_config.json` | 模型配置（max_len=1024 等） | 472 B |

**方式 A：从 HuggingFace 官方权重自行导出 + 量化（完整、可复现）**

```bash
# 1) Python 3.12 环境（ML 库暂无 3.14 的 wheel）
cd laya
py -3.12 -m venv .venv && .venv\Scripts\Activate.ps1     # Windows
# python3 -m venv .venv && source .venv/bin/activate     # macOS / Linux
python -m pip install --upgrade pip
pip install -e ".[onnx]" && pip install onnxscript       # torch 2.14 的新导出器需要 onnxscript

# 2) 导出 FP32 ONNX（约 1.23 GB，仅作量化输入；内存/磁盘紧张可跳过第 3 步的删除）
#    国内镜像 + 关掉 Xet：镜像不支持 Xet，不禁用会 401
export HF_ENDPOINT=https://hf-mirror.com
export HF_HUB_DISABLE_XET=1
#   PowerShell 里改用：$env:HF_ENDPOINT="https://hf-mirror.com"; $env:HF_HUB_DISABLE_XET="1"
python laya-ts/scripts/export_onnx.py \
  --repo convaiinnovations/laya --subfolder multilingual --out-dir ./model

# 3) int8 量化 + head 合并（两个脚本都在本仓库 scripts/laya-model/ 下，随仓库提供）
python ../laya-app/scripts/laya-model/quantize_int8.py --in-dir ./model --out-dir ./model-int8
python ../laya-app/scripts/laya-model/merge_head.py    --in-dir ./model --out-dir ./model-int8
```

**方式 B：复制已有的量化目录**

```bash
npm run prepare:assets -- --laya-dir /path/to/model-int8
```

**方式 C：把量化结果挂到 GitHub Release 分享给他人（可选，推荐）**

Release 附件单文件上限 2 GB，是大模型分发的标准做法。维护者上传一次，使用者一条命令取回：

```bash
# 维护者：打包并作为 release 附件上传（仓库仍然保持很小）
cd laya && tar -czf model-int8.tar.gz model-int8        # 约 386 MB

# 使用者：下载并铺到 public/model/
curl -L -o model.tar.gz https://github.com/<owner>/coin/releases/download/v1.0.0/model-int8.tar.gz
tar -xzf model.tar.gz && cp model-int8/encoder.onnx model-int8/head.onnx \
  model-int8/tokenizer.json model-int8/rl_agent_config.json laya-app/public/model/
```

> 再把权重挂到 Release 属于「再分发」：Laya 权重是 Apache-2.0，翻译模型是 CC-BY-4.0，
> 请保留 [CREDITS.md](CREDITS.md) 中的署名与许可说明。

**验证模型是否可用**：4 个文件放进 `public/model/` 后 `npm run dev`，页面上粘贴一句话 + 至少 2 个候选项，点「决策」能出结论与概率条即加载正确。想确认 int8 是否掉精度，可跑 `scripts/laya-model/verify-int8.mjs`（同一批用例对比 FP32 / int8 的决策一致性与概率差，目标：决策一致、概率差 ≤ 0.02）。


### 6. 开发与构建

```bash
npm run dev            # 浏览器开发预览
npm run build          # 生产构建（含 postbuild 清理重复 wasm）
npx cap copy android   # 把 dist 同步进 Android 工程
cd android && gradlew.bat assembleRelease
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

签名：把 `android/app/keystore.properties.example` 复制为 `keystore.properties` 并填入口令（该文件已被 `.gitignore` 排除，**不要提交**）。

## 关于体积

| 组成 | 大小 | 是否入库 |
| --- | --- | --- |
| `public/model/encoder.onnx`（int8） | 295.6 MiB | 否（脚本/自行导出） |
| `public/model/head.onnx`（FP32 合并单文件） | 57.4 MiB | 否 |
| `public/model/tokenizer.json` | 32.8 MiB | 否 |
| `public/translate/…/*.onnx`（量化） | 107.9 MiB | 否（脚本下载） |
| `public/runtime/ort-wasm-*.{wasm,mjs}` | 82 MiB | 否（脚本复制） |
| 前端源码 | < 1 MB | 是 |

因此仓库本身很小；克隆后跑一次 `npm run prepare:assets` 即可复原开发环境。最终 APK 约 **587 MB**（其中模型与运行时约占 570 MB）。

## 排坑记录

| 问题 | 原因 / 处理 |
| --- | --- |
| `Failed to resolve module specifier 'onnxruntime-web'` | 上游 laya-ts 用动态拼接 + `@vite-ignore` 的 import；`patches/` 里的补丁改静态 import 并重新编译 |
| WebGPU 报 `SkipLayerNormalization Beta must be 1D` | 运行时错误 catch 不住；补丁里强制 `executionProviders: ["wasm"]` |
| 模型加载超时 / 404 | `Agent.load()` 会把普通字符串当成 HuggingFace repo id，必须传**完整 URL**；`ort.env.wasm.wasmPaths` 同理要用绝对 URL |
| wasm 多实例导致 `wasmPaths` 不生效 | vite alias 把所有 `onnxruntime-web`（含 `/webgpu` 子路径）指向同一份副本；注意 alias 要按**具体子路径在前**排序，否则被拼成 `ort.mjs/webgpu` |
| 翻译模型报 `'_build_translation_inputs' in null` | transformers.js 的 `env.localModelPath` 必须是**路径**（`/translate/`），传 http 绝对 URL 会被 `_get_file_metadata` 的 `if (!isURL)` 跳过本地探测，导致 tokenizer 文件从不被加载 |
| dist 里多出约 85 MB | 打包器会把 `ort.mjs` 引用的 wasm 另存一份到 `assets/`；`scripts/postbuild.mjs` 删除（运行时实际从 `runtime/` 读） |
| 页面存储白涨约 294 MB | laya-ts 的 `fetchArrayBuffer` 是 network-first，会把模型再写一份到 CacheStorage 却永远读不到；本地资源不会 fetch 失败，故屏蔽 `caches.open` 让它退化为普通 fetch |
| 大 asset 读取异常 | `android/app/build.gradle` 里 `noCompress 'onnx','wasm','json'`；同时移除默认的 INTERNET 权限 |
| Gradle 下载失败 / 元数据损坏 | wrapper 换腾讯云镜像并把超时调到 120 s；仓库顺序官方 google()/mavenCentral() 放最前，国内镜像仅兜底 |
| `无效的源发行版：21` | Capacitor 8 需要 JDK 21，把 `JAVA_HOME` 指到 JDK 21 |
| `noul` 概率普遍偏低 | 模型校准特性；应把 noul 当「信号强度」而非严格 0/1 结论 |

## 已知限制

- **首启较慢**：约 353 MB 模型要从本地资源读入内存并建 WASM 会话，低端机需要数秒到十几秒，期间显示加载动画。
- **APK 很大（约 587 MB）**：不适合走 Google Play（单包上限 150 MB）；作为离线自用/内部分发没问题。
- **推理为 CPU/WASM**：无 GPU 加速，长文本会线性变慢；模型上下文 1024 token（超出会截断）。
- **英文模式依赖翻译模型**：翻译质量受 opus-mt-zh-en 限制，专业术语可能不准确；翻译与决策分两步，首次会多等一次模型加载。
- 决策结果是**建议**：这是 322M 的 RL 决策模型，请把它当作辅助信号，不要当作确定性结论。

## 许可与致谢

本项目代码以 **MIT** 许可发布，详见 [LICENSE](LICENSE)。

**第三方组件的许可与署名义务统一放在 [CREDITS.md](CREDITS.md)**（务必阅读：其中翻译模型是 CC-BY-4.0，再分发需署名）。

关于「只开源代码、不分发模型权重」：这是**完全合规**的做法——Apache-2.0 与 CC-BY-4.0 都只约束"再分发"行为，不强制你必须分发权重。但只要你对外分发的**产物**里包含了他人的权重（例如打包好的 APK、或挂到 Release 的量化模型），就要保留对应署名与许可说明。

特别感谢：

- [NandhaKishorM/laya](https://github.com/NandhaKishorM/laya) —— 本项目的核心，Apache-2.0
- [convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya) / [laya-multilingual](https://huggingface.co/convaiinnovations/laya-multilingual) —— 决策模型权重，Apache-2.0
- [Helsinki-NLP/opus-mt-zh-en](https://huggingface.co/Helsinki-NLP/opus-mt-zh-en) —— 中英翻译模型，**CC-BY-4.0**（本项目的英文模式使用其量化 ONNX 转换版）
- [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) 与 [huggingface/transformers.js](https://github.com/huggingface/transformers.js)、[ionic-team/capacitor](https://github.com/ionic-team/capacitor)

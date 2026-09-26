# CREDITS · 第三方许可与署名

> **务必阅读。** 本项目（Coin）自身代码以 MIT 许可发布，但它依赖、引用或打包分发了多个第三方项目、
> 模型权重与数据集，各自许可以下表为准。**分发本项目的产物（尤其是内含模型权重的 APK）时，请保留本文件。**

## 决策模型（Laya）

| 项目 | 许可 | 用途 |
| --- | --- | --- |
| [NandhaKishorM/laya](https://github.com/NandhaKishorM/laya) | Apache-2.0 | 核心：System 1 决策引擎与其 TS 推理库 `laya-ts`（本项目通过补丁修改了浏览器 provider） |
| [convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya) | Apache-2.0 | 模型权重（ModernBERT-large 基座） |
| [convaiinnovations/laya-multilingual](https://huggingface.co/convaiinnovations/laya-multilingual) | Apache-2.0（模型卡标注可商用） | 本项目实际使用的权重（mmBERT-base 基座，100+ 语言） |
| [answerdotai/ModernBERT](https://huggingface.co/answerdotai/ModernBERT-large) / [jhu-clsp/mmBERT](https://huggingface.co/jhu-clsp/mmBERT-base) | Apache-2.0 | 上述模型的基座 |

Apache-2.0 要求在再分发时保留许可证与 NOTICE，并说明修改过的文件。本项目对 `laya-ts` 的修改见
[`patches/laya-ts-static-ort-import.patch`](patches/laya-ts-static-ort-import.patch)（浏览器 provider 的 import 方式与执行后端）。

## 翻译模型（英文输入模式，可选功能）

| 项目 | 许可 | 用途 |
| --- | --- | --- |
| [Helsinki-NLP/opus-mt-zh-en](https://huggingface.co/Helsinki-NLP/opus-mt-zh-en) | **CC-BY-4.0** | 中→英翻译模型权重（MarianMT） |
| [Xenova/opus-mt-zh-en](https://huggingface.co/Xenova/opus-mt-zh-en) | 继承上游 CC-BY-4.0 | 上述模型的 ONNX 量化转换版，本项目下载使用的即此仓库产物 |

> **署名要求（CC-BY-4.0）**：再分发或使用该翻译模型时须注明来源与许可，直接链接到
> [Helsinki-NLP/opus-mt-zh-en](https://huggingface.co/Helsinki-NLP/opus-mt-zh-en)。
> 说明：本仓库**不包含**该模型文件（体积超 GitHub 限制，由 `scripts/prepare-assets.mjs` 在本地下载），
> 但打包出的 APK 内含其量化版本，因此分发的 APK 属于再分发，需保留本署名。

## 运行时与框架

| 项目 | 许可 | 用途 |
| --- | --- | --- |
| [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime)（onnxruntime-web） | MIT | WASM 推理运行时 |
| [huggingface/transformers.js](https://github.com/huggingface/transformers.js) | Apache-2.0 | 浏览器端翻译推理管线 |
| [facebook/react](https://github.com/facebook/react) / react-dom | MIT | 界面 |
| [ionic-team/capacitor](https://github.com/ionic-team/capacitor) | MIT | 把 Web 应用打包为 Android App |
| [vitejs/vite](https://github.com/vitejs/vite) | MIT | 构建工具 |
| [microsoft/TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | 语言与类型检查 |
| [oxc-project/oxlint](https://github.com/oxc-project/oxlint) | MIT | Lint |
| [prettier](https://github.com/prettier/prettier) 生态相关构建依赖 | MIT | 构建依赖 |

完整依赖树及各版本以 `package-lock.json` 为准。

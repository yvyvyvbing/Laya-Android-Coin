// Verify int8-quantized encoder against the FP32 original on the same inputs.
// Run from repo root:  node laya-ts/examples/verify-int8.mjs
import { Agent } from "../dist/index.js";

console.log("loading FP32 model ...");
const fp32 = await Agent.load("./model");
console.log("loading int8 model ...");
const int8 = await Agent.load("./model-int8");

const cases = [
  {
    text: "我三月份被重复扣款了，请今天就退款，否则我将取消订阅。",
    questions: {
      department: {
        type: "choice",
        instructions: "该由哪个部门处理？",
        criteria: {
          billing: "账单、付款、退款",
          technical: "故障、系统错误",
          other: "其他",
        },
      },
      churn: { type: "noul", instructions: "用户是否威胁取消或流失？" },
    },
  },
  {
    text: "The app crashes every time I open the settings screen.",
    questions: {
      department: {
        type: "choice",
        instructions: "Which department should handle this?",
        criteria: {
          billing: "invoices, payments, refunds",
          technical: "bugs, crashes, outages",
          other: "everything else",
        },
      },
    },
  },
  {
    text: "你们的套餐价格是多少？我想给 50 人的团队采购。",
    questions: {
      department: {
        type: "choice",
        instructions: "该由哪个部门处理？",
        criteria: {
          billing: "账单、付款",
          sales: "采购、新合同、报价",
          technical: "故障、系统错误",
          other: "其他",
        },
      },
      urgency: {
        type: "score",
        instructions: "紧急程度？",
        criteria: ["不急", "尽快", "阻塞"],
      },
    },
  },
];

let allMatch = true;
for (let i = 0; i < cases.length; i++) {
  const { text, questions } = cases[i];
  console.log("\n========== Case " + (i + 1) + ": " + text.slice(0, 30) + " ...");
  const r32 = await fp32.predict(text, questions);
  const r8 = await int8.predict(text, questions);

  for (const qid of Object.keys(questions)) {
    const a32 = r32.answers[qid];
    const a8 = r8.answers[qid];
    if (a32.choice !== undefined) {
      const p32 = a32.probs ? a32.probs[a32.choice] : undefined;
      const p8 = a8.probs ? a8.probs[a8.choice] : undefined;
      const same = a32.choice === a8.choice;
      if (!same) allMatch = false;
      console.log(
        `  [${qid}] FP32=${a32.choice}(${p32?.toFixed(4)})  int8=${a8.choice}(${p8?.toFixed(4)})  ${same ? "OK" : "*** MISMATCH ***"}`
      );
    } else if (a32.score !== undefined) {
      const diff = Math.abs(a32.score - a8.score);
      const ok = diff < 0.1;
      if (!ok) allMatch = false;
      console.log(`  [${qid}] FP32 score=${a32.score.toFixed(3)}  int8 score=${a8.score.toFixed(3)}  (diff ${diff.toFixed(3)}) ${ok ? "OK" : "*** CHECK ***"}`);
    } else if (a32.noul !== undefined) {
      const diff = Math.abs(a32.noul - a8.noul);
      const ok = diff < 0.05;
      if (!ok) allMatch = false;
      console.log(`  [${qid}] FP32 p(yes)=${a32.noul.toFixed(4)}  int8 p(yes)=${a8.noul.toFixed(4)}  (diff ${diff.toFixed(4)}) ${ok ? "OK" : "*** CHECK ***"}`);
    }
  }
}

console.log("\n========================================");
console.log(allMatch ? "int8 验证通过：所有决策与 FP32 一致。" : "int8 验证发现差异，请检查上方标记。");
process.exit(allMatch ? 0 : 1);

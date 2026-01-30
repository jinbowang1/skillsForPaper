/**
 * ask_user — 让 AI 能向用户提问并展示可选选项（方向键选取）
 *
 * 用户可以用方向键选择预设选项，也可以选择"自由输入"手动打字。
 * 按 Esc 取消。
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

interface OptionItem {
  label: string;
  description?: string;
}

type DisplayOption = OptionItem & { isCustom?: boolean };

interface AskUserDetails {
  question: string;
  options: string[];
  answer: string | null;
  wasCustom?: boolean;
}

const OptionSchema = Type.Object({
  label: Type.String({ description: "选项的显示文字" }),
  description: Type.Optional(Type.String({ description: "选项的补充说明" })),
});

const AskUserParams = Type.Object({
  question: Type.String({ description: "要问用户的问题" }),
  options: Type.Array(OptionSchema, {
    description: "给用户选择的选项列表，每个选项有 label 和可选的 description",
  }),
});

export default function askUser(pi: ExtensionAPI) {
  pi.registerTool({
    name: "ask_user",
    label: "Ask User",
    description:
      "向用户提问，展示可选选项让用户用方向键选取。适合需要用户做决策的场景（如选择研究方向、确认方案、选择投稿期刊等）。最后一个选项会自动加上「自由输入」。",
    parameters: AskUserParams,

    async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
      // 非交互模式 fallback
      if (!ctx.hasUI) {
        return {
          content: [{ type: "text", text: "当前为非交互模式，无法展示选择界面。请用户直接回复。" }],
          details: {
            question: params.question,
            options: params.options.map((o: OptionItem) => o.label),
            answer: null,
          } as AskUserDetails,
        };
      }

      if (params.options.length === 0) {
        return {
          content: [{ type: "text", text: "错误：没有提供选项" }],
          details: { question: params.question, options: [], answer: null } as AskUserDetails,
        };
      }

      // 追加「自由输入」选项
      const allOptions: DisplayOption[] = [
        ...params.options,
        { label: "自由输入...", isCustom: true },
      ];

      const result = await ctx.ui.custom<{ answer: string; wasCustom: boolean; index?: number } | null>(
        (tui, theme, _kb, done) => {
          let cursor = 0;
          let editMode = false;
          let cache: string[] | undefined;

          const editorTheme: EditorTheme = {
            borderColor: (s: string) => theme.fg("accent", s),
            selectList: {
              selectedPrefix: (t: string) => theme.fg("accent", t),
              selectedText: (t: string) => theme.fg("accent", t),
              description: (t: string) => theme.fg("muted", t),
              scrollInfo: (t: string) => theme.fg("dim", t),
              noMatch: (t: string) => theme.fg("warning", t),
            },
          };
          const editor = new Editor(tui, editorTheme);

          editor.onSubmit = (value: string) => {
            const trimmed = value.trim();
            if (trimmed) {
              done({ answer: trimmed, wasCustom: true });
            } else {
              editMode = false;
              editor.setText("");
              invalidate();
            }
          };

          function invalidate() {
            cache = undefined;
            tui.requestRender();
          }

          function handleInput(data: string) {
            if (editMode) {
              if (matchesKey(data, Key.escape)) {
                editMode = false;
                editor.setText("");
                invalidate();
                return;
              }
              editor.handleInput(data);
              invalidate();
              return;
            }

            if (matchesKey(data, Key.up)) {
              cursor = Math.max(0, cursor - 1);
              invalidate();
              return;
            }
            if (matchesKey(data, Key.down)) {
              cursor = Math.min(allOptions.length - 1, cursor + 1);
              invalidate();
              return;
            }

            if (matchesKey(data, Key.enter)) {
              const selected = allOptions[cursor];
              if (selected.isCustom) {
                editMode = true;
                invalidate();
              } else {
                done({ answer: selected.label, wasCustom: false, index: cursor + 1 });
              }
              return;
            }

            if (matchesKey(data, Key.escape)) {
              done(null);
            }
          }

          function render(width: number): string[] {
            if (cache) return cache;

            const lines: string[] = [];
            const add = (s: string) => lines.push(truncateToWidth(s, width));

            add(theme.fg("accent", "─".repeat(width)));
            add(theme.fg("text", ` ${params.question}`));
            lines.push("");

            for (let i = 0; i < allOptions.length; i++) {
              const opt = allOptions[i];
              const selected = i === cursor;
              const prefix = selected ? theme.fg("accent", "> ") : "  ";

              if (opt.isCustom && editMode) {
                add(prefix + theme.fg("accent", `${i + 1}. ${opt.label} ✎`));
              } else if (selected) {
                add(prefix + theme.fg("accent", `${i + 1}. ${opt.label}`));
              } else {
                add(`  ${theme.fg("text", `${i + 1}. ${opt.label}`)}`);
              }

              if (opt.description) {
                add(`     ${theme.fg("muted", opt.description)}`);
              }
            }

            if (editMode) {
              lines.push("");
              add(theme.fg("muted", " 请输入："));
              for (const line of editor.render(width - 2)) {
                add(` ${line}`);
              }
            }

            lines.push("");
            if (editMode) {
              add(theme.fg("dim", " Enter 提交 · Esc 返回"));
            } else {
              add(theme.fg("dim", " ↑↓ 选择 · Enter 确认 · Esc 取消"));
            }
            add(theme.fg("accent", "─".repeat(width)));

            cache = lines;
            return lines;
          }

          return {
            render,
            invalidate: () => { cache = undefined; },
            handleInput,
          };
        },
      );

      const simpleOptions = params.options.map((o: OptionItem) => o.label);

      if (!result) {
        return {
          content: [{ type: "text", text: "用户取消了选择" }],
          details: { question: params.question, options: simpleOptions, answer: null } as AskUserDetails,
        };
      }

      if (result.wasCustom) {
        return {
          content: [{ type: "text", text: `用户输入：${result.answer}` }],
          details: {
            question: params.question,
            options: simpleOptions,
            answer: result.answer,
            wasCustom: true,
          } as AskUserDetails,
        };
      }

      return {
        content: [{ type: "text", text: `用户选择了：${result.index}. ${result.answer}` }],
        details: {
          question: params.question,
          options: simpleOptions,
          answer: result.answer,
          wasCustom: false,
        } as AskUserDetails,
      };
    },

    // 调用时的展示
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("ask_user ")) + theme.fg("muted", args.question);
      const opts = Array.isArray(args.options) ? args.options : [];
      if (opts.length) {
        const labels = opts.map((o: OptionItem) => o.label);
        const numbered = [...labels, "自由输入..."].map((o, i) => `${i + 1}. ${o}`);
        text += `\n${theme.fg("dim", `  ${numbered.join(", ")}`)}`;
      }
      return new Text(text, 0, 0);
    },

    // 结果的展示
    renderResult(result, _options, theme) {
      const details = result.details as AskUserDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      if (details.answer === null) {
        return new Text(theme.fg("warning", "已取消"), 0, 0);
      }

      if (details.wasCustom) {
        return new Text(
          theme.fg("success", "✓ ") + theme.fg("muted", "(输入) ") + theme.fg("accent", details.answer),
          0, 0,
        );
      }
      const idx = details.options.indexOf(details.answer) + 1;
      const display = idx > 0 ? `${idx}. ${details.answer}` : details.answer;
      return new Text(theme.fg("success", "✓ ") + theme.fg("accent", display), 0, 0);
    },
  });
}

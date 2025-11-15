import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

const Markdown = ({ content = "", onChange }) => {
    const ref = useRef(null);
    const onChangeMarkdown = useRef(onChange);
    useEffect(() => {
        onChangeMarkdown.current = onChange;
    }, [onChange]);

    useEffect(() => {
        let editor;
        const timer = setTimeout(() => {
            editor = new Crepe({
                root: ref.current,
                defaultValue: content,
                features: {
                    block: {
                        softBreak: false // ❌ 禁用 <br>，Enter 直接分段
                    }
                }
            });
            editor.on((listener) => {
                // 监听文档变化
                listener.markdownUpdated((ctx, markdown, prevMarkdown) => {
                    // console.log("内容变化:", markdown);
                    // console.log("内容变化prev:", prevMarkdown);
                    onChangeMarkdown.current(markdown);
                });
            });
            editor = editor.create();
        }, 10);

        return () => {
            clearTimeout(timer);
            editor?.destroy?.();
        };
    }, [content]);
    return (
        <div ref={ref}></div>
    );
}
export default Markdown;
import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import "./markdown.css";

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
                
            });
            editor.on((listener) => {
                // 监听文档变化
                listener.markdownUpdated((ctx, markdown) => {
                    // console.log("内容变化:", markdown);
                    // console.log("内容变化prev:", prevMarkdown);
                    onChangeMarkdown.current(markdown);
                });
            });
            editor = editor.create();
        }, 100);

        return () => {
            clearTimeout(timer);
            editor?.destroy?.();
        };
    }, [content]);
    return (
        <div 
        className="crepe-root"
        style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
            }} ref={ref}></div>
    );
}
export default Markdown;
import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

const Markdown = ({ content = "", onChange }) => {
    const ref = useRef(null);
    useEffect(() => {
        let editor;
        const timer = setTimeout(() => {
            editor = new Crepe({
                root: ref.current,
                defaultValue: content,
            }).create();
        }, 0);

        return () => {
            clearTimeout(timer);
            editor?.destroy?.();
        };
    }, []);
    return (
        <div ref={ref}></div>
    );
}
export default Markdown;
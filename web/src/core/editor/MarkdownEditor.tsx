// MilkdownEditor.tsx
import { useEffect, useRef, useState } from 'react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import '@milkdown/theme-nord/style.css';

interface MilkdownEditorProps {
    content: string;
    onChange: (v: string) => void;
    keyBindings?: any[];
}

export default function MilkdownEditor({ content, onChange }: MilkdownEditorProps) {
    const ref = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        // Dynamically import Crepe to avoid TypeScript resolution issues
        import('@milkdown/crepe').then((mod: any) => {
            const Crepe = mod.Crepe;
            const CrepeFeature = mod.CrepeFeature;

            if (!Crepe) {
                setError('Crepe not found in @milkdown/crepe');
                setLoading(false);
                return;
            }

            const crepeConfig = {
                features: {
                    [CrepeFeature.CodeMirror]: true,
                    [CrepeFeature.ListItem]: true,
                    [CrepeFeature.LinkTooltip]: true,
                    [CrepeFeature.Cursor]: true,
                    [CrepeFeature.ImageBlock]: false,
                    [CrepeFeature.BlockEdit]: false,
                    [CrepeFeature.Toolbar]: false,
                    [CrepeFeature.Placeholder]: true,
                    [CrepeFeature.Table]: true,
                    [CrepeFeature.Latex]: false,
                    [CrepeFeature.TopBar]: false,
                    [CrepeFeature.AI]: false,
                },
            };

            const editor = new Crepe({
                ...crepeConfig,
                root: ref.current,
            });

            // Use listenerCtx to listen for markdown changes
            editor.action((ctx: any) => {
                const listenerManager = ctx.get(listenerCtx);
                listenerManager.markdownUpdated((_: any, markdown: string) => {
                    onChange(markdown);
                });
            });

            editor.create()
                .then(() => {
                    setLoading(false);
                    editorRef.current = editor;
                })
                .catch((err: Error) => {
                    setError(err.message);
                    setLoading(false);
                });
        });

        return () => {
            if (editorRef.current) {
                editorRef.current.destroy();
            }
        };
    }, []);

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
    }

    return <div ref={ref} data-crepe-root />;
}
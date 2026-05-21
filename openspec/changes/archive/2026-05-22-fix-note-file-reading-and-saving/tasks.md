## 1. Fix Filename Handling

- [ ] 1.1 Verify filename is correctly constructed as `nodeId-nodeName.md` in note/[id].tsx
- [ ] 1.2 Ensure fileName state is set before DocEditor renders

## 2. Fix Content Saving

- [ ] 2.1 Check if onChange is being called properly when content changes
- [ ] 2.2 Add debug logging to verify saveFile is being called
- [ ] 2.3 Ensure saveFile receives correct parameters (fileName, yamlValue, content, id)

## 3. Fix Markdown Format

- [ ] 3.1 Verify the markdown from Crepe's markdownUpdated is pure markdown
- [ ] 3.2 If HTML artifacts exist, investigate why and fix the source
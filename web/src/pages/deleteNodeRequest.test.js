// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildDeleteConfirmation, buildDeleteRequest } from './deleteNodeRequest';

describe('buildDeleteRequest', () => {
  it('requires confirmation even when the node has no children', () => {
    expect(buildDeleteRequest({
      nodeId: 'leaf-1',
      nodeName: 'Leaf Node',
      childCount: 0,
      grandParentId: 'parent-1',
      isRoot: false,
    })).toEqual({
      id: 'leaf-1',
      name: 'Leaf Node',
      childCount: 0,
      grandParentId: 'parent-1',
      isRoot: false,
      requiresChoice: false,
    });
  });

  it('marks branch nodes as requiring a delete mode choice', () => {
    expect(buildDeleteRequest({
      nodeId: 'branch-1',
      nodeName: 'Branch Node',
      childCount: 3,
      grandParentId: 'root-1',
      isRoot: false,
    })).toEqual({
      id: 'branch-1',
      name: 'Branch Node',
      childCount: 3,
      grandParentId: 'root-1',
      isRoot: false,
      requiresChoice: true,
    });
  });

  it('builds a final confirmation message for deleting only the current node', () => {
    expect(buildDeleteConfirmation({
      nodeName: 'Branch Node',
      mode: 'parent-only',
    })).toEqual({
      translationKey: 'dialogs.deleteNode.confirmParentOnly',
      values: { nodeName: 'Branch Node' },
    });
  });

  it('builds a final confirmation message for deleting the current node and its descendants', () => {
    expect(buildDeleteConfirmation({
      nodeName: 'Branch Node',
      mode: 'entire-tree',
    })).toEqual({
      translationKey: 'dialogs.deleteNode.confirmSubtree',
      values: { nodeName: 'Branch Node' },
    });
  });
});

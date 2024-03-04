import { TreeNode } from './treeNode';

export type Connection = {
  src: TreeNode;
  dest: TreeNode;
};
/**
 * LoverTree Branches all spawn directly from the root and are all
 * considered unique. Branches can spawn vast amounts of TreeNodes,
 * but are still considered the same Branch as long as all TreeNodes
 * ultimately spawn from the same Trunk node. A trunk node is a direct
 * descendant of the root node.
 */
export class Branch {
  // Root is the very origin of the tree
  readonly root: TreeNode;

  // Trunk is the root of the branch and directly peered to tree root.
  readonly trunk: TreeNode;

  // The entire branch, useful for containment checks
  readonly body = new Set<TreeNode>();

  // Tips are the TreeNodes at the edges
  readonly tips: TreeNode[] = [];

  /**
   * Connection options Map has connectable lover branches as keys.
   * The value lists node and counterpart pairs, any of which will
   * result in connecting this Branch to the lover Branch that is the key.
   */
  readonly connectionOptions = new Map<Branch, Connection[]>();

  constructor(params: { root: TreeNode; trunk: TreeNode }) {
    this.root = params.root;
    this.trunk = params.trunk;
  }
}

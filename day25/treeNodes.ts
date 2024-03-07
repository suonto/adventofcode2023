import { Hub } from './hub';

export abstract class TreeNode {
  // Self, the Hub of this node.
  readonly hub: Hub;

  abstract children: TreeNode[];

  constructor(hub: Hub) {
    this.hub = hub;
  }

  /**
   * @param forbidden set of nodes that are forbidden.
   *
   * Examples:
   * For adolescent trees, nodes within self or lover reach are forbidden.
   * For adult trees, nodes within self reach are only allowed if this trunk has
   * the least options out of the trunks that can reach it.
   */
  abstract grow(forbidden: Set<Hub>): void;

  is = (hub: Hub) => this.hub === hub;

  eq = (other: TreeNode) => this.hub === other.hub;

  leafs = (): TreeNode[] => {
    if (!this.children.length) {
      return [this];
    } else {
      const result: TreeNode[] = [];
      for (const child of this.children) {
        result.push(...child.leafs());
      }
      return result;
    }
  };
}

export class RootNode extends TreeNode {
  children: TrunkNode[] = [];

  grow() {
    for (const hub of this.hub.peers) {
      this.children.push(new TrunkNode({ root: this, hub }));
    }
  }
}

abstract class NonRoot extends TreeNode {
  children: BranchNode[] = [];

  // the hubs that can be reached and do not exist in the tree yet
  reach(forbidden: Set<Hub>): Hub[] {
    const result: Hub[] = [];

    for (const hub of this.hub.peers) {
      if (!forbidden.has(hub)) {
        result.push(hub);
      }
    }

    return result;
  }
}

export class TrunkNode extends NonRoot {
  // Root is the very origin of the tree
  readonly root: RootNode;

  constructor(params: { root: RootNode; hub: Hub }) {
    super(params.hub);
    this.root = params.root;
  }

  grow(forbidden: Set<Hub>): void {
    for (const hub of this.reach(forbidden)) {
      this.children.push(new BranchNode({ trunk: this, parent: this, hub }));
    }
  }
}

export class BranchNode extends NonRoot {
  // Trunk is directly peered to root
  readonly trunk: TrunkNode;

  // Parent node
  readonly parent: TrunkNode | BranchNode;

  constructor(params: {
    trunk: TrunkNode;
    hub: Hub;
    parent: TrunkNode | BranchNode;
  }) {
    super(params.hub);
    this.trunk = params.trunk;
    this.parent = params.parent;
  }

  grow(treeNodeSet: Set<Hub>): void {
    for (const hub of this.reach(treeNodeSet)) {
      this.children.push(
        new BranchNode({ trunk: this.trunk, parent: this, hub }),
      );
    }
  }
}

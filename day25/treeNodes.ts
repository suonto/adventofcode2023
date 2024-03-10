import debug from 'debug';
import { Hub } from './hub';

export abstract class TreeNode {
  // Self, the Hub of this node.
  readonly hub: Hub;

  abstract children: TreeNode[];

  constructor(hub: Hub) {
    hub.connected = false;
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
  abstract grow(forbidden: Set<Hub>, loverReach?: Set<Hub>): void;

  abstract get path(): TreeNode[];

  printPath(...args: Parameters<typeof Array.prototype.slice>): string {
    return `[${this.path
      .map((n) => n.hub.name)
      .slice(...args)
      .join(', ')}]`;
  }

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
  private d = debug('nodes:root');
  children: TrunkNode[] = [];

  // for RootNode, the only forbidden child is lover root
  grow(forbidden: Set<Hub>) {
    for (const hub of this.hub.peers.filter((h) => !forbidden.has(h))) {
      this.children.push(new TrunkNode({ root: this, hub }));
    }
    this.d(
      this.hub.name,
      'grew trunks',
      this.children.map((c) => c.hub.name),
    );
  }

  get path(): [RootNode] {
    return [this];
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
  private d = debug('nodes:trunk');
  // Root is the very origin of the tree
  readonly root: RootNode;

  constructor(params: { root: RootNode; hub: Hub }) {
    super(params.hub);
    this.root = params.root;
  }

  leafs: () => (TrunkNode | BranchNode)[];

  grow(forbidden: Set<Hub>): void {
    for (const hub of this.reach(forbidden)) {
      this.children.push(new BranchNode({ trunk: this, parent: this, hub }));
    }
    this.d(
      this.hub.name,
      'grew children',
      this.children.map((c) => c.hub.name),
    );
  }

  get path(): [RootNode, TrunkNode] {
    return [this.root, this];
  }
}

export class BranchNode extends NonRoot {
  // Trunk is directly peered to root
  readonly trunk: TrunkNode;

  private _path: [RootNode, TrunkNode, ...BranchNode[]];

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

  leafs: () => BranchNode[];

  get path() {
    if (this._path) return this._path;

    if (this.parent instanceof BranchNode) {
      this._path = [...this.parent.path, this];
    } else {
      this._path = [this.trunk.root, this.trunk, this];
    }
    return this._path;
  }
}

import debug from 'debug';
import { Hub } from './hub';

export const hubsToString = (hubs: Hub[]) => `[${hubs.map((h) => h.name)}]`;

export const nodesToString = (nodes: TreeNode[]) =>
  hubsToString(nodes.map((n) => n.hub));

export type Connection = {
  sourceNode: TreeNode;
  loverNode: TreeNode;
};

export const connectionToString = (conn: Connection) =>
  nodesToString([
    ...conn.sourceNode.path,
    ...[...conn.loverNode.path].reverse(),
  ]);

export abstract class TreeNode {
  protected abstract d: (...args: any) => void;

  // Self, the Hub of this node.
  readonly hub: Hub;

  abstract children: TreeNode[];

  constructor(hub: Hub) {
    this.hub = hub;
  }

  protected abstract child(hub: Hub): TreeNode;

  /**
   * @param forbidden set of nodes that are already in this tree.
   * @returns new child nodes.
   */
  grow(forbidden: Set<Hub>): TreeNode[] {
    const children: TreeNode[] = [];
    for (const hub of this.hub.peers.filter((h) => !forbidden.has(h))) {
      children.push(this.child(hub));
    }
    if (children.length) {
      this.children.push(...children);
      this.d(
        this.hub.name,
        'grew new children',
        children.map((c) => c.hub.name),
      );
    }

    return children;
  }

  abstract get path(): [RootNode, ...TreeNode[]];

  // Distance from root. For trunks dist is 1.
  get dist(): number {
    return this.path.length - 1;
  }

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
  protected d = debug('nodes:root');
  children: TrunkNode[] = [];

  protected child = (hub: Hub): TrunkNode => new TrunkNode({ root: this, hub });

  grow: (forbidden: Set<Hub>) => TrunkNode[];

  get path(): [RootNode] {
    return [this];
  }
}

abstract class NonRoot extends TreeNode {
  children: BranchNode[] = [];

  grow: (forbidden: Set<Hub>) => BranchNode[];
}

export class TrunkNode extends NonRoot {
  protected d = debug('nodes:trunk');

  // Root is the very origin of the tree
  readonly root: RootNode;

  constructor(params: { root: RootNode; hub: Hub }) {
    super(params.hub);
    this.root = params.root;
  }

  protected child = (hub: Hub): BranchNode =>
    new BranchNode({ trunk: this, parent: this, hub });

  leafs: () => (TrunkNode | BranchNode)[];

  get path(): [RootNode, TrunkNode] {
    return [this.root, this];
  }
}

export class BranchNode extends NonRoot {
  protected d = debug('nodes:branch');

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
    this._path = [...this.parent.path, this];
  }

  protected child = (hub: Hub): BranchNode =>
    new BranchNode({ trunk: this.trunk, parent: this, hub });

  leafs: () => BranchNode[];

  get path() {
    return this._path;
  }
}

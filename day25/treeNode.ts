import { Hub } from './hub';

export class TreeNode {
  // Root is the very origin of the tree
  readonly root: Hub;
  readonly isRoot: boolean;

  // Trunk is directly peered to root
  readonly trunk: Hub;
  readonly isTrunk: boolean;

  // Parent node
  private _parent?: Hub;

  // Self, the Hub of this node.
  readonly hub: Hub;

  children: TreeNode[] = [];

  constructor(params: { root: Hub; trunk: Hub; hub: Hub; parent?: Hub }) {
    this.root = params.root;
    this.trunk = params.trunk;
    this.hub = params.hub;
    this.isRoot = this.hub === this.root;
    this.isTrunk = this.hub === this.trunk;
    this.parent = params.parent;
  }

  set parent(parent: Hub | undefined) {
    if (!this.isRoot && !parent) {
      throw new Error(`Non-root TreeNode has no parent: ${this.hub.name}`);
    }
    this._parent = parent;
  }

  get parent(): Hub {
    if (!this._parent) {
      throw new Error(`Trying to get parent from the root: ${this.hub.name}`);
    }

    return this._parent;
  }

  childProspects = (withOut: Set<Hub>) =>
    this.hub.peers.filter((p) => !withOut.has(p));
}

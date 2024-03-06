import { Hub } from './hub';

export class TreeNode {
  // Self, the Hub of this node.
  readonly hub: Hub;

  constructor(hub: Hub) {
    this.hub = hub;
  }
}

export class RootNode extends TreeNode {
  children: TrunkNode[] = [];

  constructor(hub: Hub) {
    super(hub);
  }
}

export class TrunkNode extends TreeNode {
  // Root is the very origin of the tree
  readonly root: RootNode;

  children: BranchNode[] = [];

  constructor(params: { root: RootNode; hub: Hub }) {
    super(params.hub);
    this.root = params.root;
  }
}

export class BranchNode extends TreeNode {
  // Trunk is directly peered to root
  readonly trunk: TrunkNode;

  // Parent node
  readonly parent: TrunkNode | BranchNode;

  children: TreeNode[] = [];

  constructor(params: {
    trunk: TrunkNode;
    hub: Hub;
    parent: TrunkNode | BranchNode;
  }) {
    super(params.hub);
    this.trunk = params.trunk;
    this.parent = params.parent;
  }
}

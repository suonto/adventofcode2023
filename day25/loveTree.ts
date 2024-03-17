import debug from 'debug';
import { Hub } from './hub';
import {
  BranchNode,
  Connection,
  RootNode,
  TreeNode,
  TrunkNode,
  connectionHubs,
  connectionToString,
} from './treeNodes';

type TreePair = {
  source: SourceTree;
  lover: LoveTree;
};
/**
 * A LoveTree is a magical tree that grows in pairs.
 * It's the garden elfs favourite tree species.
 *
 * One of the trees in each pair is a SourceTree with a bit of extra magic.
 *
 * It's well known, that the trees are always multi-trunked. In other words,
 * they spawn multiple large branches directly from the root.
 *
 * The pair grows in turns. First one grows, then the other.
 * A branch never grows to a space where another branch can also grow.
 * Who knows, if that's a space where the lover grows in the future?
 *
 * The purpose of a lover tree pair is to first grow safely without
 * blocking self or the other.
 *
 * After growing, the trees extend the tips of their branches to meet in a free
 * space between them. The more branches meet, the better the embracement.
 *
 * By understanding these trees, we could perhaps understand the wires.
 * We just have to imagine each network hub to be an empty space in the forest.
 * Nature is so amazing. Always has a solution to everything.
 */
export class LoveTree {
  protected d = debug('tree:main');
  protected _lover: LoveTree;
  readonly root: RootNode;

  // All nodes in the tree. Map key hub is the hub of the node.
  readonly body = new Map<Hub, TreeNode>();

  // For TrunkNodes, keep count of how many distinct lover TrunkNodes they can connect to

  /**
   * The connections between the pair nodes.
   * conns is the same array for both trees.
   * If one modifies it, both see it.
   */
  readonly conns: Connection[];

  // protected, as LoveTrees cannot grow alone
  protected constructor(params: { root: Hub; conns: Connection[] }) {
    this.root = new RootNode(params.root);
    this.body.set(params.root, this.root);
    this.conns = params.conns;
  }

  // protected, as LoveTrees can only bind with a tree of LoveTree sub species
  protected bind(lover: LoveTree) {
    this._lover = lover;
    lover._lover = this;
  }

  connected(trunk: TrunkNode) {
    const dConnected = debug('tree:connected');
    for (const { sourceNode, loverNode } of this.conns) {
      if (sourceNode.path.at(1)?.eq(trunk) || loverNode.path.at(1)?.eq(trunk)) {
        dConnected(
          'Trunk',
          trunk.hub.name,
          'is part of',
          connectionToString({ sourceNode, loverNode }),
        );
        return true;
      }
    }
    return false;
  }

  get lover(): LoveTree {
    return this._lover;
  }

  get trunks(): TrunkNode[] {
    return [...this.root.children].filter((t) => !this.connected(t));
  }

  strip(trunk: TrunkNode): void {
    const dStrip = debug('tree:strip');

    dStrip(`Tree before strip\n${trunk.root.printTree()}`);
    let nodes: (TrunkNode | BranchNode)[] = [trunk];
    for (let node = nodes.shift(); node; node = nodes.shift()) {
      dStrip(
        this instanceof SourceTree ? 'SourceTree' : 'LoveTree',
        this.root.hub.name,
        'stripping',
        node.printPath(),
      );
      this.body.delete(node.hub);
      if (node instanceof TrunkNode) {
        node.root.children.delete(node);
      } else if (node instanceof BranchNode) {
        node.parent.children.delete(node);
      }
      nodes.push(...node.children);
    }
    dStrip(`Tree after strip\n${trunk.root.printTree()}`);
  }

  /**
   * Grow all branches up to exclusive maxDist (default= current max root dist + 1).
   * For clarity, trunk branch root dist is 1.
   *
   * Example: only root exists. Root dist is 0. Limit becomes 1. Grow trunks.
   *
   * Growing is complicated. After connections are made, branches are
   * stripped, which leaves more options for other branches.
   *
   * Grow all nodes at a certain distance, then increase distance.
   */
  grow(toMaxDist?: number): {
    growing: boolean;
    newConn: boolean;
    limit: number;
  } {
    const dGrow = debug('tree:grow');

    const closestFirst = [...this.body.values()].sort(
      (a, b) => a.dist - b.dist,
    );

    const maxDist = closestFirst.at(-1)!.dist + 1;
    const limit = Math.min(maxDist, toMaxDist ?? maxDist);

    const result = {
      growing: false,
      newConn: false,
      limit,
    };

    dGrow(
      this instanceof SourceTree ? 'SourceTree' : 'LoveTree',
      this.root.hub.name,
      'growing to max dist',
      limit,
    );
    for (let i = 0; i < limit; i++) {
      /**
       * Process all nodes that have dist i.
       * i=0 RootNodes
       * i=1 TrunkNodes
       * i=n BranchNodes
       */
      for (
        let node = closestFirst.shift();
        node?.dist === i;
        node = closestFirst.shift()
      ) {
        const forbidden = new Set([
          ...this.body.keys(),
          ...this.conns.flatMap((conn) => connectionHubs(conn)),
        ]);
        const newChildren = node.grow(forbidden);
        for (const child of newChildren) {
          this.body.set(child.hub, child);

          // At least one new child. Still growing.
          result.growing = true;

          const counterpart = this.lover.body.get(child.hub);
          if (counterpart) {
            result.newConn = true;
            if (this instanceof SourceTree) {
              this.connect({
                conn: {
                  sourceNode: node,
                  loverNode: counterpart,
                },
                at: child.hub,
              });
            } else {
              (this.lover as SourceTree).connect({
                conn: {
                  sourceNode: counterpart,
                  loverNode: node,
                },
                at: child.hub,
              });
            }
            return result;
          }
        }
      }
    }

    return result;
  }
}

export class SourceTree extends LoveTree {
  private constructor(params: { root: Hub; conns: Connection[] }) {
    super(params);
  }

  static createPair(params: { source: Hub; lover: Hub }): TreePair {
    // Both trees in the pair store the same ref to their mutual connections
    const conns: Connection[] = [];

    const source = new SourceTree({ root: params.source, conns });
    const lover = new LoveTree({ root: params.lover, conns });

    const pair: TreePair = {
      source,
      lover,
    };

    // Create the pair
    source.bind(lover);

    return pair;
  }

  connect(params: { conn: Connection; at: Hub }): void {
    const dConnect = debug('tree:connect');

    const { conn, at } = params;
    dConnect(`New conn: ${connectionToString(conn)}`);
    for (const node of [conn.sourceNode, conn.loverNode]) {
      const trunk = node.path.at(1);
      if (trunk instanceof TrunkNode) {
        if (this.connected(trunk)) {
          throw new Error(
            `Cannot connect ${connectionToString(conn)}. Trunk ${
              trunk.hub.name
            } of ${node.printPath()} is already connected.`,
          );
        }
        if (node === conn.sourceNode) {
          this.strip(trunk);
        } else {
          this.lover.strip(trunk);
        }
      }
    }

    const sourceAt = this.body.get(at);
    if (sourceAt instanceof TrunkNode || sourceAt instanceof BranchNode) {
      this.strip(sourceAt.path[1]);
    }

    const loverAt = this.lover.body.get(at);
    if (loverAt instanceof TrunkNode || loverAt instanceof BranchNode) {
      this.lover.strip(loverAt.path[1]);
    }

    this.conns.push(conn);
  }

  // connectAdjacentRoots() {
  //   const dConnectAdjacentRoots = debug('tree:connectAdjacentRoots');
  //   if (this.root.hub.peers.includes(this.lover.root.hub)) {
  //     const conn = { sourceNode: this.root, loverNode: this.lover.root };
  //     dConnectAdjacentRoots(connectionToString(conn));
  //     this.connect(conn);
  //   }
  // }

  // connectCommonTrunks() {
  //   const dConnectCommonTrunks = debug('tree:connectCommonTrunks');
  //   for (const trunk of this.trunks) {
  //     for (const loverTrunk of this.lover.trunks) {
  //       if (trunk.eq(loverTrunk)) {
  //         const conn = { sourceNode: trunk, loverNode: this.lover.root };
  //         dConnectCommonTrunks(connectionToString(conn));
  //         this.connect(conn);
  //         break;
  //       }
  //     }
  //   }
  // }
}

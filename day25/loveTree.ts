import debug from 'debug';
import { Hub } from './hub';
import { RootNode, TrunkNode } from './treeNodes';

export type Connection = Hub[];
export const connectionToString = (conn: Connection) =>
  `[${conn.map((h) => h.name)}]`;
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
  protected d = debug('tree');
  protected _lover: LoveTree;
  readonly root: RootNode;

  // All nodes in the tree
  readonly body = new Set<Hub>();

  // For TrunkNodes, keep count of how many distinct lover TrunkNodes they can connect to
  readonly connectionOptionsCounts = new Map<TrunkNode, number>();

  // protected, as LoveTrees cannot grow alone
  protected constructor(root: Hub) {
    this.root = new RootNode(root);
    this.root.grow();

    for (const trunk of this.root.children) {
      this.body.add(trunk.hub);
      this.connectionOptionsCounts.set(trunk, 0);
    }
  }

  // protected, as LoveTrees can only bind with a tree of LoveTree sub species
  protected bind(lover: LoveTree) {
    this._lover = lover;
    lover._lover = this;
  }

  get lover(): LoveTree {
    return this._lover;
  }

  get trunks(): TrunkNode[] {
    return this.root.children;
  }

  /**
   * @returns all reachable hubs that are not yet in this tree
   */
  reach(): Set<Hub> {
    const reach = new Set<Hub>();
    for (const node of this.root.leafs()) {
      if (!this.body.has(node.hub)) {
        reach.add(node.hub);
      }
    }

    return reach;
  }

  /**
   * Grow carefully without blocking branches from other trunks in this tree
   * or any branches in the lover tree.
   * Keep track of connectionOptionsCount for each TrunkNode.
   * Each growth increases AND reduces prospects.
   * Lover contacts immediately increase trunk scores.
   */
  adolescentGrow(): boolean {
    const dGrow = debug('tree:grow:adolescent');

    for (const trunk of this.connectionOptionsCounts.keys()) {
    }
    return true;
  }

  /**
   * More greedy than adolescent growth.
   * Grow TrunkNode with the lowest connectionOptionsCount until space
   * is exhausted. Ensure all options are resolved and connect to the
   * option with the lowest trunk connectionOptionsCount.
   */
  adultGrow(): boolean {
    const dGrow = debug('tree:grow:adolescent');
    const forbidden = new Set<Hub>([
      ...this.body,
      ...this.lover.body,
      // ...this.lover.reach(),
    ]);
    return true;
  }
}

export class SourceTree extends LoveTree {
  // Only the SourceTree in each pair keeps track of connections
  readonly connections: Connection[];
  readonly connected = new Set<Hub>();

  private constructor(root: Hub) {
    super(root);
  }

  static createPair(params: { source: Hub; lover: Hub }) {
    const root = new SourceTree(params.source);
    const lover = new LoveTree(params.lover);
    root.bind(lover);
  }

  private connect(connection: Connection): void {
    const nonRoot = connection.slice(1, -1);
    for (const hub of nonRoot) {
      if (this.connected.has(hub)) {
        throw new Error(`Hub ${hub.name} is already connected.`);
      }
    }
    this.d('New connection', connectionToString(connection));
    this.connections.push(connection);
    nonRoot.forEach((h) => this.connected.add(h));
  }

  connectAdjacentRoots() {
    if (this.root.hub.peers.includes(this.lover.root.hub)) {
      this.connect([this.root.hub, this.lover.root.hub]);
    }
  }

  connectCommonTrunks() {
    this.trunks
      .filter((t) => !this.lover.trunks.every((n) => t.eq(n)))
      .map((common) => {
        this.connectionOptionsCounts.delete(common);
        this.connect([this.root.hub, common.hub, this.lover.root.hub]);
      });
  }

  /**
   * For each branch in either tree,
   * all the lover branches that are just a touch away.
   *
   */
  // directContacts(): Map<Branch, Set<Branch>> {
  //   const dDirectContacts = debug('tree:directContacts');

  //   const result = new Map<Branch, Set<Branch>>();
  //   if (this.root.peers.includes(this.lover.root)) {
  //     dDirectContacts('Rejoice, for the roots are neighbours!');
  //     this.connect([this.root, this.lover.root]);
  //   }
  //   for (const branch of this.branches) {
  //     for (const peer of tip(branch).peers) {
  //       for (const loverBranch of this.lover.branches) {
  //         if (loverBranch.includes(peer)) {
  //           dDirectContacts(
  //             'branch',
  //             branch.map((h) => h.name),
  //             'can touch',
  //             peer.name,
  //             'in',
  //             loverBranch.map((h) => h.name),
  //           );
  //           for (const [current, counterpart] of [
  //             [branch, loverBranch],
  //             [loverBranch, branch],
  //           ]) {
  //             const val = result.get(current);
  //             if (val) {
  //               val.add(counterpart);
  //             } else {
  //               result.set(current, new Set([counterpart]));
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }

  //   dDirectContacts(
  //     'result',
  //     [...result.entries()].map(([branch, contacts]) => ({
  //       branch: printPath(branch),
  //       contacts: [...contacts].map((b) => printPath(b)),
  //     })),
  //   );
  //   return result;
  // }

  /**
   * Every point that is reachable by both trees
   * and the branches that could reach it.
   * TODO: fix, collecting roots and is wrong
   */
  // meetingPoints(): Map<Hub, ReachDetails> {
  //   const dMeetingPoints = debug('tree:meetingPoints');
  //   const points = new Map<Hub, ReachDetails>();
  //   for (const peer of this.root.peers) {
  //     const match = this.lover.root.peers.find((h) => h === peer);
  //     if (match) {
  //       dMeetingPoints(
  //         `Rejoice, as the roots have a common peer! ${peer.name}`,
  //       );
  //       this.connect([this.root, peer, this.lover.root]);
  //     }
  //   }
  //   const eligibleLoverBranches = this.lover.branches.filter((b) =>
  //     b.every((h) => !this.connected.has(h)),
  //   );
  //   for (const branch of this.branches.filter((b) =>
  //     b.every((h) => !this.connected.has(h)),
  //   )) {
  //     for (const loverBranch of eligibleLoverBranches) {
  //       for (const peer of tip(branch).peers) {
  //         if (
  //           !this.connected.has(peer) &&
  //           tip(loverBranch).peers.includes(peer)
  //         ) {
  //           dMeetingPoints(printPath(branch), printPath(loverBranch));
  //           const point = points.get(peer);
  //           if (!point) {
  //             const val = {
  //               source: new Set([branch]),
  //               lover: new Set([loverBranch]),
  //             };
  //             points.set(peer, val);
  //           } else {
  //             point.source.add(branch);
  //             point.lover.add(loverBranch);
  //           }
  //         }
  //       }
  //     }
  //   }
  //   for (const [hub, details] of points.entries()) {
  //     dMeetingPoints(hub.name, {
  //       source: [...details.source.keys()].map((b) => b.map((h) => h.name)),
  //       lover: [...details.lover.keys()].map((b) => b.map((h) => h.name)),
  //     });
  //   }
  //   return points;
  // }

  // options(params: {
  //   contacts: ReturnType<LoveTree['directContacts']>;
  //   meetingPoints: ReturnType<LoveTree['meetingPoints']>;
  // }): Map<Branch, Set<Branch>> {
  //   const dOptions = debug('tree:options');
  //   const { contacts, meetingPoints } = params;
  //   const filteredContacts = [...contacts.entries()].filter((e) =>
  //     [e[0], ...e[1]].every((b) => b.every((h) => !this.connected.has(h))),
  //   );

  //   const options = new Map<Branch, Set<Branch>>();

  //   for (const [branch, loverBranches] of filteredContacts) {
  //     for (const loverBranch of loverBranches) {
  //       const branchOptions = options.get(branch);
  //       if (!branchOptions) {
  //         options.set(branch, new Set<Branch>([loverBranch]));
  //       } else {
  //         branchOptions.add(loverBranch);
  //       }
  //     }
  //   }

  //   dOptions(
  //     [...options.entries()]
  //       .sort((a, b) => a[1].size - b[1].size)
  //       .map(([b, s]) => `${printPath(b)}: ${[...s].map((b) => printPath(b))}`),
  //   );

  //   for (const [point, { source, lover }] of meetingPoints.entries()) {
  //     for (const branch of source.keys()) {
  //       options.set(
  //         branch,
  //         new Set([...(options.get(branch) ?? new Set<Branch>()), ...lover]),
  //       );
  //     }
  //     for (const branch of lover.keys()) {
  //       options.set(
  //         branch,
  //         new Set([...(options.get(branch) ?? new Set<Branch>()), ...source]),
  //       );
  //     }
  //   }

  //   dOptions(
  //     [...options.entries()]
  //       .sort((a, b) => printPath(a[0]).localeCompare(printPath(b[0])))
  //       .map(
  //         ([b, s]) =>
  //           `${b.map((h) => h.name)}: ${[...s].map((b) => printPath(b))}`,
  //       ),
  //   );

  //   return options;
  // }
}

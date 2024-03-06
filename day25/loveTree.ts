import debug from 'debug';
import { Hub } from './hub';

export type Branch = Hub[];
type ReachDetails = { source: Set<Branch>; lover: Set<Branch> };

const tip = (branch: Branch): Hub => {
  const tip = branch.at(-1);
  if (!tip) throw new Error('Branch has no tip');
  return tip;
};

export const printPath = (b: Branch): string => `[${b.map((h) => h.name)}]`;

/**
 * A LoverTree is a magical tree that grows in pairs.
 * It's the garden elfs favourite tree species.
 *
 * The pair grows in turns. First one grows, then the other.
 * A branch never grows to a space where another branch can also grow.
 * Who knows, if that's a space where the lover grows in the future?
 *
 * The purpose of a lover tree pair is to first grow safely without
 * blocking self or the other.
 *
 * After growing, the trees extend the tips of their branches to meet in a free
 * space between them. The more unique branches meet, the better the embracement.
 *
 * By understanding these trees, we could perhaps understand the wires.
 * We just have to imagine each network hub to be an empty space in the forest.
 * Nature is so amazing. Always has a solution to everything.
 */
export class LoverTree {
  private _lover: LoverTree;
  readonly root: Hub;
  readonly connections: Hub[][] = [];
  readonly connected = new Set<Hub>();
  readonly occupies = new Set<Hub>();
  private readonly _branches: Branch[] = [];

  private constructor(params: { root: Hub; lover?: LoverTree }) {
    this.root = params.root;
    if (params.lover) {
      this._lover = params.lover;
    }
  }

  connect(hubs: Hub[]): void {
    const dConnect = debug('tree:connect');
    if (hubs.length < 2) {
      throw new Error(`Invalid connection of ${hubs.length} hubs`);
    } else if (this.root !== hubs.at(0) || this.lover.root !== hubs.at(-1)) {
      throw new Error(
        `Invalid start (${hubs.at(0)?.name}) or end ${hubs.at(-1)?.name}`,
      );
    } else if (new Set(hubs).size < hubs.length) {
      throw new Error('Invalid connection; contains duplicate hubs.');
    }
    const via = hubs.filter((h) => h !== this.root && h !== this.lover.root);
    for (const hub of via) {
      if (this.connected.has(hub)) {
        throw new Error(
          `Hub ${hub.name} is already connected. Connections: ${this.connections
            .map((c) => printPath(c))
            .join(', ')}`,
        );
      }
    }
    if (!this.connections.every((c) => printPath(c) !== printPath(hubs))) {
      throw new Error(`Connection ${printPath(hubs)} already exists.`);
    }
    via.forEach((hub) => {
      this.connected.add(hub);
      this.lover.connected.add(hub);
    });
    dConnect('New connection', printPath(hubs));
    this.connections.push(hubs);
    this.lover.connections.push([...hubs].reverse());
  }

  existing(branch: Branch): Branch | undefined {
    return this._branches.find(
      (b) =>
        JSON.stringify(b.map((h) => h.name)) ===
        JSON.stringify(branch.map((h) => h.name)),
    );
  }

  newBranch(branch: Branch): Branch {
    const existing = this.existing(branch);
    if (!existing) {
      branch.forEach((h) => this.occupies.add(h));
      this._branches.push(branch);
      return branch;
    }
    return existing;
  }

  private set lover(lover: LoverTree) {
    this._lover = lover;
  }

  get lover(): LoverTree {
    return this._lover;
  }

  get branches(): Branch[] {
    if (!this._branches.length) {
      for (const peer of this.root.peers) {
        if (![this.lover.root, ...this.lover.root.peers].includes(peer)) {
          this.newBranch([this.root, peer]);
        }
      }
    }
    return this._branches;
  }

  static createPair(params: { root: Hub; loverRoot: Hub }): {
    source: LoverTree;
    lover: LoverTree;
  } {
    const { root, loverRoot } = params;
    const sourceTree = new LoverTree({ root });
    const loverTree = new LoverTree({ root: loverRoot, lover: sourceTree });
    sourceTree.lover = loverTree;

    return { source: sourceTree, lover: loverTree };
  }

  addLover(lover: LoverTree): void {
    this.lover = lover;
  }

  /**
   * @returns for each hub in reach, branches that can reach it by growing
   */
  reach(): Map<Hub, Branch[]> {
    const reach = new Map<Hub, Branch[]>();

    for (const branch of this.branches) {
      for (const peer of tip(branch).peers) {
        if (!this.occupies.has(peer)) {
          reach.set(peer, [...(reach.get(peer) ?? []), branch]);
        }
      }
    }
    return reach;
  }

  grow(): boolean {
    const dGrow = debug('tree:grow');
    const reach = this.reach();
    const loverReach = this.lover.reach();
    const growths = new Map<Branch, number>();
    for (const [hub, branches] of reach.entries()) {
      if (
        branches.length === 1 &&
        !this.lover.occupies.has(hub) &&
        !loverReach.has(hub)
      ) {
        const branch = branches.at(0)!;
        const branchGrowth = (growths.get(branch) ?? 0) + 1;
        growths.set(branch, branchGrowth);
        if (branchGrowth === 1) {
          dGrow(
            branch.map((h) => h.name),
            'grew',
            hub.name,
          );
          this.occupies.add(hub);
          branch.push(hub);
        } else {
          const orig = branch.slice(0, -1);
          dGrow(
            orig.map((h) => h.name),
            'also grew',
            hub.name,
          );
          this.newBranch([...orig, hub]);
        }
      }
    }
    this._branches.sort((a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const result = a[i].name.localeCompare(b[i].name);
        if (result) return result;
      }
      return 0;
    });

    return growths.size > 0;
  }

  /**
   * For each branch in either tree,
   * all the lover branches that are just a touch away.
   *
   */
  directContacts(): Map<Branch, Set<Branch>> {
    const dDirectContacts = debug('tree:directContacts');

    const result = new Map<Branch, Set<Branch>>();
    if (this.root.peers.includes(this.lover.root)) {
      dDirectContacts('Rejoice, for the roots are neighbours!');
      this.connect([this.root, this.lover.root]);
    }
    for (const branch of this.branches) {
      for (const peer of tip(branch).peers) {
        for (const loverBranch of this.lover.branches) {
          if (loverBranch.includes(peer)) {
            dDirectContacts(
              'branch',
              branch.map((h) => h.name),
              'can touch',
              peer.name,
              'in',
              loverBranch.map((h) => h.name),
            );
            for (const [current, counterpart] of [
              [branch, loverBranch],
              [loverBranch, branch],
            ]) {
              const val = result.get(current);
              if (val) {
                val.add(counterpart);
              } else {
                result.set(current, new Set([counterpart]));
              }
            }
          }
        }
      }
    }

    dDirectContacts(
      'result',
      [...result.entries()].map(([branch, contacts]) => ({
        branch: printPath(branch),
        contacts: [...contacts].map((b) => printPath(b)),
      })),
    );
    return result;
  }

  /**
   * Every point that is reachable by both trees
   * and the branches that could reach it.
   * TODO: fix, collecting roots and is wrong
   */
  meetingPoints(): Map<Hub, ReachDetails> {
    const dMeetingPoints = debug('tree:meetingPoints');
    const points = new Map<Hub, ReachDetails>();
    for (const peer of this.root.peers) {
      const match = this.lover.root.peers.find((h) => h === peer);
      if (match) {
        dMeetingPoints(
          `Rejoice, as the roots have a common peer! ${peer.name}`,
        );
        this.connect([this.root, peer, this.lover.root]);
      }
    }
    const eligibleLoverBranches = this.lover.branches.filter((b) =>
      b.every((h) => !this.connected.has(h)),
    );
    for (const branch of this.branches.filter((b) =>
      b.every((h) => !this.connected.has(h)),
    )) {
      for (const loverBranch of eligibleLoverBranches) {
        for (const peer of tip(branch).peers) {
          if (
            !this.connected.has(peer) &&
            tip(loverBranch).peers.includes(peer)
          ) {
            dMeetingPoints(printPath(branch), printPath(loverBranch));
            const point = points.get(peer);
            if (!point) {
              const val = {
                source: new Set([branch]),
                lover: new Set([loverBranch]),
              };
              points.set(peer, val);
            } else {
              point.source.add(branch);
              point.lover.add(loverBranch);
            }
          }
        }
      }
    }
    for (const [hub, details] of points.entries()) {
      dMeetingPoints(hub.name, {
        source: [...details.source.keys()].map((b) => b.map((h) => h.name)),
        lover: [...details.lover.keys()].map((b) => b.map((h) => h.name)),
      });
    }
    return points;
  }

  options(params: {
    contacts: ReturnType<LoverTree['directContacts']>;
    meetingPoints: ReturnType<LoverTree['meetingPoints']>;
  }): Map<Branch, Set<Branch>> {
    const dOptions = debug('tree:options');
    const { contacts, meetingPoints } = params;
    const filteredContacts = [...contacts.entries()].filter((e) =>
      [e[0], ...e[1]].every((b) => b.every((h) => !this.connected.has(h))),
    );

    const options = new Map<Branch, Set<Branch>>();

    for (const [branch, loverBranches] of filteredContacts) {
      for (const loverBranch of loverBranches) {
        const branchOptions = options.get(branch);
        if (!branchOptions) {
          options.set(branch, new Set<Branch>([loverBranch]));
        } else {
          branchOptions.add(loverBranch);
        }
      }
    }

    dOptions(
      [...options.entries()]
        .sort((a, b) => a[1].size - b[1].size)
        .map(([b, s]) => `${printPath(b)}: ${[...s].map((b) => printPath(b))}`),
    );

    for (const [point, { source, lover }] of meetingPoints.entries()) {
      for (const branch of source.keys()) {
        options.set(
          branch,
          new Set([...(options.get(branch) ?? new Set<Branch>()), ...lover]),
        );
      }
      for (const branch of lover.keys()) {
        options.set(
          branch,
          new Set([...(options.get(branch) ?? new Set<Branch>()), ...source]),
        );
      }
    }

    dOptions(
      [...options.entries()]
        .sort((a, b) => printPath(a[0]).localeCompare(printPath(b[0])))
        .map(
          ([b, s]) =>
            `${b.map((h) => h.name)}: ${[...s].map((b) => printPath(b))}`,
        ),
    );

    return options;
  }
}
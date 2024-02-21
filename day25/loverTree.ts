import debug from 'debug';
import { Hub } from './hub';

type Branch = Hub[];
type ReachDetails = { source: Set<Branch>; lover: Set<Branch> };

const tip = (branch: Branch): Hub => {
  const tip = branch.at(-1);
  if (!tip) throw new Error('Branch has no tip');
  return tip;
};

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
  private readonly _branches: Branch[] = [];

  private constructor(params: { root: Hub; lover?: LoverTree }) {
    this.root = params.root;
    if (params.lover) {
      this._lover = params.lover;
    }
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
          this._branches.push([this.root, peer]);
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

  occupies(hub: Hub): boolean {
    return new Set<Hub>([this.root, ...this.branches.flat()]).has(hub);
  }

  /**
   * @returns for each hub in reach, branches that can reach it by growing
   */
  reach(): Map<Hub, Branch[]> {
    const reach = new Map<Hub, Branch[]>();

    for (const branch of this.branches) {
      for (const peer of tip(branch).peers) {
        if (!this.occupies(peer)) {
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
        !this.lover.occupies(hub) &&
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
          branch.push(hub);
        } else {
          const orig = branch.slice(0, -1);
          dGrow(
            orig.map((h) => h.name),
            'also grew',
            hub.name,
          );
          this._branches.push([...orig, hub]);
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

  directContacts(): Map<Branch, Branch[]> {
    const dDirectContacts = debug('tree:directContacts');

    const result = new Map<Branch, Branch[]>();
    if (this.root.peers.includes(this.lover.root)) {
      dDirectContacts('Rejoice, for the roots are neighbours!');
      result.set([this.root], [[this.lover.root]]);
    }
    for (const branch of this.branches) {
      for (const peer of tip(branch).peers) {
        for (const loverBranch of this.lover.branches) {
          if (loverBranch.includes(peer)) {
            dDirectContacts(
              'branch',
              branch.map((h) => h.name),
              'can touch branch',
              peer.name,
              'in',
              loverBranch.map((h) => h.name),
            );
            const val = result.get(branch);
            if (val) {
              val.push(loverBranch);
            } else {
              result.set(branch, [loverBranch]);
            }
          }
        }
      }
    }

    dDirectContacts(
      'result',
      [...result.entries()].map(([branch, contacts]) => ({
        branch: branch.map((h) => h.name),
        contacts: contacts.map((b) => `[ ${b.map((h) => h.name).join(', ')} ]`),
      })),
    );
    return result;
  }

  meetingPoints(): Map<Hub, ReachDetails> {
    const dMeetingPoints = debug('tree:meetingPoints');
    const points = new Map<Hub, ReachDetails>();
    for (const peer of this.root.peers) {
      for (const loverPeer of this.lover.root.peers) {
        if (peer === loverPeer) {
          dMeetingPoints(
            `Rejoice, as the roots have a common peer! ${peer.name}`,
          );
          points.set(peer, {
            source: new Set([[this.root]]),
            lover: new Set([[this.lover.root]]),
          });
        }
      }
    }
    for (const branch of this.branches) {
      for (const loverBranch of this.lover.branches) {
        for (const peer of tip(branch).peers) {
          if (tip(loverBranch).peers.includes(peer)) {
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
}

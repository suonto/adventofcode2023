import { Hub } from './hub';

export class TreePair {
  readonly source: Hub;
  readonly lover: Hub;

  private readonly sourceBody = new Set<Hub>();
  private readonly loverBody = new Set<Hub>();

  readonly connected: Set<Hub>;

  // All nodes in both trees
  treeNodes: Set<Hub>;

  constructor(params: { source: Hub; lover: Hub; connected: Set<Hub> }) {
    this.source = params.source;
    this.lover = params.lover;
    this.sourceBody.add(params.source);
    this.loverBody.add(params.lover);

    this.connected = params.connected;
  }

  private paths = (params: {
    paths: Map<Hub, Hub[]>;
    forbidden: Set<Hub>;
  }): Map<Hub, [Hub, ...Hub[]]> => {
    const { paths, forbidden } = params;
    const result = new Map<Hub, [Hub, ...Hub[]]>();
    for (const [hub, path] of paths.entries()) {
      for (const peer of hub.peers) {
        if (
          !this.connected.has(peer) &&
          !forbidden.has(peer) &&
          !paths.get(peer)
        ) {
          result.set(peer, [path[0], ...path.slice(1), hub]);
          break;
        }
      }
    }
    return result;
  };

  connect(params: {
    sourcePaths: Map<Hub, [Hub, ...Hub[]]>;
    loverPaths: Map<Hub, [Hub, ...Hub[]]>;
  }): [Hub, ...Hub[]] | undefined {
    const { sourcePaths, loverPaths } = params;
    for (const [sourceHub, sourcePath] of sourcePaths.entries()) {
      const loverPath = loverPaths.get(sourceHub);
      if (loverPath) {
        return [...sourcePath, ...[...loverPath].reverse()];
      }
    }
  }

  // growOneRound(sourcePaths: Map<Hub, [Hub, ...Hub[]]>;
  //   loverPaths: Map<Hub, [Hub, ...Hub[]]>;)

  grow = (params: {
    source: Hub;
    lover: Hub;
    connected: Set<Hub>;
  }): [Hub, ...Hub[]] | undefined => {
    const { source, lover, connected } = params;

    const result: [Hub, ...Hub[]] = [source];

    const sourceBody = new Set([source]);
    const loverBody = new Set([lover]);

    // Paths is a map with the current edge peers and the path
    let sourcePaths = new Map<Hub, [Hub, ...Hub[]]>([[source, [source]]]);
    let loverPaths = new Map<Hub, [Hub, ...Hub[]]>([[lover, [lover]]]);

    let connection = this.connect({ sourcePaths, loverPaths });
    if (connection) {
      return connection;
    }

    const round = () => {};
    sourcePaths = this.paths({
      paths: sourcePaths,
      forbidden: sourceBody,
    });
    connection = this.connect({ sourcePaths, loverPaths });
    if (connection) {
      return connection;
    }

    loverPaths = this.paths({
      paths: loverPaths,
      forbidden: loverBody,
    });
    connection = this.connect({ sourcePaths, loverPaths });
    if (connection) {
      return connection;
    }

    // [...newSourcePaths.keys()].forEach((p) => sourceBody.add(p));
    // const newLoverPaths = this.paths({
    //   paths: loverPaths,
    //   forbidden: loverBody,
    // });
    // [...newLoverPaths.keys()].forEach((p) => loverBody.add(p));
    // if
    // while (sourcePeers.size || loverPeers.size) {
    //   for (const sourcePeer of sourcePeers) {
    //     const loverPath = loverPaths.get(sourcePeer);
    //     if (loverPath) {
    //       return;
    //     }
    //   }
    //   sourcePeers = this.peers({
    //     hubs: new Set(sourcePaths.keys()),
    //     forbidden: sourceBody,
    //   });
    //   sourcePeers.forEach((p) => sourceBody.add(p));
    //   loverPeers = this.peers({
    //     hubs: new Set(loverPaths.keys()),
    //     forbidden: loverBody,
    //   });
    //   loverPeers.forEach((p) => loverBody.add(p));
    // }

    return undefined;
  };
}

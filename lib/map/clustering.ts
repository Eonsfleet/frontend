import Supercluster from "supercluster";

export interface ClusterPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface LeafNode {
  kind: "leaf";
  id: string;
  lat: number;
  lng: number;
}

export interface ClusterNode {
  kind: "cluster";
  id: string;
  lat: number;
  lng: number;
  count: number;
  /** Zoom level a click on this cluster should expand to. */
  expansionZoom: number;
}

export type ClusterOrLeaf = LeafNode | ClusterNode;

export interface ClusterBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Thin, provider-agnostic wrapper around `supercluster`. Both MapboxProvider
 * and LeafletProvider feed the same vehicle points through this and get back
 * plain leaf/cluster nodes — clustering behavior (and its perf characteristics)
 * is identical on both engines, and every leaf is always a real, individually
 * addressable point (never a proxied/clustered marker instance), which is what
 * lets the rAF motion loop keep writing directly to marker handles.
 */
export class ClusterEngine {
  private index: Supercluster<{ pointId: string }>;
  private ids: string[] = [];

  constructor(
    private options: { radius?: number; maxZoom?: number; minPoints?: number } = {},
  ) {
    this.index = new Supercluster({
      radius: options.radius ?? 60,
      maxZoom: options.maxZoom ?? 16,
      minPoints: options.minPoints ?? 3,
    });
  }

  load(points: ClusterPoint[]): void {
    this.ids = points.map((p) => p.id);
    this.index.load(
      points.map((p) => ({
        type: "Feature",
        properties: { pointId: p.id },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
    );
  }

  getClusters(bounds: ClusterBounds, zoom: number): ClusterOrLeaf[] {
    const raw = this.index.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.round(zoom),
    );

    return raw.map((feature): ClusterOrLeaf => {
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      const props = feature.properties as
        | { cluster: true; cluster_id: number; point_count: number }
        | { pointId: string };

      if ("cluster" in props) {
        return {
          kind: "cluster",
          id: `cluster-${props.cluster_id}`,
          lat,
          lng,
          count: props.point_count,
          expansionZoom: Math.min(
            this.index.getClusterExpansionZoom(props.cluster_id),
            this.options.maxZoom ?? 16,
          ),
        };
      }

      return {
        kind: "leaf",
        id: props.pointId,
        lat,
        lng,
      };
    });
  }
}


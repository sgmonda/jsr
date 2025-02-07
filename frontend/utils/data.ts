// Copyright 2024 the JSR authors. All rights reserved. MIT license.
import { Docs, Source, State } from "../util.ts";
import { APIResponse, path } from "./api.ts";
import {
  FullScope,
  Package,
  PackageDownloads,
  PackageVersionDocs,
  PackageVersionDocsRedirect,
  PackageVersionSource,
  PackageVersionWithUser,
  Scope,
  ScopeMember,
} from "./api_types.ts";

export async function packageData(
  state: State,
  scope: string,
  pkg: string,
): Promise<PackageData | null> {
  let [pkgResp, scopeMemberResp] = await Promise.all([
    state.api.get<Package>(path`/scopes/${scope}/packages/${pkg}`),
    state.api.hasToken()
      ? state.api.get<ScopeMember>(path`/user/member/${scope}`)
      : Promise.resolve(null),
  ]);
  if (!pkgResp.ok) {
    if (pkgResp.code === "scopeNotFound") return null;
    if (pkgResp.code === "packageNotFound") return null;
    throw pkgResp;
  }
  if (scopeMemberResp && !scopeMemberResp.ok) {
    if (scopeMemberResp.code === "scopeMemberNotFound") {
      scopeMemberResp = null;
    } else {
      if (scopeMemberResp.code === "scopeNotFound") return null;
      throw scopeMemberResp;
    }
  }

  return {
    pkg: pkgResp.data,
    scopeMember: scopeMemberResp?.data ?? null,
  };
}

export interface PackageData {
  pkg: Package;
  scopeMember: ScopeMember | null;
}

export async function packageDataWithVersion(
  state: State,
  scope: string,
  pkg: string,
  version: string | undefined,
) {
  let [data, pkgVersionResp] = await Promise.all([
    packageData(state, scope, pkg),
    state.api.get<PackageVersionWithUser>(
      path`/scopes/${scope}/packages/${pkg}/versions/${version || "latest"}`,
    ) as Promise<APIResponse<PackageVersionWithUser> | null>,
  ]);
  if (data === null) return null;

  if (pkgVersionResp && !pkgVersionResp.ok) {
    if (pkgVersionResp.code === "packageVersionNotFound") {
      if (!version) {
        pkgVersionResp = null; // no versions published yet, or all yanked
      } else {
        return null;
      }
    } else {
      if (pkgVersionResp.code === "scopeNotFound") return null;
      if (pkgVersionResp.code === "packageNotFound") return null;
      throw pkgVersionResp;
    }
  }

  return {
    ...data,
    selectedVersion: pkgVersionResp?.data ?? null,
    selectedVersionIsLatestUnyanked: !version && pkgVersionResp !== null,
  };
}

export async function packageDataWithDocs(
  state: State,
  scope: string,
  pkg: string,
  version: string | undefined,
  docs: { all_symbols: "true" } | { entrypoint?: string; symbol?: string },
): Promise<PackageVersionDocsRedirect | DocsData | null> {
  let [data, pkgDocsResp, downloadsResp] = await Promise.all([
    packageData(state, scope, pkg),

    state.api.get<PackageVersionDocs>(
      path`/scopes/${scope}/packages/${pkg}/versions/${
        version || "latest"
      }/docs`,
      docs,
    ) as Promise<APIResponse<PackageVersionDocs> | null>,

    state.api.get<PackageDownloads>(
      path`/scopes/${scope}/packages/${pkg}/downloads`,
    ) as Promise<APIResponse<PackageDownloads> | null>,
  ]);
  if (data === null) return null;

  const downloadsData = downloadsResp && ("data" in downloadsResp)
    ? downloadsResp.data
    : null;
  const downloads = toTimelines(downloadsData);
  console.log("RAW", (downloadsResp as any).data);

  if (pkgDocsResp && !pkgDocsResp.ok) {
    if (pkgDocsResp.code === "packageVersionNotFound") {
      if (!version) {
        pkgDocsResp = null; // no versions published yet, or all yanked
      } else {
        return null;
      }
    } else {
      if (pkgDocsResp.code === "scopeNotFound") return null;
      if (pkgDocsResp.code === "packageNotFound") return null;
      if (pkgDocsResp.code === "entrypointOrSymbolNotFound") return null;
      throw pkgDocsResp;
    }
  }

  if (pkgDocsResp === null) {
    return {
      ...data,
      downloads,
      kind: "content",
      selectedVersion: null,
      selectedVersionIsLatestUnyanked: false,
      docs: null,
    };
  } else if (pkgDocsResp?.data.kind == "redirect") {
    return pkgDocsResp!.data;
  } else {
    return {
      ...data,
      downloads,
      kind: "content",
      selectedVersion: pkgDocsResp!.data.version,
      selectedVersionIsLatestUnyanked: !version,
      docs: {
        css: pkgDocsResp.data.css,
        comrakCss: pkgDocsResp.data.comrakCss,
        script: pkgDocsResp.data.script,
        breadcrumbs: pkgDocsResp.data.breadcrumbs,
        toc: pkgDocsResp.data.toc,
        main: pkgDocsResp.data.main,
      },
    };
  }
}

export type Timeline = Array<{ date: Date; value: number }>;
export type DownloadTimelines = Record<string | "total", Timeline>;

const toTimelines = (
  data: PackageDownloads | null,
): DownloadTimelines => {
  console.log("TO TIMELINE", data);
  return {
    current: [
      { date: new Date("2024-10-03T00:00:00.000Z"), value: 30 },
      { date: new Date("2024-10-04T00:00:00.000Z"), value: 40 },
      { date: new Date("2024-10-05T00:00:00.000Z"), value: 50 },
      { date: new Date("2024-10-06T00:00:00.000Z"), value: 60 },
      { date: new Date("2024-10-07T00:00:00.000Z"), value: 30 },
      { date: new Date("2024-10-08T00:00:00.000Z"), value: 80 },
      { date: new Date("2024-10-09T00:00:00.000Z"), value: 76 },
      { date: new Date("2024-10-10T00:00:00.000Z"), value: 20 },
    ],
    "0.1.2": [
      { date: new Date("2024-10-03T00:00:00.000Z"), value: 10 },
      { date: new Date("2024-10-04T00:00:00.000Z"), value: 90 },
      { date: new Date("2024-10-05T00:00:00.000Z"), value: 30 },
      { date: new Date("2024-10-06T00:00:00.000Z"), value: 40 },
      { date: new Date("2024-10-07T00:00:00.000Z"), value: 30 },
      { date: new Date("2024-10-08T00:00:00.000Z"), value: 10 },
      { date: new Date("2024-10-09T00:00:00.000Z"), value: 26 },
      { date: new Date("2024-10-10T00:00:00.000Z"), value: 90 },
    ],
  };
};

export interface DocsData extends PackageData {
  kind: "content";
  selectedVersion: PackageVersionWithUser | null;
  selectedVersionIsLatestUnyanked: boolean;
  docs: Docs | null;
  downloads: DownloadTimelines | null;
}

export async function packageDataWithSource(
  state: State,
  scope: string,
  pkg: string,
  version: string,
  sourcePath: string,
) {
  let [data, pkgSourceResp] = await Promise.all([
    packageData(state, scope, pkg),
    state.api.get<PackageVersionSource>(
      path`/scopes/${scope}/packages/${pkg}/versions/${version}/source`,
      { path: sourcePath },
    ) as Promise<APIResponse<PackageVersionSource> | null>,
  ]);
  if (data === null) return null;

  if (pkgSourceResp && !pkgSourceResp.ok) {
    if (pkgSourceResp.code === "packageVersionNotFound") {
      if (!version) {
        pkgSourceResp = null; // no versions published yet, or all yanked
      } else {
        return null;
      }
    } else {
      if (pkgSourceResp.code === "scopeNotFound") return null;
      if (pkgSourceResp.code === "packageNotFound") return null;
      if (pkgSourceResp.code === "packagePathNotFound") return null;
      throw pkgSourceResp;
    }
  }

  return {
    ...data,
    selectedVersion: pkgSourceResp!.data.version,
    selectedVersionIsLatestUnyanked: !version && pkgSourceResp !== null,
    source: pkgSourceResp
      ? ({
        css: pkgSourceResp.data.css,
        comrakCss: pkgSourceResp.data.comrakCss,
        script: pkgSourceResp.data.script,
        source: pkgSourceResp.data.source,
      } satisfies Source)
      : null,
  };
}

export async function scopeData(
  state: State,
  scope: string,
) {
  const scopeResp = await state.api.get<Scope | FullScope>(
    path`/scopes/${scope}`,
  );
  if (!scopeResp.ok) {
    if (scopeResp.code === "scopeNotFound") return null;
    throw scopeResp;
  }
  return {
    scope: scopeResp.data,
  };
}

export async function scopeDataWithMember(
  state: State,
  scope: string,
) {
  let [data, scopeMemberResp] = await Promise.all([
    scopeData(state, scope),
    state.api.hasToken()
      ? state.api.get<ScopeMember>(path`/user/member/${scope}`)
      : Promise.resolve(null),
  ]);
  if (data === null) return null;
  if (scopeMemberResp && !scopeMemberResp.ok) {
    if (scopeMemberResp.code === "scopeMemberNotFound") {
      scopeMemberResp = null;
    } else {
      if (scopeMemberResp.code === "scopeNotFound") return null;
      throw scopeMemberResp;
    }
  }
  return {
    ...data,
    scopeMember: scopeMemberResp?.data ?? null,
  };
}

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The code the integration test sessions share. The sessions attach to
// Freelens started with `pnpm dev` from a freelensapp/freelens checkout, over
// the Chrome DevTools Protocol port that script opens, and drive its renderer
// with Playwright. Its name does not match `*.tests.ts`, so Vitest does not
// collect it as a test file.

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";

import type { Browser, ConsoleMessage, Frame, Locator, Page } from "playwright";

export const extensionName = "@freelensapp/kamaji-extension";

// The root of this checkout, which the sessions install in place.
const extensionDir = path.resolve(import.meta.dirname, "..", "..");

// The CDP endpoint of Freelens dev: `pnpm dev` of Freelens starts Electron
// with `--remoteDebuggingPort 9223`.
const cdpUrl = process.env.FREELENS_CDP_URL || "http://127.0.0.1:9223";

// The log of the main process, which CDP does not carry: the output of
// `pnpm dev` of Freelens, or its `lens.log`. Without it only the renderer's
// errors are checked.
const mainLogFile = process.env.FREELENS_MAIN_LOG;

// The kind cluster the sessions run against.
export const kindClusterName = process.env.TEST_KIND_CLUSTER_NAME || "kind";

// The release of Kamaji whose CRDs the sessions install, from `charts/kamaji/crds` at its tag. The `kamaji-crds` chart
// follows the main branch of Kamaji rather than a release, so the sessions take the files of the tag.
export const kamajiRelease = "26.10.5-edge";

// The plurals of the CRDs of Kamaji, all in the group kamaji.clastix.io.
const kamajiCrdPlurals = ["datastores", "kubeconfiggenerators", "tenantcontrolplanes"];

const kamajiCrdNames = kamajiCrdPlurals.map((plural) => `${plural}.kamaji.clastix.io`);

const kamajiCrdUrl = (plural: string) =>
  `https://raw.githubusercontent.com/clastix/kamaji/${kamajiRelease}/charts/kamaji/crds/kamaji.clastix.io_${plural}.yaml`;

// The test objects, with the namespaces they create: two for the tenants, and kamaji-system for the Secrets of the
// DataStores.
const fixturesDir = path.join(extensionDir, "integration", "fixtures");

export const tenantNamespaces = ["kamaji-tenants", "kamaji-dev"];

const fixtureNamespaces = [...tenantNamespaces, "kamaji-system"];

// The package name with `@` dropped and `/` turned into `--`
// (`sanitizeExtensionName` in Freelens's `lens-extension.ts`).
const sanitizedExtensionId = extensionName.replace("@", "").replace("/", "--");

// The links inside the sidebar items of the extension: the `clusterPageMenus` id, after the sanitized package name.
// Only the link navigates.
const sidebarLinkTestId = (menuId: string) => `link-for-sidebar-item-${sanitizedExtensionId}-${menuId}`;

const pageMenuIds = {
  tenants: "kamaji-tenants-menu",
  datastores: "kamaji-datastores-menu",
};

const viewTimeout = { timeout: 60 * 1000 };

const ansiEscapePattern = /\u001b\[[0-9;]*m/g;

// The Kubernetes proxy of Freelens logs a request that the renderer aborts as
// an error. Freelens dev renders in React.StrictMode, which mounts every view
// twice and aborts the requests of the first mount, so the line comes and goes
// with the timing of a run. It names no request, and says nothing about the
// extension.
const abortedProxyRequestPattern = /proxy_server\.go:\d+\] Error while proxying request: context canceled$/;

// Freelens dev serves the renderer's modules from the Vite dev server through
// a route of its main process, which logs a request that fails as a warning:
// its keep-alive agent at times reuses a socket that the dev server is closing,
// and the request fails with ECONNRESET. The route answers it with a 502, which
// Chromium logs as "Failed to load resource"; such an error is left out when
// the main log has the failed request for its URL. When the module belongs to
// Monaco's editor worker, which a YAML view starts, the worker does not load,
// and Monaco rethrows its `error` event, an `Event` without a stack. Such a
// page error is left out when the main log has a failed request. When the
// module belongs to the cluster frame, the frame does not render, and
// `openKindCluster` loads it again. None of it says anything about the
// extension.
const devFileRouteFailurePattern = /\[DEV-FILE-ROUTE\]: request for (\S+) failed: /;

const badGatewayPattern = /^Failed to load resource: the server responded with a status of 502\b/;

/** The path of a URL, without its query, as the dev file route logs it. */
const urlPath = (url: string) => (URL.canParse(url) ? new URL(url).pathname : url.replace(/[?#].*$/, ""));

/**
 * A connection to Freelens dev, with the errors that either process logs.
 */
export interface AppSession {
  browser: Browser;
  /** The root frame's page, where the catalog, the extensions and the preferences render. */
  window: Page;
  /** The errors logged so far. */
  errors(): string[];
  /** The paths of the requests that the dev file route failed so far, in order, one entry per failure. */
  devFileRouteFailures(): string[];
  /** Stops collecting errors; returns every error logged until then. */
  stopCollecting(): Promise<string[]>;
  /** Stops collecting errors, unless stopped already, and closes the connection; returns every error collected. */
  close(): Promise<string[]>;
}

/**
 * Whether Freelens dev answers on its CDP endpoint and the kind cluster is
 * reachable. Outside CI a session skips with a warning otherwise; in CI the
 * run fails, so that a mistake in the workflow does not turn into a silent
 * skip.
 */
export async function appReady({ cluster }: { cluster: boolean }): Promise<boolean> {
  let reason: string | undefined;

  try {
    const response = await fetch(new URL("/json/version", cdpUrl), { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      reason = `${cdpUrl} answered ${response.status}`;
    }
  } catch (error) {
    reason = `Freelens dev does not answer on ${cdpUrl}: ${error instanceof Error ? error.message : error}`;
  }

  if (!reason && cluster) {
    if (spawnSync("kubectl", ["--context", `kind-${kindClusterName}`, "get", "--raw", "/readyz"]).status !== 0) {
      reason = `the kind cluster ${kindClusterName} is not reachable`;
    }
  }

  if (!reason) {
    return true;
  }

  if (process.env.CI) {
    throw new Error(`Cannot run the integration tests: ${reason}`);
  }

  console.warn(`Skipping the integration tests: ${reason}`);

  return false;
}

/**
 * Describes the arguments of a console message, read in the page: an `Error`
 * by its stack, an `ErrorEvent` by its message, location and error, another
 * `Event` by its type and target, anything else as JSON.
 */
async function describeConsoleArgs(msg: ConsoleMessage): Promise<string> {
  const descriptions = await Promise.all(
    msg.args().map((arg) =>
      arg
        .evaluate((value) => {
          if (value instanceof Error) {
            return value.stack ?? `${value.name}: ${value.message}`;
          }

          if (value instanceof ErrorEvent) {
            const stack = value.error instanceof Error ? ` ${value.error.stack}` : "";

            return `${value.type} event: ${value.message} (${value.filename}:${value.lineno}:${value.colno})${stack}`;
          }

          if (value instanceof Event) {
            return `${value.type} event of ${value.target?.constructor.name ?? "no target"}`;
          }

          try {
            return JSON.stringify(value) ?? String(value);
          } catch {
            return String(value);
          }
        })
        .catch((error) => `<argument not readable: ${error instanceof Error ? error.message : error}>`),
    ),
  );

  // A message of the browser itself, such as a resource or a worker that
  // failed to load, has no arguments; its time ties it to the main log.
  return descriptions.length
    ? descriptions.join(" ")
    : `<empty message without arguments, at ${new Date(msg.timestamp()).toISOString()}>`;
}

/**
 * Collects the errors of the renderer's console, of every frame, and the
 * lines of the main log written after the session started.
 */
function collectErrors(window: Page) {
  const errorLogs: string[] = [];
  const pendingDescriptions: Promise<void>[] = [];
  // The thrown `Event`s, kept apart until the main log tells whether the dev
  // file route failed a request.
  const workerLoadErrors: string[] = [];
  // The 502s, kept apart until the main log tells whether the dev file route
  // failed the request for their URL.
  const badGatewayErrors: { path: string; text: string }[] = [];
  // The paths of the requests that the dev file route failed.
  const devFileRouteFailures: string[] = [];
  let mainLogOffset = mainLogFile && fs.existsSync(mainLogFile) ? fs.statSync(mainLogFile).size : 0;

  // Chromium logs every response that is not a success as "Failed to load
  // resource", whose text has no URL, so the location of the message is added.
  // The text of a message is the preview of its arguments: the class name of
  // an object, such as `ErrorEvent`, or nothing at all. Such a message is
  // described from its arguments, read from the page after the event, and
  // `settle()` waits for that. A message of a worker names the worker.
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      const { url, lineNumber, columnNumber } = msg.location();
      const worker = msg.worker();
      const location = `${url ? ` (${url}:${lineNumber}:${columnNumber})` : ""}${worker ? ` (worker ${worker.url()})` : ""}`;
      const text = msg.text().replaceAll(ansiEscapePattern, "");

      if (url && badGatewayPattern.test(text)) {
        badGatewayErrors.push({ path: urlPath(url), text: `[renderer] ${text}${location}` });

        return;
      }

      const index = errorLogs.push(`[renderer] ${text}${location}`) - 1;

      if (!text.trim() || /^[A-Z]\w*$/.test(text)) {
        pendingDescriptions.push(
          describeConsoleArgs(msg).then((description) => {
            errorLogs[index] = `[renderer] ${description}${location}`;
          }),
        );
      }
    }
  };

  // Playwright gives an uncaught value that is not an `Error`, such as an
  // `Event`, an empty stack and its description as the message, so such an
  // error is described by its name and message, and its time ties it to the
  // main log.
  const onPageError = (error: Error) => {
    if (error.stack) {
      errorLogs.push(`[renderer] ${error.stack}`);

      return;
    }

    const description = [error.name, error.message].filter(Boolean).join(": ") || "<empty>";
    const text = `[renderer] uncaught ${description} without a stack, at ${new Date().toISOString()}`;

    if (error.message === "Event" && !error.name) {
      workerLoadErrors.push(text);
    } else {
      errorLogs.push(text);
    }
  };

  // A line of the main log starts with its level, in the file and on the
  // console alike, after the task prefix that turbo adds to the output of
  // `pnpm dev` when it streams it (`freelens:dev: `).
  const readMainLog = () => {
    if (!mainLogFile || !fs.existsSync(mainLogFile)) {
      return;
    }

    const size = fs.statSync(mainLogFile).size;

    // A rotated log starts again from the beginning.
    if (size < mainLogOffset) {
      mainLogOffset = 0;
    }

    if (size === mainLogOffset) {
      return;
    }

    const fd = fs.openSync(mainLogFile, "r");

    try {
      const buffer = Buffer.alloc(size - mainLogOffset);

      fs.readSync(fd, buffer, 0, buffer.length, mainLogOffset);
      mainLogOffset = size;

      for (const line of buffer.toString("utf8").split("\n")) {
        const text = line.replaceAll(ansiEscapePattern, "");

        const devFileRouteFailure = devFileRouteFailurePattern.exec(text);

        if (devFileRouteFailure?.[1]) {
          devFileRouteFailures.push(urlPath(devFileRouteFailure[1]));
        }

        if (/^(?:[\w@/.-]+:[\w:-]+: )?\s*error:/.test(text) && !abortedProxyRequestPattern.test(text.trim())) {
          errorLogs.push(`[main] ${text.trim()}`);
        }
      }
    } finally {
      fs.closeSync(fd);
    }
  };

  window.on("console", onConsole);
  window.on("pageerror", onPageError);

  return {
    errors: () => {
      readMainLog();

      const failedPaths = new Set(devFileRouteFailures);
      const unexplainedBadGateways = badGatewayErrors
        .filter(({ path }) => !failedPaths.has(path))
        .map(({ text }) => text);

      return [...errorLogs, ...unexplainedBadGateways, ...(failedPaths.size ? [] : workerLoadErrors)];
    },
    devFileRouteFailures: () => {
      readMainLog();

      return [...devFileRouteFailures];
    },
    settle: async () => {
      await Promise.all(pendingDescriptions);
    },
    stop: () => {
      window.off("console", onConsole);
      window.off("pageerror", onPageError);
    },
  };
}

/**
 * Connects to Freelens dev and collects the errors either process logs until
 * the session stops collecting or is closed. Closing a browser connected over
 * CDP closes only the connection; the app keeps running.
 */
export async function connectApp(): Promise<AppSession> {
  const browser = await chromium.connectOverCDP(cdpUrl);

  try {
    const window = await rootPage(browser);
    const collector = collectErrors(window);
    let collected: Promise<string[]> | undefined;

    const stopCollecting = () => {
      collected ??= (async () => {
        await collector.settle();

        const errors = collector.errors();

        collector.stop();

        return errors;
      })();

      return collected;
    };

    return {
      browser,
      window,
      errors: collector.errors,
      devFileRouteFailures: collector.devFileRouteFailures,
      stopCollecting,
      close: async () => {
        const errors = await stopCollecting();

        await browser.close();

        return errors;
      },
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * The page of the root frame: `https://renderer.freelens.app`, on the port of
 * the app's proxy. A cluster renders in an iframe of it, on
 * `<clusterId>.renderer.freelens.app`.
 */
async function rootPage(browser: Browser): Promise<Page> {
  const deadline = Date.now() + viewTimeout.timeout;

  while (Date.now() < deadline) {
    const page = browser
      .contexts()
      .flatMap((context) => context.pages())
      .find((page) => URL.canParse(page.url()) && new URL(page.url()).hostname === "renderer.freelens.app");

    if (page) {
      await page.waitForFunction(() => globalThis.FreelensExtensionApi?.Renderer !== undefined, null, viewTimeout);

      return page;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No Freelens window on ${cdpUrl}`);
}

/**
 * Navigates the root frame with `Renderer.Navigation.navigate` of the
 * extension API: the application menu, which the packaged-app tests click,
 * belongs to the main process, which CDP does not reach.
 */
async function navigate(window: Page, url: string) {
  console.log(`navigate to ${url}`);
  await window.evaluate((url) => {
    const renderer = globalThis.FreelensExtensionApi.Renderer;

    if (!renderer) {
      throw new Error("The page has no Renderer API");
    }

    renderer.Navigation.navigate(url);
  }, url);
}

/**
 * Dismisses the notifications, so that one still in its enter animation does
 * not intercept pointer events on the elements behind it.
 */
async function dismissNotifications(window: Page) {
  const notificationCloseSelector =
    'i[data-testid*="close-notification-for-notification_"], div[class*="close-button-module__closeButton--"][aria-label="Close"]';

  for (let attempt = 0; attempt < 10; attempt++) {
    const closeButtons = await window.$$(notificationCloseSelector);

    if (closeButtons.length === 0) break;

    for (const closeButton of closeButtons) {
      await closeButton.click({ force: true }).catch(() => {});
    }

    await window.waitForTimeout(200);
  }
}

/**
 * Uninstalls the extension from the Extensions page, from wherever it was
 * installed. An extension installed in place is forgotten, its directory
 * stays.
 */
async function uninstallExtension(window: Page, row: Locator) {
  console.log(`uninstall ${extensionName}`);
  await row.locator('[id^="menu-actions-for-installed-extensions-for-"]').click();
  await window.locator(".MenuActions .MenuItem").getByText("Uninstall", { exact: true }).click();
  await window.getByTestId("confirmation-dialog").getByTestId("confirm").click();
  await row.waitFor({ state: "detached", ...viewTimeout });
}

/**
 * Installs this checkout in place from the Extensions page and waits until it
 * is enabled. An installation of the checkout that is already enabled is
 * kept, unless `reinstall` is set; any other installation of the extension is
 * uninstalled first.
 */
export async function installExtension({ window }: AppSession, { reinstall = false } = {}) {
  await navigate(window, "/extensions");

  const table = window.getByTestId("extensions-table");
  const row = table.locator("tbody tr", { hasText: extensionName });
  const enabled = row.locator("td").nth(2).getByText("Enabled", { exact: true });

  // Once the extensions are discovered, the page shows the table, or a notice
  // in its place when no extension is installed, as in a fresh profile.
  await table.or(window.getByText("There are no extensions installed.", { exact: true })).waitFor(viewTimeout);

  if (await row.count()) {
    // An extension loaded in place reads "development" in the version column,
    // with the directory in its title.
    const inPlace = await row.locator(`[title="Loaded from ${extensionDir}"]`).count();

    if (!reinstall && inPlace && (await enabled.count())) {
      console.log(`${extensionName} is installed from ${extensionDir}`);

      return;
    }

    await uninstallExtension(window, row);
  }

  console.log(`install ${extensionDir}`);
  await window.getByPlaceholder("Name, URL, or path to a package or directory").fill(extensionDir);
  await window.getByRole("button", { name: "Install", exact: true }).click();

  // A directory is loaded in place only after a confirmation.
  await window.getByTestId("confirmation-dialog").getByTestId("confirm").click(viewTimeout);

  // The status column reads "Incompatible" if the host refuses
  // `engines.freelens`.
  await enabled.waitFor(viewTimeout);
  await dismissNotifications(window);
}

/**
 * The catalog id of the kind cluster, looked up by its name.
 */
async function kindClusterId(window: Page): Promise<string> {
  const id = await window.waitForFunction(
    (name) =>
      globalThis.FreelensExtensionApi.Renderer?.Catalog.catalogEntities
        .getItemsForApiKind("entity.k8slens.dev/v1alpha1", "KubernetesCluster")
        .find((entity) => entity.getName() === name)
        ?.getId(),
    `kind-${kindClusterName}`,
    viewTimeout,
  );

  return id.jsonValue() as Promise<string>;
}

/**
 * The phase of the kind cluster in the catalog: `connected`, `connecting`,
 * `disconnected`.
 */
async function kindClusterPhase(window: Page, id: string): Promise<string | undefined> {
  return window.evaluate(
    (id) => globalThis.FreelensExtensionApi.Renderer?.Catalog.catalogEntities.getById(id)?.status.phase,
    id,
  );
}

/**
 * Disconnects the kind cluster if it is connected, and waits until it is
 * disconnected. The app reads which versions of a CRD are served when it
 * connects, so a session that changes the CRDs starts and ends with a
 * disconnected cluster. Only the kind cluster is touched; the app may have
 * others.
 */
export async function disconnectKindCluster({ window }: AppSession) {
  const id = await kindClusterId(window);

  if ((await kindClusterPhase(window, id)) === "disconnected") {
    return;
  }

  console.log(`disconnect kind-${kindClusterName}`);
  await navigate(window, "/catalog");
  await window.evaluate(async (id) => {
    const entity = globalThis.FreelensExtensionApi.Renderer?.Catalog.catalogEntities.getById(id);

    if (!entity || !("disconnect" in entity) || typeof entity.disconnect !== "function") {
      throw new Error(`The catalog has no cluster ${id}`);
    }

    await entity.disconnect();
  }, id);
  await window.waitForFunction(
    (id) =>
      globalThis.FreelensExtensionApi.Renderer?.Catalog.catalogEntities.getById(id)?.status.phase === "disconnected",
    id,
    viewTimeout,
  );
}

/**
 * Connects the kind cluster, selects the namespace of the test objects, and
 * returns the cluster's frame, where the extension's pages, details and menus
 * render.
 *
 * When the frame does not render and the dev file route of Freelens dev has
 * failed a request since the cluster was opened, a module of the frame did not
 * load (see `devFileRouteFailurePattern`), and the frame is loaded once more.
 * A frame that does not render for any other reason fails on the timeout.
 */
export async function openKindCluster(session: AppSession): Promise<Frame> {
  const { window } = session;
  const id = await kindClusterId(window);
  const failuresBefore = session.devFileRouteFailures().length;

  await navigate(window, `/cluster/${id}`);

  const element = await window.waitForSelector(`#cluster-frame-${id}`, viewTimeout);
  const frame = await element.contentFrame();

  if (!frame) {
    throw new Error(`No iframe for kind-${kindClusterName}`);
  }

  const sidebarSelector = "[data-testid=cluster-sidebar]";

  try {
    await frame.waitForSelector(sidebarSelector, viewTimeout);
  } catch (error) {
    const failures = session.devFileRouteFailures().slice(failuresBefore);

    if (failures.length === 0) {
      throw error;
    }

    console.log(`reload the frame of kind-${kindClusterName}: the dev file route failed ${failures.join(", ")}`);
    await frame.goto(frame.url(), viewTimeout);
    await frame.waitForSelector(sidebarSelector, viewTimeout);
  }

  return frame;
}

/**
 * Runs kubectl against the kind cluster, never the current context, and fails
 * with its stderr when it exits non-zero.
 */
function kubectl(...args: string[]): string {
  const argv = ["--context", `kind-${kindClusterName}`, ...args];
  const command = `kubectl ${argv.join(" ")}`;

  console.log(command);

  const { error, status, signal, stdout, stderr } = spawnSync("kubectl", argv, {
    encoding: "utf8",
    timeout: 5 * 60 * 1000,
  });

  if (error) {
    throw new Error(`${command} failed: ${error.message}`);
  }

  if (status !== 0) {
    throw new Error(`${command} exited with ${status ?? signal}: ${stderr.trim()}`);
  }

  if (stdout.trim()) {
    console.log(stdout.trim());
  }

  return stdout;
}

/** Writes a status through the status subresource, as Kamaji would: no controller runs next to the CRDs. */
function patchStatus(resource: string, namespace: string | undefined, name: string, status: object) {
  kubectl(
    ...(namespace ? ["--namespace", namespace] : []),
    "patch",
    resource,
    name,
    "--subresource=status",
    "--type=merge",
    "--patch",
    JSON.stringify({ status }),
  );
}

function tenantStatus(
  namespace: string,
  name: string,
  phase: string,
  version: string,
  ready: number,
  replicas: number,
  endpoint: string,
  dataStoreName: string,
  driver: string,
) {
  patchStatus("tenantcontrolplane", namespace, name, {
    kubernetesResources: {
      version: { status: phase, version },
      deployment: {
        name,
        namespace,
        selector: `kamaji.clastix.io/name=${name}`,
        replicas,
        readyReplicas: ready,
        availableReplicas: ready,
      },
    },
    controlPlaneEndpoint: endpoint,
    kubeconfig: { admin: { secretName: `${name}-admin-kubeconfig` } },
    storage: { dataStoreName, driver },
  });
}

/**
 * Removes what an earlier run left, then applies the CRDs of Kamaji and, once
 * they are established, the test objects, and writes their status.
 */
export function setUpCluster() {
  kubectl("delete", "namespace", ...fixtureNamespaces, "--ignore-not-found", "--wait");
  kubectl("delete", "crd", ...kamajiCrdNames, "--ignore-not-found", "--wait");

  // The CRD of the Tenant Control Planes is larger than the annotation that a client-side apply writes.
  for (const plural of kamajiCrdPlurals) {
    kubectl("apply", "--server-side", "--filename", kamajiCrdUrl(plural));
  }

  kubectl("wait", "--for=condition=Established", ...kamajiCrdNames.map((name) => `crd/${name}`), "--timeout=120s");
  kubectl("apply", "--kustomize", fixturesDir);

  tenantStatus("kamaji-tenants", "shop", "Ready", "v1.36.3", 2, 2, "172.18.255.200:6443", "etcd-test", "etcd");
  tenantStatus("kamaji-tenants", "billing", "Provisioning", "v1.37.0", 0, 1, "", "postgres-test", "PostgreSQL");
  tenantStatus("kamaji-dev", "legacy", "NotReady", "v1.34.6", 0, 1, "172.18.0.2:31443", "mysql-test", "MySQL");

  patchStatus("datastore", undefined, "etcd-test", { ready: true, usedBy: ["kamaji-tenants/shop"] });
  patchStatus("datastore", undefined, "postgres-test", { ready: true, usedBy: ["kamaji-tenants/billing"] });
  patchStatus("datastore", undefined, "mysql-test", { ready: true, usedBy: ["kamaji-dev/legacy"] });
  patchStatus("datastore", undefined, "nats-test", { ready: false, usedBy: [] });
}

/**
 * Deletes the test objects, with what a session created in their namespaces,
 * and the CRDs of Kamaji.
 */
export function tearDownCluster() {
  try {
    kubectl("delete", "namespace", ...fixtureNamespaces, "--ignore-not-found", "--wait");
  } finally {
    kubectl("delete", "crd", ...kamajiCrdNames, "--ignore-not-found", "--wait");
  }
}

/**
 * Selects the namespaces of the test tenants through the host's namespace
 * store, in the cluster frame, unless they are selected already. The app keeps
 * the selection for every namespaced list of the cluster.
 */
export async function selectTenantNamespaces(frame: Frame) {
  const wanted = [...tenantNamespaces].sort();
  const selected = () =>
    frame.evaluate(() =>
      [...(globalThis.FreelensExtensionApi.Renderer?.K8sApi.namespaceStore.contextNamespaces ?? [])].sort(),
    );

  if ((await selected()).join() === wanted.join()) {
    return;
  }

  console.log(`select namespaces ${wanted.join(", ")}`);
  await frame.evaluate(
    (names) => globalThis.FreelensExtensionApi.Renderer?.K8sApi.namespaceStore.selectNamespaces(names),
    wanted,
  );

  const deadline = Date.now() + viewTimeout.timeout;

  while ((await selected()).join() !== wanted.join()) {
    if (Date.now() > deadline) {
      throw new Error(`The namespaces ${wanted.join(", ")} were not selected`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/**
 * Clicks a sidebar item of the cluster frame. The entries navigate in their
 * `onClick`, and a dispatched click reaches it even while the cluster overview
 * re-lays out over the click point (`clickSidebarItem` in Freelens's
 * integration helpers).
 */
async function clickSidebarItem(frame: Frame, testId: string) {
  await frame.dispatchEvent(`[data-testid="${testId}"]`, "click");
}

/**
 * Closes the details drawer if it is open: a click on a row toggles it.
 */
async function closeDetails(frame: Frame) {
  const details = frame.locator(".KubeObjectDetails");

  if (await details.isVisible()) {
    await frame.locator("body").press("Escape");
    await details.waitFor({ state: "hidden", ...viewTimeout });
  }
}

/**
 * Opens a page of the extension from its entry under "Kamaji" in the sidebar.
 * A click on the "Kamaji" entry shows the entries under it when they are not
 * on the page.
 */
export async function openPage(frame: Frame, page: keyof typeof pageMenuIds) {
  const pageLink = frame.locator(`[data-testid="${sidebarLinkTestId(pageMenuIds[page])}"]`);

  await frame.waitForSelector(`[data-testid="${sidebarLinkTestId("kamaji-icon")}"]`, viewTimeout);

  if ((await pageLink.count()) === 0) {
    await clickSidebarItem(frame, sidebarLinkTestId("kamaji-icon"));
  }

  await pageLink.waitFor(viewTimeout);
  await clickSidebarItem(frame, sidebarLinkTestId(pageMenuIds[page]));
  await closeDetails(frame);
}

/**
 * The table row of the object with the name, once the list shows it.
 */
export async function findRow(frame: Frame, name: string): Promise<Locator> {
  const row = frame.locator(".TableRow").filter({ has: frame.locator(".TableCell").getByText(name, { exact: true }) });

  await row.waitFor(viewTimeout);

  return row;
}

/**
 * The texts of the cells of a row.
 */
export async function rowCells(row: Locator): Promise<string[]> {
  return (await row.locator(".TableCell").allTextContents()).map((text) => text.trim());
}

/**
 * Opens the details of the row's object and returns the drawer, after checking
 * that the extension's error boundary rendered no error page in it.
 */
export async function openDetails(frame: Frame, row: Locator, name: string): Promise<Locator> {
  await row.getByText(name, { exact: true }).click();

  const details = frame.locator(".KubeObjectDetails");

  await details.locator(".DrawerItem .name").getByText("API Version", { exact: true }).waitFor(viewTimeout);

  // The class of `ErrorPage`, as CSS modules name it in the bundle.
  const errorPages = await details.locator('[class*="_errorPage_"]').count();

  if (errorPages > 0) {
    throw new Error(`The details drawer shows ${errorPages} error page(s) of the extension`);
  }

  return details;
}

/**
 * The value of the item with the name in the extension's details panel. The
 * drawer of a custom resource also has the host's own details of it,
 * `CustomResourceDetails`, with an item per printer column of the CRD, such as
 * `Status`, which this leaves out. The locator of a `has` filter is relative to
 * the element it filters, so it comes from the frame, not from the drawer.
 */
export async function detailsValue(frame: Frame, details: Locator, name: string): Promise<string | null> {
  return (
    details
      .locator(".DrawerItem:not(.CustomResourceDetails .DrawerItem)")
      .filter({ has: frame.locator(".name").getByText(name, { exact: true }) })
      // The value of the item itself: a badge in it has a `.value` of its own.
      .locator(":scope > .value")
      .textContent(viewTimeout)
  );
}

/** How many items with the name the extension's details panel shows, without waiting for one. */
export async function detailsItemCount(frame: Frame, details: Locator, name: string): Promise<number> {
  return details
    .locator(".DrawerItem:not(.CustomResourceDetails .DrawerItem)")
    .filter({ has: frame.locator(".name").getByText(name, { exact: true }) })
    .count();
}

/**
 * The value of the item with the name in the host's own details of the custom resource, `CustomResourceDetails`, which
 * has an item per printer column of the CRD, named as `startCase` names the column, when the host has the CRD.
 */
export async function hostDetailsValue(frame: Frame, details: Locator, name: string): Promise<string | null> {
  return details
    .locator(".CustomResourceDetails .DrawerItem")
    .filter({ has: frame.locator(".name").getByText(name, { exact: true }) })
    .locator(":scope > .value")
    .textContent(viewTimeout);
}

/**
 * Opens the context menu of the row and returns the menu, which the host
 * renders outside the row.
 */
export async function openRowMenu(frame: Frame, row: Locator): Promise<Locator> {
  const trigger = row.locator('.TableCell.menu [data-testid^="icon-for-menu-actions-for-kube-object-menu-for-"]');
  const triggerTestId = await trigger.getAttribute("data-testid", viewTimeout);

  if (!triggerTestId) {
    throw new Error("The row has no menu");
  }

  await trigger.click();

  const menu = frame.getByTestId(triggerTestId.replace(/^icon-for-/, ""));

  await menu.waitFor(viewTimeout);

  return menu;
}

/**
 * The item of the menu with the title, once the menu shows it.
 */
export async function findMenuItem(frame: Frame, menu: Locator, title: string): Promise<Locator> {
  const item = menu.locator(".MenuItem").filter({ has: frame.locator(".title").getByText(title, { exact: true }) });

  await item.waitFor(viewTimeout);

  return item;
}

/**
 * Keeps the files that the cluster frame saves through an object URL and an
 * `<a download>`, rather than saving them: the session reads them with
 * `savedFiles`. Electron would otherwise show the save dialog of the system,
 * which the session cannot reach.
 */
export async function keepSavedFiles(frame: Frame) {
  await frame.evaluate(() => {
    const scope = globalThis as unknown as { kamajiSavedFiles?: { name: string; blob?: Blob }[] };
    const blobs = new Map<string, Blob>();
    const createObjectURL = URL.createObjectURL.bind(URL);

    scope.kamajiSavedFiles = [];
    URL.createObjectURL = (object: Blob | MediaSource) => {
      const url = createObjectURL(object);

      if (object instanceof Blob) {
        blobs.set(url, object);
      }

      return url;
    };
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      scope.kamajiSavedFiles?.push({ name: this.download, blob: blobs.get(this.href) });
    };
  });
}

/**
 * The files that the cluster frame saved since `keepSavedFiles`, with their
 * text.
 */
export async function savedFiles(frame: Frame): Promise<{ name: string; text: string }[]> {
  return frame.evaluate(async () => {
    const scope = globalThis as unknown as { kamajiSavedFiles?: { name: string; blob?: Blob }[] };

    return Promise.all(
      (scope.kamajiSavedFiles ?? []).map(async ({ name, blob }) => ({ name, text: (await blob?.text()) ?? "" })),
    );
  });
}

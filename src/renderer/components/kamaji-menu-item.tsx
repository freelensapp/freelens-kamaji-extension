import { Common, Renderer } from "@freelensapp/extensions";
import { exec } from "child_process";
import { writeFileSync } from "fs";
import { randomUUID } from "node:crypto";
import { homedir } from "os";
import { join } from "path";
import { Tenant } from "../objects/tenant";

const {
  Component: { MenuActions, MenuItem, Icon },
} = Renderer;

const { App } = Common;

interface KamajiMenuItemProperties {
  item: Tenant;
}

// @ts-ignore
const KamajiMenuItem = ({ item }: KamajiMenuItemProperties) => {
  const downloadKubeConfig = () => {
    const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
    const name = item.getName();
    const namespace = item.getNamespace();

    exec(
      `${kubectlPath} get secret ${name}-admin-kubeconfig -n ${namespace} -o jsonpath='{.data.admin\\.conf}'`,
      (err, stdout) => {
        if (err) {
          console.error("Failed to get kubeconfig secret:", err);
          return;
        }
        const decoded = Buffer.from(stdout.replace(/^'|'$/g, ""), "base64").toString("utf-8");
        const filePath = join(homedir(), ".kube", `kamaji-${name}.yaml`);
        try {
          writeFileSync(filePath, decoded);
          console.info(`Kubeconfig saved to ${filePath}`);
        } catch (writeErr) {
          console.error("Failed to write kubeconfig:", writeErr);
        }
      },
    );
  };

  return (
    <MenuActions id={`menu-actions-test-${randomUUID()}`}>
      <MenuItem onClick={downloadKubeConfig}>
        <Icon material="download" tooltip="Download kubeconfig" />
        <span>Download kubeconfig</span>
      </MenuItem>
    </MenuActions>
  );
};

export default KamajiMenuItem;

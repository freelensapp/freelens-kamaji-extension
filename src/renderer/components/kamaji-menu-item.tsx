import { exec } from "child_process";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Common, Renderer } from "@freelensapp/extensions";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";

const {
  Component: { Icon, MenuItem },
} = Renderer;

const { App } = Common;

export interface KamajiMenuItemProps {
  object?: TenantControlPlane;
  toolbar?: boolean;
}

export const KamajiMenuItem = ({ object, toolbar }: KamajiMenuItemProps) => {
  if (!object) {
    return <></>;
  }

  const downloadKubeConfig = () => {
    const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
    const name = object.getName();
    const namespace = object.getNs();

    if (!namespace) {
      return;
    }

    exec(
      `${kubectlPath} get secret ${name}-admin-kubeconfig -n ${namespace} -o jsonpath='{.data.admin\\.conf}'`,
      (error, stdout) => {
        if (error) {
          console.error("Failed to get kubeconfig secret:", error);
          return;
        }

        const decoded = Buffer.from(stdout.replace(/^'|'$/g, ""), "base64").toString("utf-8");
        const filePath = join(homedir(), ".kube", `kamaji-${name}.yaml`);

        try {
          writeFileSync(filePath, decoded);
          console.info(`Kubeconfig saved to ${filePath}`);
        } catch (writeError) {
          console.error("Failed to write kubeconfig:", writeError);
        }
      },
    );
  };

  return (
    <MenuItem onClick={downloadKubeConfig}>
      <Icon material="download" interactive={toolbar} title="Download kubeconfig" />
      <span className="title">Download kubeconfig</span>
    </MenuItem>
  );
};

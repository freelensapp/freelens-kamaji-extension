import { type Common, Renderer } from "@freelensapp/extensions";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";

const {
  Component: { Icon, MenuItem },
} = Renderer;

/** The key of the kubeconfig of the admin user of the tenant cluster, in the Secret that Kamaji writes. */
export const adminKubeconfigKey = "admin.conf";

/** The text of a base64 value of a Secret, read as UTF-8. */
export function decodeSecretValue(value: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));
}

function saveTextFile(fileName: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Saves the admin kubeconfig of a tenant cluster as `kamaji-<tenant>-kubeconfig.yaml`. */
export async function downloadAdminKubeconfig(object: TenantControlPlane) {
  const name = TenantControlPlane.getAdminKubeconfigSecretName(object);
  const namespace = object.getNs();

  if (!namespace) {
    throw new Error(`The tenant ${object.getName()} has no namespace`);
  }

  const secret = await Renderer.K8sApi.secretsApi.get({ name, namespace });
  const value = secret?.data[adminKubeconfigKey];

  if (!value) {
    throw new Error(`The Secret ${namespace}/${name} has no ${adminKubeconfigKey}`);
  }

  saveTextFile(`kamaji-${object.getName()}-kubeconfig.yaml`, decodeSecretValue(value), "text/yaml");
}

export const KamajiMenuItem = ({ object, toolbar }: Common.Types.KubeObjectMenuItemProps<TenantControlPlane>) => (
  <MenuItem
    onClick={() =>
      downloadAdminKubeconfig(object).catch((error: unknown) => {
        console.error("Failed to download kubeconfig:", error);
        Renderer.Component.Notifications.error(`Failed to download the kubeconfig of ${object.getName()}: ${error}`);
      })
    }
  >
    <Icon material="download" interactive={toolbar} title="Download kubeconfig" />
    <span className="title">Download kubeconfig</span>
  </MenuItem>
);

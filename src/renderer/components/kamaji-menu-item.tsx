import { Renderer } from "@freelensapp/extensions";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";

const {
  Component: { Icon, MenuItem },
} = Renderer;

export interface KamajiMenuItemProps {
  object?: TenantControlPlane;
  toolbar?: boolean;
}

export const KamajiMenuItem = ({ object, toolbar }: KamajiMenuItemProps) => {
  if (!object) {
    return <></>;
  }

  const downloadTextFile = (filename: string, contents: string, type: string) => {
    const data = new Blob([contents], { type });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadKubeConfig = async () => {
    const name = object.getName();
    const namespace = object.getNs();

    if (!namespace) {
      return;
    }

    try {
      const secretApi = Renderer.K8sApi.apiManager.getApiByKind("Secret", "v1") as Renderer.K8sApi.KubeApi<any> | undefined;

      if (!secretApi) {
        throw new Error("Secret API is not available");
      }

      const secret = await secretApi.get({
        namespace,
        name: `${name}-admin-kubeconfig`,
      }) as { data?: Record<string, string> } | null;

      const encoded = secret?.data?.["admin.conf"];

      if (!encoded) {
        throw new Error("Secret data key admin.conf not found");
      }

      const decoded = atob(encoded);

      downloadTextFile(`kamaji-${name}-kubeconfig.yaml`, decoded, "text/yaml");
      console.info(`Kubeconfig downloaded for ${namespace}/${name}`);
    } catch (error) {
      console.error("Failed to download kubeconfig:", error);
    }
  };

  return (
    <MenuItem onClick={() => void downloadKubeConfig()}>
      <Icon material="download" interactive={toolbar} title="Download kubeconfig" />
      <span className="title">Download kubeconfig</span>
    </MenuItem>
  );
};

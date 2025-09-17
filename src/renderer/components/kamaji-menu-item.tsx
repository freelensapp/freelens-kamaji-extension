import { Renderer } from "@freelensapp/extensions";
import { randomUUID } from "node:crypto";
import { Tenant } from "../objects/tenant";
import useKamajiApi from "../../api/kamaji-api";

const {
  Component: {MenuActions, MenuItem, Icon},
} = Renderer;

interface KamajiMenuItemProperties {
  item: Tenant;
}

// @ts-ignore
const KamajiMenuItem = ({item}: KamajiMenuItemProperties) => {
  const kamajiApi = useKamajiApi();

  return (
    <MenuActions
      id={`menu-actions-test-${randomUUID()}`}
    >
      <MenuItem onClick={() => kamajiApi.downloadKubeConfig(item.getName(), item.getNamespace())}>
        <Icon material="download" tooltip="Download kubeconfig"/>
        <span>Download kubeconfig</span>
      </MenuItem>
    </MenuActions>
  )
}

export default KamajiMenuItem;

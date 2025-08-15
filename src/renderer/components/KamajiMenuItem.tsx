import {Renderer} from "@freelensapp/extensions";
import {randomUUID} from "node:crypto";
import {Tenant} from "../objects/Tenant";

const {
  Component: {MenuActions, MenuItem, Icon},
} = Renderer;

interface KamajiMenuItemProperties {
  item: Tenant;
}

// @ts-ignore
const KamajiMenuItem = ({item}: KamajiMenuItemProperties) => {
  return (
    <MenuActions
      id={`menu-actions-test-${randomUUID()}`}
    >
      <MenuItem>
        <Icon material="download" tooltip="Download kubeconfig" />
        <span>Download kubeconfig</span>
      </MenuItem>
    </MenuActions>
  )
}

export default KamajiMenuItem;

import LoginPage from "../login/login-page";
import { usePreferencesStore } from "../../../store/use-preference-store";
import { ClusterPage } from "../cluster/cluster-page";
import { PreferencesStore } from "../../../store/preferences-store";
import {useEffect, useState} from "react";
import {observer} from "mobx-react";

const MainPage = observer((): any => {
  const preferencesStore: PreferencesStore = usePreferencesStore();
  const [isLoggedIn, setLoggedIn] = useState(preferencesStore.refreshToken);

  useEffect(() => {
    setLoggedIn(preferencesStore.refreshToken);
  }, [preferencesStore.refreshToken]);

  return isLoggedIn ? <ClusterPage/> : <LoginPage/>

})

export default MainPage;

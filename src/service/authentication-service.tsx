import useKamajiApi from "../api/kamaji-api";
import { PreferencesStore } from "../store/preferences-store";
import { usePreferencesStore } from "../store/use-preference-store";

const useAuthenticationService = () => {
  const kamajiApi = useKamajiApi();
  const preferencesStore: PreferencesStore = usePreferencesStore();

  const login = (email: string, password: string) => {
    if (email && password) {
      kamajiApi.login(email, password)
        .then(({ accessToken, refreshToken }) => {
          preferencesStore.accessToken = accessToken;
          preferencesStore.refreshToken = refreshToken;
        });
    }
  }

  const logout = () => {
    preferencesStore.accessToken = "";
    preferencesStore.refreshToken = "";
  }

  return { login, logout }
}

export default useAuthenticationService;

import axios from "axios";
import { usePreferencesStore } from "../store/use-preference-store";
import { PreferencesStore } from "../store/preferences-store";

const useKamajiApi = () => {
  const preferencesStore: PreferencesStore = usePreferencesStore();

  const login = (username: string, password: string) => {
    return axios.post(`${preferencesStore.kamajiBaseUrl}/auth.login`, {
      json: {
        email: username,
        password: password
      }
    }).then(response => {
      const { accessToken, refreshToken } = response.data.result.data.json;
      return { accessToken, refreshToken };
    });
  }

  const refreshToken = (refreshToken: string) => {
    return axios.post(`${preferencesStore.kamajiBaseUrl}/auth.refreshToken`, {
      json: {
        refreshToken: refreshToken
      }
    }).then(result => console.log(result))
  }

  const downloadKubeConfig = (name: string, namespace: string) => {
    return axios.get(
      `${preferencesStore.kamajiBaseUrl}/k8s.getClastixTPCKubeConfig`,
      {
        params: {
          input: JSON.stringify({
            json: {
              name: name,
              namespace: namespace,
            },
          }),
        },
        headers: {
          Authorization: "Bearer ",
          "Content-Type": "application/json",
        },
      }
    );
  }

  return {login, refreshToken, downloadKubeConfig}
}

export default useKamajiApi;

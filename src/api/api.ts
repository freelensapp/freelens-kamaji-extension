import axios from "axios";

const useKamajiApi = () => {
  // TODO: Read from settings
  const kamajiBaseUrl = "http://localhost:53919/ui";

  const login = (username: string, password: string) => {
    axios.post(`${kamajiBaseUrl}/api/trpc/auth.login`, {
      json: {
        email: username,
        password: password
      }
    }).then(result => console.log(result))
  }

  const refreshToken = (refreshToken: string) => {
    return axios.post(`${kamajiBaseUrl}/api/trpc/auth.refreshToken`, {
      json: {
        refreshToken: refreshToken
      }
    }).then(result => console.log(result))
  }

  const downloadKubeConfig = (name: string, namespace: string) => {
    return axios.get(
      `${kamajiBaseUrl}/api/trpc/k8s.getClastixTPCKubeConfig`,
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

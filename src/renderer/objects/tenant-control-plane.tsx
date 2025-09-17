interface TenantControlPlaneResponse {
  metadata: {
    name: string;
    namespace: string;
  };
  status: {
    kubernetesResources: {
      version: {
        status: string,
        version: string
      },
      deployment: {
        replicas: string,
        readyReplicas: string,
        lastUpdate: string
      }
    },
    addons: {
      konnectivity: {
        service: {
          loadBalancer: {
            ingress: [
              {
                ip: string
              }
            ]
          }
        }
      }
    },
    storage: {
      dataStoreName: string,
      driver: string
    }
  }
}

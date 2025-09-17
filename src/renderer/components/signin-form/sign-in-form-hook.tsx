import { useState } from "react";
import useAuthenticationService from "../../../service/authentication-service";

const useSignInFormHook = () => {
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();

  const authenticationService = useAuthenticationService();

  const login = () => {
    if (email && password) {
      authenticationService.login(email, password);
    }
  }

  return {login, email, password, setEmail, setPassword}
}

export default useSignInFormHook;

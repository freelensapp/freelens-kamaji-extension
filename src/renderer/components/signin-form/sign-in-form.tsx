import { Renderer } from "@freelensapp/extensions";
import styles from "./sign-in-form.module.css";
import styleInline from "./sign-in-form.module.css?inline";
import useSignInFormHook from "./sign-in-form-hook";

const {
  Component: {Input, Button},
} = Renderer;

const SignInForm = () => {
  const signInFormHook = useSignInFormHook();

  return (
    <div>
      <style>{styleInline}</style>

      <div className={styles.container}>
        <div>
          <div style={{marginTop: 8, fontWeight: "bold"}}>Email</div>
          <Input placeholder="Email"
                 value={signInFormHook.email}
                 onChange={(value: string) => signInFormHook.setEmail(value)}/>
        </div>

        <div>
          <div style={{marginTop: 8, fontWeight: "bold"}}>Password</div>
          <Input placeholder="Password"
                 value={signInFormHook.password}
                 onChange={(value: string) => signInFormHook.setPassword(value)}/>
        </div>

        <div style={{marginTop: 8}}></div>
        <Button label="Sign In" onClick={signInFormHook.login}/>

      </div>
    </div>

  )
}

export default SignInForm;

import { ClastixLogo } from "../../components/clastix-logo";
import SignInForm from "../../components/signin-form/sign-in-form";
import styles from "./login-page.module.css";
import styleInline from "./login-page.module.css?inline";

const LoginPage = () => {

  return (
    <div>
      <style>{styleInline}</style>

      <div className={`${styles.container} ${styles.centered}`}>
        <div>

          <div className={styles.centered}>
            <ClastixLogo className="img-fluid" style={{width: "8rem"}}/>
          </div>

          <div className={styles.centered}>
            <SignInForm/>
          </div>

        </div>
      </div>
    </div>
  )
}

export default LoginPage;

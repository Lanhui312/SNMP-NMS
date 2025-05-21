
import React, { useState, useEffect, useContext } from "react";
import useFetch from "./useFetch";
import { useNavigate } from "react-router-dom";
import { AuthContext } from '../AuthContext';  // Import context if using to manage login state globally

const LoginPage = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();
  const { isLoading, response, fetchData } = useFetch();
  const { setIsLoggedIn } = useContext(AuthContext); // Use context to set login status globally

  useEffect(() => {
    if (response && response.status === 200 && response.data && response.data.token) {
      console.log("Login successful, setting login context and redirecting...");
      setIsLoggedIn(true);
      localStorage.setItem("token", response.data.token); // Store token in localStorage
      navigate("/device"); // Redirect to device page after successful login
    } else if (response && response.status !== 200) {
      console.error("Login failed, invalid credentials.");
      setLoginError("Invalid username or password.");
    }
  }, [response, navigate, setIsLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: userName, password: password }),
    };
    await fetchData("http://localhost:5000/api/auth/login", options);
  };

  return (
    <div className="loginpage">
      <form onSubmit={handleLogin} className="loginform">
        <h2>Login</h2>
        {loginError && <div className="error">{loginError}</div>}
        {response && response.status !== 200 && <div className="error">{response.data.message || 'Login failed'}</div>}
        <div className="inputgroup">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your username"
          />
        </div>
        <div className="inputgroup">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Loading..." : "Login"}
        </button>
        <label className="register" onClick={() => navigate("/register")}>
          Not registered? Click here
        </label>
      </form>
    </div>
  );
};

export default LoginPage;


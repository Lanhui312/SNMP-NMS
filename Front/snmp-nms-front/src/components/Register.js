import React, { useEffect, useState } from "react";
import useFetch from "./useFetch";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user");
  const [validationCode, setValidationCode] = useState("");
  const [registerError, setRegisterError] = useState("");
  const navigate = useNavigate();
  const { isLoading, error, response, fetchData } = useFetch();

  useEffect(() => {
    if (role !== "admin") {
      setValidationCode("");
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }

    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: userName,
        password: password,
        role: role,
        validationCode: validationCode,
      }),
    };

    await fetchData("http://localhost:5000/api/auth/register", options);

    if (response && response.status === 201) {
      alert("Registration successful!");
      navigate("/login");
    } else if (response && response.status !== 201) {
      setRegisterError(
        response.data.message || "Failed to register. Please try again."
      );
    } else {
      setRegisterError(error || "Unexpected error occurred.");
    }
  };

  return (
    <div className="registerpage">
      <form onSubmit={handleSubmit} className="registerform">
        <h2>Register</h2>
        {registerError && <div className="error">{registerError}</div>}
        <div className="inputGroup">
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
        <div className="inputgroup">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
          />
        </div>
        <div className="inputGroup">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === "admin" && (
          <div className="inputGroup">
            <label htmlFor="validationCode">Validation Code</label>
            <input
              type="text"
              id="validationCode"
              value={validationCode}
              onChange={(e) => setValidationCode(e.target.value)}
              placeholder="Enter admin validation code"
            />
          </div>
        )}
        <button type="submit" disabled={isLoading}>
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;
